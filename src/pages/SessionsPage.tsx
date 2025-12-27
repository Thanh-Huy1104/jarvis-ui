import { useState, useEffect, useCallback } from 'react';
import { 
  MessageSquare, Search, Clock, ArrowRight, MessageCircle, MessagesSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getSessions } from '../services/sessions';
import type { ChatSession } from '../types/session';

interface SessionsPageProps {
  apiEndpoint: string;
}

export default function SessionsPage({ apiEndpoint }: SessionsPageProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchSessions = useCallback(async () => {
    try {
      const data = await getSessions(apiEndpoint, 100); 
      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = sessions.filter(session => {
    const term = searchTerm.toLowerCase();
    const title = (session.title || 'Untitled Chat').toLowerCase();
    const id = session.id.toLowerCase();
    return title.includes(term) || id.includes(term);
  });

  const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: 'numeric' 
        }).format(date);
    } catch {
        return dateString;
    }
  };

  return (
    <div className="h-full bg-[#FAF9F6] dark:bg-[#1F1F1F] flex flex-col overflow-hidden relative transition-colors duration-300">
      
      {/* --- Header --- */}
      <div className="relative z-10 px-6 py-6 border-b border-stone-200/50 dark:border-white/5 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
         <div>
            <h1 className="text-2xl font-serif font-medium text-[#1a1a1a] dark:text-stone-100 flex items-center gap-3">
              <div className="p-2 bg-stone-100 dark:bg-[#2A2A2A] rounded-lg border border-stone-200 dark:border-white/10">
                <MessagesSquare className="text-stone-600 dark:text-stone-300" size={24} strokeWidth={2} />
              </div>
              Chat History
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 pl-14">
              Search and manage your conversation history
            </p>
         </div>
         
         <div className="relative w-full sm:w-80 group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 group-focus-within:text-stone-700 dark:group-focus-within:text-stone-300 transition-colors" size={16} />
             <input 
                type="text" 
                placeholder="Search chats..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-[#2A2A2A] border border-stone-200 dark:border-white/10 rounded-xl text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200 dark:focus:ring-white/10 focus:border-stone-400 dark:focus:border-white/20 transition-all shadow-sm"
             />
         </div>
      </div>

      {/* --- List Content --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 relative z-10">
          {loading ? (
            <div className="flex justify-center items-center h-40">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-500 dark:border-stone-400"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400 dark:text-stone-500">
               <div className="w-20 h-20 bg-white dark:bg-[#2A2A2A] border border-stone-100 dark:border-white/5 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <MessageCircle size={32} className="opacity-20" />
               </div>
               <p className="text-lg font-serif opacity-60">
                  {searchTerm ? "No matching chats found" : "No chat history yet"}
               </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-2">
               <AnimatePresence>
               {filteredSessions.map(session => (
                  <motion.div
                    key={session.id}
                    layoutId={`session-${session.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => navigate(`/c/${session.id}`)}
                    className="
                      group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200
                      bg-white dark:bg-[#2A2A2A] border border-stone-200/60 dark:border-white/5 shadow-sm hover:shadow-md
                      hover:bg-stone-50/50 dark:hover:bg-white/5 hover:border-stone-300 dark:hover:border-white/20
                    "
                  >
                     <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-2 bg-stone-50 dark:bg-black/20 border border-stone-100 dark:border-white/5 text-stone-500 dark:text-stone-400 rounded-lg shrink-0">
                            <MessageSquare size={18} strokeWidth={2} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h3 className="font-serif font-medium text-[15px] text-[#1a1a1a] dark:text-stone-200 truncate group-hover:text-stone-900 dark:group-hover:text-white transition-colors">
                                {session.title || 'Untitled Chat'}
                            </h3>
                            <p className="text-[11px] text-stone-400 dark:text-stone-500 font-mono truncate">
                                {session.id}
                            </p>
                        </div>
                     </div>

                     <div className="flex items-center gap-6 pl-4 shrink-0">
                        <div className="flex flex-col items-end text-[11px] text-stone-400 dark:text-stone-500 font-sans">
                            <span className="flex items-center gap-1.5">
                                <Clock size={12} />
                                <span>{formatDate(session.updated_at).split(',')[0]}</span>
                            </span>
                        </div>
                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-stone-50 dark:bg-white/5 text-stone-400 dark:text-stone-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <ArrowRight size={14} />
                        </div>
                     </div>
                  </motion.div>
               ))}
               </AnimatePresence>
            </div>
          )}
      </div>
    </div>
  );
}
