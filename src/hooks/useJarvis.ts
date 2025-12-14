import { useState, useRef, useCallback, useEffect } from 'react';
// @ts-ignore - pcm-player doesn't always have types available
import PCMPlayer from 'pcm-player';

// --- Types ---
export type EveStatus =
  | 'disconnected'
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking';

export interface Message {
  id: string;
  source: 'user' | 'assistant';
  text: string;
}

export function useJarvis(apiEndpoint: string, isPersistent = false) {
    const [status, setStatus] = useState<JarvisStatus>('disconnected');
    const [messages, setMessages] = useState<Message[]>([]);
    const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

    // Refs for state
    const statusRef = useRef<JarvisStatus>('disconnected');
    const isPersistentRef = useRef(isPersistent);

    const socketRef = useRef<WebSocket | null>(null);
    const playerRef = useRef<any>(null); 
    const recorderRef = useRef<MediaRecorder | null>(null);
    const vadRafRef = useRef<number | null>(null);
    const interruptVadRafRef = useRef<number | null>(null);
    const wakeWordRecognitionRef = useRef<any>(null);
    
    const streamingIdRef = useRef<string | null>(null); 
    
    const sessionIdRef = useRef<string>(`jarvis-session-${Date.now()}`);
    const micStreamRef = useRef<MediaStream | null>(null);
    const isMicInitialized = useRef(false);
    const speechDetectedRef = useRef(false);
    const currentSampleRate = useRef<number>(24000);
    const startRecordingRef = useRef<() => void>(() => {});

    // Sync refs
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { isPersistentRef.current = isPersistent; }, [isPersistent]);

    const clearMessages = () => setMessages([]);

    // --- Audio Init ---
    const initAudio = useCallback((sampleRate = 24000) => {
        if (playerRef.current && currentSampleRate.current === sampleRate) return;

        if (playerRef.current) {
            try { 
                if (typeof playerRef.current.destroy === 'function') {
                    playerRef.current.destroy();
                }
            } catch (e) { console.warn(e); }
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
                 try { player.gainNode.gain.value = 3.0; } catch(e) {}
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
        stopWakeWordListener(); 

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
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            if (blob.size > 2000 && speechDetectedRef.current) {
                if (socketRef.current?.readyState === WebSocket.OPEN) {
                    setStatus('processing');
                    blob.arrayBuffer().then(buffer => socketRef.current?.send(buffer));
                }
            } else {
                console.log("Ignored recording (silence). Back to idle.");
                setStatus('idle');
            }
        };

        recorderRef.current = recorder;
        recorder.start();
        setStatus('listening');
        monitorVAD(stream, recorder);
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

    // --- Wake Word Logic ---
    const startWakeWordListener = useCallback(() => {
        const SpeechRecognition = window.webkitSpeechRecognition || (window as any).SpeechRecognition;
        if (!SpeechRecognition) return;
        if (wakeWordRecognitionRef.current) return;

        console.log("Listening for 'Jarvis'...");
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            const results = event.results;
            const transcript = results[results.length - 1][0].transcript.toLowerCase().trim();
            if (transcript.includes("jarvis") || transcript.includes("hey jarvis")) {
                console.log("✨ Wake word detected!");
                recognition.stop();
                wakeWordRecognitionRef.current = null;
                startRecordingRef.current(); 
            }
        };

        recognition.onerror = () => { wakeWordRecognitionRef.current = null; };
        recognition.onend = () => {
             wakeWordRecognitionRef.current = null;
             if (statusRef.current === 'idle' && isPersistentRef.current) {
                 try { recognition.start(); wakeWordRecognitionRef.current = recognition; } catch(e) {}
             }
        };

        try {
            recognition.start();
            wakeWordRecognitionRef.current = recognition;
        } catch (e) {
            console.error("Wake word start error:", e);
        }
    }, []); 

    const stopWakeWordListener = useCallback(() => {
        if (wakeWordRecognitionRef.current) {
            console.log("Stopping Wake Word Listener");
            wakeWordRecognitionRef.current.stop();
            wakeWordRecognitionRef.current = null;
        }
    }, []);

    // --- VAD Logic (UPDATED) ---
    const monitorVAD = (stream: MediaStream, recorder: MediaRecorder) => {
        const vadCtx = new AudioContext();
        const source = vadCtx.createMediaStreamSource(stream);
        const analyser = vadCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const buffer = new Uint8Array(analyser.frequencyBinCount);
        let speechSeen = false;
        let silenceMs = 0;
        const startTime = Date.now();

        const loop = () => {
            if (recorder.state !== 'recording') { vadCtx.close(); return; }
            
            // 1. MAX DURATION INCREASED: 8s -> 60s
            // This prevents it from cutting you off mid-sentence aggressively.
            if (Date.now() - startTime > 30000) { 
                console.log("Max duration reached (30s). Stopping.");
                stopRecording();
                cancelAnimationFrame(vadRafRef.current!);
                vadCtx.close();
                return;
            }

            analyser.getByteFrequencyData(buffer);
            const relevantBins = buffer.subarray(4); 
            const vol = relevantBins.reduce((a, b) => a + b, 0) / relevantBins.length;

            // 2. SENSITIVITY ADJUSTMENT
            // vol > 20 (was 25): Slightly more sensitive to picking up voice so it doesn't think you stopped.
            if (vol > 20) { 
                speechSeen = true; 
                speechDetectedRef.current = true;
                silenceMs = 0; 
            } else if (speechSeen) {
                // 16ms per frame approx (60fps)
                silenceMs += 16;
            }

            // 3. SILENCE TIMEOUT INCREASED: 1.5s -> 3.5s
            // Waits for 3.5 seconds of silence before sending.
            if (speechSeen && silenceMs > 2500) {
                console.log("Silence detected (2.5s). Stopping.");
                stopRecording();
                cancelAnimationFrame(vadRafRef.current!);
                vadCtx.close();
            } else {
                vadRafRef.current = requestAnimationFrame(loop);
            }
        };
        loop();
    };

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
                    } catch(e) {}
                    playerRef.current = null;
                }
                socketRef.current?.send(JSON.stringify({ type: 'interrupt' }));
                vadCtx.close();
                stopInterruptVAD();
                
                setStatus('listening'); 
                startRecordingRef.current(); 
                return;
            }
            interruptVadRafRef.current = requestAnimationFrame(loop);
        };
        loop();
    }, []);

    const stopInterruptVAD = () => { if (interruptVadRafRef.current) { cancelAnimationFrame(interruptVadRafRef.current); interruptVadRafRef.current = null; } };
    const disconnect = useCallback(() => {
        socketRef.current?.close();
        if (vadRafRef.current) cancelAnimationFrame(vadRafRef.current);
        stopInterruptVAD();
        stopWakeWordListener();
        if (playerRef.current) { 
            try { 
                if (typeof playerRef.current.destroy === 'function') playerRef.current.destroy(); 
            } catch(e) {} 
            playerRef.current = null; 
        }
        setStatus('disconnected');
    }, []);

    // --- WebSocket ---
    const connect = useCallback(async () => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

        initAudio(24000); 
        await initMic();

        const wsUrl = apiEndpoint.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/voice';
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log("WebSocket connected.");
            ws.send(JSON.stringify({ type: 'start', session_id: sessionIdRef.current, filename: 'mic.webm' }));
            setStatus('idle');
        };

        ws.onclose = () => setStatus('disconnected');
        ws.onerror = (err) => { console.error(err); setStatus('disconnected'); };

        ws.onmessage = (e) => {
            if (typeof e.data === 'string') {
                const msg = JSON.parse(e.data);
                switch(msg.type) {
                    case 'audio_format':
                        if (msg.sample_rate && (msg.sample_rate !== currentSampleRate.current || !playerRef.current)) {
                            initAudio(msg.sample_rate);
                        }
                        break;
                    case 'transcript':
                        setMessages(prev => [...prev, { id: `${sessionIdRef.current}-${Date.now()}`, source: 'user', text: msg.text }]);
                        break;
                    case 'assistant_start':
                        setStatus('speaking');
                        const newStreamingId = `${sessionIdRef.current}-${Date.now()}`;
                        streamingIdRef.current = newStreamingId; 
                        setMessages(prev => [...prev, { id: newStreamingId, source: 'assistant', text: '' }]);
                        startInterruptVAD();
                        break;
                    case 'token':
                        if (streamingIdRef.current) {
                            setMessages(prev => prev.map(m => m.id === streamingIdRef.current ? { ...m, text: m.text + msg.text } : m));
                        }
                        break;
                    case 'done':
                        stopInterruptVAD();
                         if (streamingIdRef.current) {
                            setMessages(prev => prev.map(m => m.id === streamingIdRef.current ? { ...m, text: msg.assistant_text } : m));
                            streamingIdRef.current = null;
                        }
                        setStatus('idle'); 
                        break;
                }
            } else if (e.data instanceof ArrayBuffer) {
                if (!playerRef.current) {
                    initAudio(currentSampleRate.current);
                }
                playerRef.current?.feed(e.data);
            }
        };
    }, [apiEndpoint, initAudio, initMic, isPersistent]);

    // --- Persistence Effect ---
    useEffect(() => {
        if (isPersistent && status === 'idle') {
            startWakeWordListener();
        } else {
            stopWakeWordListener();
        }
    }, [isPersistent, status, startWakeWordListener, stopWakeWordListener]);

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

    return { status, messages, analyserNode, connect, disconnect, startRecording, stopRecording, clearMessages, cancelRecording, sendTextMessage };
}
