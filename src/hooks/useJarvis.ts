import { useState, useRef, useCallback, useEffect } from 'react';
import { getSessionHistory } from '../services/sessions';

// --- Types ---
export type JarvisStatus =
  | 'disconnected'
  | 'idle'
  | 'processing'
  | 'speaking'; // Kept for streaming state, but no audio

export interface Message {
  id: string;
  source: 'user' | 'assistant';
  text: string;
  tasks?: Task[];
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

    // Refs for state
    const statusRef = useRef<JarvisStatus>('disconnected');
    const isPersistentRef = useRef(isPersistent);

    const socketRef = useRef<WebSocket | null>(null);
    const streamingIdRef = useRef<string | null>(null); 
    
    const sessionIdRef = useRef<string | null>(sessionId || null);

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

    const disconnect = useCallback(() => {
        socketRef.current?.close();
        setStatus('disconnected');
    }, []);

    // --- WebSocket ---
    const connect = useCallback(async () => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

        // Lazy init session ID
        if (!sessionIdRef.current) {
            sessionIdRef.current = `jarvis-session-${Date.now()}`;
        }

        const wsUrl = apiEndpoint.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/chat';
        console.log("Connecting to WebSocket:", wsUrl);
        
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log("WebSocket connected successfully!");
            ws.send(JSON.stringify({ type: 'start', session_id: sessionIdRef.current, filename: 'text_only_mode' }));
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
                    case 'transcript': {
                        // In text mode, we handle user message optimistically, but server might send transcript confirmation
                        // setMessages(prev => [...prev, { id: `${sessionIdRef.current}-${Date.now()}`, source: 'user', text: msg.text }]);
                        break;
                    }
                    case 'assistant_start': {
                        setStatus('speaking');
                        const newStreamingId = `${sessionIdRef.current}-${Date.now()}`;
                        streamingIdRef.current = newStreamingId; 
                        setMessages(prev => [...prev, { id: newStreamingId, source: 'assistant', text: '' }]);
                        break;
                    }
                    case 'token': {
                        if (streamingIdRef.current) {
                            setMessages(prev => prev.map(m => m.id === streamingIdRef.current ? { ...m, text: m.text + msg.text } : m));
                        }
                        break;
                    }
                    case 'task_queue': {
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
                         if (streamingIdRef.current) {
                            setMessages(prev => prev.map(m => m.id === streamingIdRef.current ? { ...m, text: msg.assistant_text } : m));
                            streamingIdRef.current = null;
                        }
                        setStatus('idle');
                        setTasks([]);
                        break;
                    }
                }
            }
        };
    }, [apiEndpoint, sessionId]);

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

    return { status, messages, tasks, connect, disconnect, clearMessages, sendTextMessage };
}