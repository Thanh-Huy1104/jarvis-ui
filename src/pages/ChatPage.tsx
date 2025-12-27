import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useJarvis } from '../hooks/useJarvis';
import Chat from '../components/Chat';

interface ChatPageProps {
  apiEndpoint: string;
}

export default function ChatPage({ apiEndpoint }: ChatPageProps) {
  const [isPersistent] = useState(false);
  const { sessionId } = useParams<{ sessionId: string }>();

  const {
    status,
    messages,
    tasks,
    connect,
    disconnect,
    clearMessages,
    sendTextMessage,
  } = useJarvis(apiEndpoint, isPersistent, sessionId);

  useEffect(() => {
    connect(); 
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <div className="h-full w-full flex justify-center overflow-hidden">
      <Chat 
        messages={messages}
        tasks={tasks}
        onClear={clearMessages} 
        onSendMessage={sendTextMessage} 
        isConnected={status !== 'disconnected'}
        isProcessing={status === 'processing'}
      />
    </div>
  );
}
