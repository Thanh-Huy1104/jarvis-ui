import { useEffect, useState } from 'react';
import { EyeOff } from 'lucide-react';
import { getSessions } from '../services/sessions';
import type { ChatSession } from '../types/session';
import { useNavigate } from 'react-router-dom';

interface SessionListProps {
  apiEndpoint: string;
  isCollapsed: boolean;
  currentSessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

export default function SessionList({ apiEndpoint, isCollapsed, currentSessionId }: SessionListProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showRecents, setShowRecents] = useState(true);
  const navigate = useNavigate();

  const fetchSessions = async () => {
    try {
      const data = await getSessions(apiEndpoint);
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [apiEndpoint]);

  const handleSessionClick = (sessionId: string) => {
    navigate(`/c/${sessionId}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* "New Chat" button removed from here as it's moved to Sidebar nav */}

      <div className="flex-1 overflow-y-auto px-3 space-y-1 no-scrollbar">
         {/* Title only when expanded */}
        {!isCollapsed && sessions.length > 0 && (
            <div className="group flex items-center justify-between px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                <span>Recent</span>
                <button 
                  onClick={() => setShowRecents(!showRecents)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-stone-200/50 rounded"
                  title={showRecents ? "Hide chats" : "Show chats"}
                >
                  <EyeOff size={14} />
                </button>
            </div>
        )}

        {showRecents && sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => handleSessionClick(session.id)}
            className={`
              w-full group flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200
              ${isCollapsed ? 'justify-center hidden' : 'justify-start text-left'} 
              ${currentSessionId === session.id
                ? 'bg-stone-200/60 text-[#1a1a1a]' 
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'}
            `}
            title={session.title || 'Untitled Chat'}
          >
            {!isCollapsed && (
              <span className="text-[13px] font-sans truncate w-full">
                {session.title || 'Untitled Chat'}
              </span>
            )}
             {/* Collapsed mode: Hidden entirely as per request ("nothing") */}
          </button>
        ))}
      </div>
    </div>
  );
}
