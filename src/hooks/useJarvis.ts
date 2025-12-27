import { useState, useRef, useCallback, useEffect } from 'react';
import PCMPlayer from 'pcm-player';
import { getSessionHistory } from '../services/sessions';

// --- Types ---
export type JarvisStatus =
  | 'disconnected'
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking';

export interface Message {
  id: string;
  source: 'user' | 'assistant';
  text: string;
  tasks?: Task[];  // Attach tasks to messages for persistence
}

export interface Task {
  id: string;
  description: string;
  status: 'queued' | 'running' | 'complete' | 'failed';
}

export function useJarvis(apiEndpoint: string, isPersistent = false, sessionId?: string) {
    const [status, setStatus] = useState<JarvisStatus>('disconnected');
    const [messages, setMessages] = useState<Message[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

    // Refs for state
    const statusRef = useRef<JarvisStatus>('disconnected');
    const isPersistentRef = useRef(isPersistent);

    const socketRef = useRef<WebSocket | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerRef = useRef<any>(null); 
    const recorderRef = useRef<MediaRecorder | null>(null);
    const vadRafRef = useRef<number | null>(null);
    const interruptVadRafRef = useRef<number | null>(null);
    
    const streamingIdRef = useRef<string | null>(null); 
    
    const sessionIdRef = useRef<string | null>(sessionId || null);
    // Lazy init in effect/callback to avoid purity issues

    const micStreamRef = useRef<MediaStream | null>(null);
    const isMicInitialized = useRef(false);
    const speechDetectedRef = useRef(false);
    const currentSampleRate = useRef<number>(24000);
    const startRecordingRef = useRef<() => void>(() => {});

    // Sync refs
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { isPersistentRef.current = isPersistent; }, [isPersistent]);

    // Update sessionIdRef when prop changes
    useEffect(() => {
        if (sessionId && sessionId !== sessionIdRef.current) {
            sessionIdRef.current = sessionId;
            // Disconnect to force reconnect with new session ID
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        }
    }, [sessionId]);

    // Load history when sessionId changes
    useEffect(() => {
        if (sessionId) {
            setMessages([]); // Clear previous messages
            getSessionHistory(apiEndpoint, sessionId)
                .then((history) => {
                    const mappedMessages: Message[] = history.map((msg) => ({
                        id: msg.id.toString(),
                        source: msg.role === 'user' ? 'user' : 'assistant',
                        text: msg.content,
                        // tasks: [] // History doesn't have tasks yet
                    }));
                    setMessages(mappedMessages);
                })
                .catch((err) => {
                    console.error("Failed to load session history:", err);
                });
        } else {
             // New session or no ID
             setMessages([]);
        }
    }, [sessionId, apiEndpoint]);


    const clearMessages = () => setMessages([]);

    // --- Audio Init ---
    const initAudio = useCallback((sampleRate = 24000) => {
        if (playerRef.current && currentSampleRate.current === sampleRate) return;

        if (playerRef.current) {
            try { 
                if (typeof playerRef.current.destroy === 'function') {
                    playerRef.current.destroy();
                }
            } catch { 
                // ignore
            }
            playerRef.current = null;
        }

        currentSampleRate.current = sampleRate;
        console.log(`Initializing PCMPlayer with sample rate: ${sampleRate}`);
        
        const player = new PCMPlayer({
            inputCodec: 'Float32',
            channels: 1,
            sampleRate: sampleRate,
            flushTime: 200, 
            fftSize: 2048
        });

        playerRef.current = player;

        if (player.audioCtx) {
            const ctx = player.audioCtx as AudioContext;
            if (player.gainNode && player.gainNode.gain) {
                 try { player.gainNode.gain.value = 3.0; } catch { 
                     // ignore
                 }
            }

            if (player.gainNode) {
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 2048;
                player.gainNode.gain.value = 0.6;
                player.gainNode.connect(analyser);

                setAnalyserNode(analyser);
            }
            if (ctx.state === 'suspended') ctx.resume();
        }
    }, []);

    const initMic = useCallback(async () => {
        if (isMicInitialized.current) return;
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error("Media Devices API not available.");
            setStatus('disconnected');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
            micStreamRef.current = stream;
            isMicInitialized.current = true;
        } catch (err) {
            console.error("Mic Error:", err);
            setStatus('disconnected');
        }
    }, []);

    // --- Helper Functions ---
    const startRecording = useCallback(async () => {
        if (!isMicInitialized.current) {
            await initMic();
            if (!isMicInitialized.current) return;
        }
        
        if (playerRef.current?.audioCtx?.state === 'suspended') {
            await playerRef.current.audioCtx.resume();
        }

        const stream = micStreamRef.current;
        if (!stream) return;

        speechDetectedRef.current = false;
        stream.getAudioTracks().forEach(t => t.enabled = true);
        
        // Safari iOS compatibility
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
            if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
            } else if (MediaRecorder.isTypeSupported('audio/wav')) {
                mimeType = 'audio/wav';
            }
        }
        
        const recorder = new MediaRecorder(stream, { mimeType });
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            if (blob.size > 1000) { // Minimum size check only
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    setStatus('processing');
                    blob.arrayBuffer().then(buffer => socketRef.current?.send(buffer));
                }
            } else {
                console.log("Recording too short. Back to idle.");
                setStatus('idle');
            }
        };

        recorderRef.current = recorder;
        recorder.start();
        setStatus('listening');
    }, [initMic]);

    useEffect(() => {
        startRecordingRef.current = startRecording;
    }, [startRecording]);

    const stopRecording = () => { if(recorderRef.current?.state === 'recording') recorderRef.current.stop(); };
    const cancelRecording = () => {
        if (recorderRef.current?.state === 'recording') {
            recorderRef.current.onstop = () => { setStatus('idle'); };
            recorderRef.current.stop();
        }
    };

    const stopInterruptVAD = () => { if (interruptVadRafRef.current) { cancelAnimationFrame(interruptVadRafRef.current); interruptVadRafRef.current = null; } };

    const startInterruptVAD = useCallback(async () => {
        if (!micStreamRef.current) return;
        const stream = micStreamRef.current;
        stream.getAudioTracks().forEach(t => t.enabled = true);
        const vadCtx = new AudioContext();
        const source = vadCtx.createMediaStreamSource(stream);
        const analyser = vadCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const buffer = new Uint8Array(analyser.frequencyBinCount);
        let speechSeen = false;

        const loop = () => {
            analyser.getByteFrequencyData(buffer);
            const vol = buffer.reduce((a, b) => a + b, 0) / buffer.length;
            
            // For interruption, we want it to be fairly loud/distinct to avoid accidental cuts
            if (vol > 30) speechSeen = true;
            
            if (speechSeen && vol > 30) {
                console.log("Interrupt detected! DESTROYING AUDIO.");
                if (playerRef.current) {
                    try { 
                        if (typeof playerRef.current.destroy === 'function') playerRef.current.destroy(); 
                    } catch { 
                        // ignore
                    }
                    playerRef.current = null;
                }
                socketRef.current?.send(JSON.stringify({ type: 'interrupt' }));
                vadCtx.close();
                stopInterruptVAD();
                
                // Removed auto-start recording - manual only
                setStatus('idle'); 
                return;
            }
            interruptVadRafRef.current = requestAnimationFrame(loop);
        };
        loop();
    }, []);

    const disconnect = useCallback(() => {
        socketRef.current?.close();
        if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
        stopInterruptVAD();
        if (playerRef.current) { 
            try { 
                if (typeof playerRef.current.destroy === 'function') playerRef.current.destroy(); 
            } catch { 
                // ignore
            } 
            playerRef.current = null; 
        }
        setStatus('disconnected');
    }, []);

    // --- WebSocket ---
    const connect = useCallback(async () => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

        console.log("Initializing audio...");
        initAudio(24000);

        // Lazy init session ID
        if (!sessionIdRef.current) {
            sessionIdRef.current = `jarvis-session-${Date.now()}`;
        }

        const wsUrl = apiEndpoint.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/chat';
        console.log("Connecting to WebSocket:", wsUrl);
        
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log("WebSocket connected successfully!");
            // Detect supported audio format for Safari iOS compatibility
            let filename = 'mic.webm';
            if (!MediaRecorder.isTypeSupported('audio/webm')) {
                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    filename = 'mic.mp4';
                } else if (MediaRecorder.isTypeSupported('audio/wav')) {
                    filename = 'mic.wav';
                }
            }
            console.log("Using audio format:", filename);
            ws.send(JSON.stringify({ type: 'start', session_id: sessionIdRef.current, filename }));
            setStatus('idle');
        };

        ws.onclose = (event) => {
            console.log("WebSocket closed:", event.code, event.reason);
            setStatus('disconnected');
        };
        
        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            setStatus('disconnected');
        };

        ws.onmessage = (e) => {
            if (typeof e.data === 'string') {
                const msg = JSON.parse(e.data);
                switch(msg.type) {
                    case 'audio_format': {
                        if (msg.sample_rate && (msg.sample_rate !== currentSampleRate.current || !playerRef.current)) {
                            initAudio(msg.sample_rate);
                        }
                        break;
                    }
                    case 'transcript': {
                        setMessages(prev => [...prev, { id: `${sessionIdRef.current}-${Date.now()}`, source: 'user', text: msg.text }]);
                        break;
                    }
                    case 'assistant_start': {
                        setStatus('speaking');
                        const newStreamingId = `${sessionIdRef.current}-${Date.now()}`;
                        streamingIdRef.current = newStreamingId; 
                        setMessages(prev => [...prev, { id: newStreamingId, source: 'assistant', text: '' }]);
                        startInterruptVAD();
                        break;
                    }
                    case 'token': {
                        if (streamingIdRef.current) {
                            setMessages(prev => prev.map(m => m.id === streamingIdRef.current ? { ...m, text: m.text + msg.text } : m));
                        }
                        break;
                    }
                    case 'task_queue': {
                        // Attach tasks to current streaming message AND set in state for live updates
                        setTasks(msg.tasks || []);
                        if (streamingIdRef.current) {
                            setMessages(prev => prev.map(m => 
                                m.id === streamingIdRef.current 
                                    ? { ...m, tasks: msg.tasks || [] }
                                    : m
                            ));
                        }
                        break;
                    }
                    case 'task_update': {
                        // Update individual task status in both state and message
                        if (msg.task_id) {
                            setTasks(prev => prev.map(t => 
                                t.id === msg.task_id 
                                    ? { ...t, status: msg.status }
                                    : t
                            ));
                            if (streamingIdRef.current) {
                                setMessages(prev => prev.map(m => 
                                    m.id === streamingIdRef.current && m.tasks
                                        ? { 
                                            ...m, 
                                            tasks: m.tasks.map(t => 
                                                t.id === msg.task_id 
                                                    ? { ...t, status: msg.status }
                                                    : t
                                            )
                                          }
                                        : m
                                ));
                            }
                        }
                        break;
                    }
                    case 'done': {
                        stopInterruptVAD();
                         if (streamingIdRef.current) {
                            setMessages(prev => prev.map(m => m.id === streamingIdRef.current ? { ...m, text: msg.assistant_text } : m));
                            streamingIdRef.current = null;
                        }
                        setStatus('idle');
                        // Don't clear tasks - they're now part of the message
                        setTasks([]);
                        break;
                    }
                }
            } else if (e.data instanceof ArrayBuffer) {
                if (!playerRef.current) {
                    initAudio(currentSampleRate.current);
                }
                playerRef.current?.feed(e.data);
            }
        };
    }, [apiEndpoint, initAudio, initMic, isPersistent, startInterruptVAD, sessionId]); // Added sessionId dependency

    useEffect(() => { return () => disconnect(); }, [disconnect]);

    const sendTextMessage = (text: string) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const userMessage: Message = {
                id: `msg-${Date.now()}`,
                source: 'user',
                text,
            };
            setMessages(prev => [...prev, userMessage]);
            socketRef.current.send(JSON.stringify({ type: 'text_input', text }));
            setStatus('processing');
        } else {
            console.error("WebSocket is not open. Cannot send message.");
        }
    };

    return { status, messages, tasks, analyserNode, connect, disconnect, startRecording, stopRecording, clearMessages, cancelRecording, sendTextMessage };
}