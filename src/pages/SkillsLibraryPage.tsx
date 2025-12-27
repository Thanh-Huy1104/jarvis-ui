import { useState, useEffect, useCallback } from 'react';
import { 
  Trash2, Code, Box, Search, Copy, Check, Terminal, Database, Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

// --- Types ---
interface LibrarySkill {
  name: string; // Used as ID
  description: string;
  code: string;
}

interface SkillsLibraryPageProps {
  apiEndpoint: string;
}

export default function SkillsLibraryPage({ apiEndpoint }: SkillsLibraryPageProps) {
  const [skills, setSkills] = useState<LibrarySkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<LibrarySkill | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  
  const { showToast } = useToast();

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch(`${apiEndpoint}/skills/library`);
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
      }
    } catch (error) {
      console.error("Failed to fetch library skills:", error);
      showToast("Failed to load skills library", "error");
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, showToast]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleDelete = async () => {
    if (!selectedSkill || !confirm(`Are you sure you want to delete "${selectedSkill.name}"?`)) return;
    try {
      const res = await fetch(`${apiEndpoint}/skills/library/${selectedSkill.name}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSkills(prev => prev.filter(s => s.name !== selectedSkill.name));
        setSelectedSkill(null);
        showToast("Skill deleted from library", "info");
      } else {
        showToast("Failed to delete skill", "error");
      }
    } catch (error) {
      console.error("Error deleting skill:", error);
      showToast("Network error deleting skill", "error");
    }
  };

  const handleCopy = () => {
    if (selectedSkill) {
      navigator.clipboard.writeText(selectedSkill.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Code copied to clipboard", "success");
    }
  };

  const filteredSkills = skills.filter(skill => 
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    skill.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full bg-[#FAF9F6] dark:bg-[#1F1F1F] flex flex-col overflow-hidden relative">

      {/* --- Header --- */}
      <div className="relative z-10 px-6 py-6 border-b border-stone-200/50 dark:border-white/5 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
         <div>
            <h1 className="text-2xl font-serif font-medium text-[#1a1a1a] dark:text-stone-100 flex items-center gap-3">
              <div className="p-2 bg-stone-100 dark:bg-[#2A2A2A] rounded-lg border border-stone-200 dark:border-white/10">
                <Database className="text-stone-600 dark:text-stone-300" size={24} strokeWidth={2} />
              </div>
              Skills Library
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 pl-14">
              Access and manage verified system capabilities
            </p>
         </div>

         <div className="relative w-full sm:w-80 group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 group-focus-within:text-stone-700 dark:group-focus-within:text-stone-300 transition-colors" size={16} />
             <input 
                type="text" 
                placeholder="Search modules..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-[#2A2A2A] border border-stone-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 dark:focus:ring-white/10 focus:border-stone-400 dark:focus:border-white/20 transition-all shadow-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500"
             />
         </div>
      </div>

      {/* --- Grid Content --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 relative z-10">
          {loading ? (
            <div className="flex justify-center items-center h-40">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-500 dark:border-stone-400"></div>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400 dark:text-stone-500">
               <div className="w-20 h-20 bg-white dark:bg-[#2A2A2A] border border-stone-100 dark:border-white/5 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <Server size={32} className="opacity-20" />
               </div>
               <p className="text-lg font-serif opacity-60">
                  {searchTerm ? "No matching modules found" : "Library is empty"}
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
               <AnimatePresence>
               {filteredSkills.map(skill => (
                  <motion.div
                    key={skill.name}
                    layoutId={`card-${skill.name}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setSelectedSkill(skill)}
                    className="bg-white/90 dark:bg-[#2A2A2A]/90 backdrop-blur-md rounded-xl p-0 border border-stone-200/60 dark:border-white/5 shadow-sm hover:shadow-lg hover:shadow-stone-200/50 dark:hover:shadow-black/20 hover:border-stone-300 dark:hover:border-white/20 transition-all cursor-pointer group flex flex-col h-[140px] relative overflow-hidden"
                  >
                     <div className="p-4 pb-0 flex justify-between items-start z-10">
                        <div className="p-2 bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 text-stone-600 dark:text-stone-300 rounded-lg shadow-sm group-hover:scale-105 transition-transform duration-300">
                           <Code size={16} strokeWidth={2} />
                        </div>
                        <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 px-2 py-0.5 bg-stone-50 dark:bg-white/5 rounded-md border border-stone-100 dark:border-white/5 flex items-center gap-1">
                           <Check size={10} className="text-stone-500 dark:text-stone-400" /> VERIFIED
                        </span>
                     </div>
                     
                     <div className="p-4 flex-1 flex flex-col z-10">
                        <h3 className="font-serif font-medium text-[15px] text-[#1a1a1a] dark:text-stone-100 mt-1 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">
                            {skill.name}
                        </h3>
                     </div>
                  </motion.div>
               ))}
               </AnimatePresence>
            </div>
          )}
      </div>

      {/* --- Detail Modal --- */}
      <Modal
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        title={
            <div className="flex items-center gap-2">
                <Box className="text-stone-600 dark:text-stone-400" size={20} />
                <span className="font-mono text-sm tracking-wide dark:text-stone-200">{selectedSkill?.name}</span>
            </div>
        }
        className="max-w-4xl h-[85vh] dark:bg-[#1F1F1F]"
      >
         {selectedSkill && (
            <div className="flex flex-col h-full bg-[#FAF9F6] dark:bg-[#1F1F1F]">
               {/* Modal Header Actions */}
               <div className="bg-white dark:bg-[#2A2A2A] px-6 py-3 border-b border-stone-200 dark:border-white/5 flex flex-wrap gap-4 justify-between items-center shrink-0">
                  <div className="flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500 font-mono">
                     <div className="px-2 py-1 bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-400 rounded border border-stone-200 dark:border-white/10 flex items-center gap-1">
                         <Check size={10} /> ACTIVE
                     </div>
                     <span className="text-stone-300 dark:text-white/10">|</span>
                     <span>MODULE_ID: {selectedSkill.name.toUpperCase()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 dark:bg-white/5 hover:bg-stone-200 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                     >
                        {copied ? <Check size={14} className="text-green-600 dark:text-green-400" /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy Code"}
                     </button>
                     <button 
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#2A2A2A] border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                     >
                        <Trash2 size={14} />
                        Delete
                     </button>
                  </div>
               </div>

               <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Code Pane (Full Width) */}
                    <div className="flex-1 flex flex-col bg-[#1e1e1e] min-h-[400px]">
                        <div className="px-4 py-2 bg-[#252526] border-b border-black/20 flex items-center justify-between shrink-0">
                             <div className="flex items-center gap-2 text-stone-400">
                                 <Terminal size={14} />
                                 <span className="text-xs font-mono">source_code.py</span>
                             </div>
                             <div className="text-[10px] font-mono text-stone-500">READ_ONLY</div>
                        </div>
                        <div className="flex-1 overflow-auto no-scrollbar p-0">
                            <SyntaxHighlighter
                                style={vscDarkPlus}
                                language="python"
                                showLineNumbers={true}
                                wrapLines={true}
                                customStyle={{
                                    margin: 0,
                                    padding: '1.5rem',
                                    background: 'transparent',
                                    fontSize: '13px',
                                    lineHeight: '1.6',
                                }}
                            >
                                {selectedSkill.code}
                            </SyntaxHighlighter>
                        </div>
                    </div>
               </div>
            </div>
         )}
      </Modal>
    </div>
  );
}