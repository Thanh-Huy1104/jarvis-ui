import { useEffect, useState } from 'react';
import { useEve } from './hooks/useEve';
import SoundWave from './components/SoundWave';
import Chat from './components/Chat';
import Controls from './components/Controls';
import { Activity, ArrowRight, Power } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function App() {
  const [apiEndpoint, setApiEndpoint] = useState('https://192.168.5.215:8080');
  const [isPersistent, setIsPersistent] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // CHANGED: We now get `analyserNode` from the hook instead of raw `audioData`
  const {
    status,
    messages,
    analyserNode,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearMessages,
    cancelRecording,
    sendTextMessage
  } = useEve(apiEndpoint, isPersistent) as {
    status: 'idle' | 'listening' | 'processing' | 'speaking' | 'disconnected';
    messages: any;
    analyserNode: any;
    connect: () => void;
    disconnect: () => void;
    startRecording: () => void;
    stopRecording: () => void;
    clearMessages: () => void;
    cancelRecording: () => void;
    sendTextMessage: (text: string) => void;
  };

  // Effect to connect on mount and disconnect on unmount
  useEffect(() => {
    // connect(); // Uncomment to connect automatically on load
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Effect to auto-start listening in persistent mode
  useEffect(() => {
    if (isPersistent && status === 'idle') {
      startRecording();
    }
  }, [isPersistent, status, startRecording]);

  const handleMicClick = () => {
    if (isPersistent) return; // In persistent mode, the orb is just a visualizer

    if (status === 'idle') {
      startRecording();
    } else if (status === 'listening') {
      stopRecording();
    }
  };

  const getStatusLabel = () => {
    if (isPaused) return 'On Hold';
    switch (status) {
      case 'disconnected': return 'Disconnected';
      case 'idle': return isPersistent ? 'Waiting...' : 'Ready';
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return '...';
    }
  }

  const getBorderGradient = () => {
    switch (status) {
      case 'listening': return 'conic-gradient(from 90deg at 50% 50%, transparent 0%, #0ea5e9 50%, transparent 100%)'; // Sky Blue
      case 'processing': return 'conic-gradient(from 90deg at 50% 50%, transparent 0%, #8b5cf6 50%, transparent 100%)'; // Violet
      case 'speaking': return 'conic-gradient(from 90deg at 50% 50%, transparent 0%, #f59e0b 50%, transparent 100%)'; // Amber
      default: return 'none';
    }
  };

  // If disconnected, show a connect screen
  if (status === 'disconnected') {
    return (
      <div className="h-screen w-screen bg-[#FDFDFD] text-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-black/10">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-[120px] pointer-events-none opacity-60" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none opacity-60" />

        <div className="w-full max-w-md z-10 space-y-12">
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative inline-block"
            >
              <h1 className="text-[80px] font-thin tracking-[-0.05em] leading-none font-serif text-gray-900">Eve</h1>
              <div className="absolute -right-3 top-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            </motion.div>
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-sm text-gray-400 font-mono tracking-widest uppercase"
            >
              Neural Interface // v2.0
            </motion.p>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-4"
          >
            <div className="group relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Activity className="h-4 w-4 text-gray-400 group-focus-within:text-black transition-colors" />
              </div>
              <input
                type="text"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-sm text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_5px_15px_rgb(0,0,0,0.03)]"
                placeholder="Endpoint URL..."
              />
            </div>
            <button
              onClick={connect}
              className="w-full group relative flex items-center justify-center gap-3 bg-black text-white px-6 py-4 rounded-2xl font-medium text-sm transition-all hover:bg-gray-900 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Initialize Connection</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center"
          >
            <p className="text-[10px] text-gray-300 font-mono">Waiting for server signal...</p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-white text-black font-serif overflow-hidden flex flex-col items-center justify-start pt-8 pb-12 relative">

      {/* Header */}
      <div className="w-full px-6 flex justify-center z-20 mb-6 mt-4">
        <div className="relative">
          {/* Active Spinning Border - Only visible when busy */}
          <AnimatePresence>
            {(status === 'listening' || status === 'processing' || status === 'speaking') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -inset-[3px] rounded-full z-0 overflow-hidden"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ background: getBorderGradient() }}
                  className="w-full h-full opacity-50"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Glass Pill */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 flex items-center gap-4 px-6 py-2.5 bg-white/90 backdrop-blur-2xl border border-white/50 shadow-sm rounded-full ring-1 ring-black/5"
          >

            {/* Contextual Status */}
            <div className="flex items-center gap-2  justify-center min-w-[70px]">
              <AnimatePresence mode="wait">
                {status === 'listening' ? (
                  <motion.div
                    key="listening"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="relative flex h-2 w-2"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </motion.div>
                ) : status === 'processing' ? (
                  <motion.div
                    key="processing"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                  >
                    <Activity className="w-3 h-3 text-violet-500 animate-spin" />
                  </motion.div>
                ) : status === 'speaking' ? (
                  <motion.div
                    key="speaking"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="relative flex h-2 w-2"
                  >
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500" // Emerald for Ready/Idle
                  />
                )}
              </AnimatePresence>

              <p className="text-[10px] font-medium text-gray-500 font-mono tracking-wide">
                {getStatusLabel()}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Orb & Chat Wrapper */}
      <div className="w-full max-w-2xl mx-auto flex flex-col justify-center items-center px-4 h-1/2">
        <div
          className={`relative w-full flex justify-center items-center h-full ${isPersistent ? 'cursor-default' : 'cursor-pointer'}`}
          onClick={handleMicClick}
        >
          <SoundWave analyserNode={analyserNode} status={status} />
        </div>


      </div>

      {/* Main Content */}
      <div className="w-full flex h-2/5 justify-center">
        {showChat && <Chat messages={messages} onClear={clearMessages} onSendMessage={sendTextMessage} />}
      </div>
      <Controls
        onDisconnect={disconnect}
        status={status}
        isPersistent={isPersistent}
        setIsPersistent={setIsPersistent}
        startRecording={startRecording}
        stopRecording={stopRecording}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        cancelRecording={cancelRecording}
      />
    </div>
  );
}