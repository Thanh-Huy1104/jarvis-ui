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

  // Effect to connect on mount and disconnect on unmount
  useEffect(() => {
    connect(); // Auto-connect on load
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-white text-black font-serif overflow-hidden flex flex-col items-center justify-start pt-8 pb-12 relative">
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