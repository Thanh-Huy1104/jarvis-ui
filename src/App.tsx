import { useEffect, useState } from 'react';
import { useJarvis } from './hooks/useJarvis';
import Chat from './components/Chat';

export default function App() {
  const [apiEndpoint] = useState('https://192.168.5.215:8080'); 
  const [isPersistent] = useState(false);

  const {
    status,
    messages,
    connect,
    disconnect,
    clearMessages,
    sendTextMessage,
    startRecording,
    stopRecording
  } = useJarvis(apiEndpoint, isPersistent);

  useEffect(() => {
    connect(); 
    return () => {
      disconnect();
    };
  }, []);

  return (
    // Changed h-screen to h-[100dvh] for better mobile browser support
    // This prevents the "jump" when the mobile address bar collapses
    <div className="h-[100dvh] w-full bg-[#FAF9F6] text-stone-800 font-serif flex justify-center overflow-hidden supports-[height:100cqh]:h-[100cqh]">
      <Chat 
        messages={messages} 
        onClear={clearMessages} 
        onSendMessage={sendTextMessage} 
        isConnected={status !== 'disconnected'}
        isListening={status === 'listening'}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
      />
    </div>
  );
}