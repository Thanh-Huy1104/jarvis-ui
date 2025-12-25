import { useEffect, useState } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { getSessions, createSession } from '../services/sessions';
import type { ChatSession } from '../types/session';
import { useNavigate } from 'react-router-dom';

interface SessionListProps {
  apiEndpoint: string;
  isCollapsed: boolean;
  currentSessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

export default function SessionList({ apiEndpoint, isCollapsed, currentSessionId, onSessionCreated }: SessionListProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
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

  const handleCreateSession = async () => {
    try {
      const { session_id } = await createSession(apiEndpoint);
      // Refresh list
      await fetchSessions();
      if (onSessionCreated) {
        onSessionCreated(session_id);
      } else {
          navigate(`/c/${session_id}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSessionClick = (sessionId: string) => {
    navigate(`/c/${sessionId}`);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <button
        onClick={handleCreateSession}
        className={`
          flex items-center gap-3 px-3 py-2.5 mx-3 mt-2 mb-4 rounded-xl text-stone-600 hover:bg-stone-200/50 hover:text-stone-800 transition-all border border-stone-200/50 bg-white shadow-sm
          ${isCollapsed ? 'justify-center mx-2 px-0' : ''}
        `}
        title="New Chat"
      >
        <Plus size={20} strokeWidth={2} className="shrink-0 text-[#34A853]" />
        {!isCollapsed && <span className="text-[14px] font-medium font-sans">New Chat</span>}
      </button>

      <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
         {/* Title only when expanded */}
        {!isCollapsed && sessions.length > 0 && (
            <div className="px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Recent
            </div>
        )}

        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => handleSessionClick(session.id)}
            className={`
              w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
              ${isCollapsed ? 'justify-center' : 'justify-start text-left'}
              ${currentSessionId === session.id
                ? 'bg-white text-[#1a1a1a] shadow-[0_1px_4px_rgba(0,0,0,0.04)]' 
                : 'text-stone-500 hover:bg-stone-200/30 hover:text-stone-700'}
            `}
            title={session.title || 'Untitled Chat'}
          >
            <MessageSquare 
              size={18} 
              strokeWidth={2} 
              className={`shrink-0 transition-colors ${currentSessionId === session.id ? 'text-[#34A853]' : 'text-stone-400 group-hover:text-stone-500'}`}
            />
            {!isCollapsed && (
              <span className="text-[14px] font-sans truncate w-full">
                {session.title || 'Untitled Chat'}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
