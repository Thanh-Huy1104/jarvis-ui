import { useState, useEffect, useCallback } from 'react';
import { 
  Book, Trash2, Code, Sparkles, Box, Search, Copy, Check, Terminal
} from 'lucide-react';
import { motion } from 'framer-motion';
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
    <div className="h-full bg-[#FAF9F6] flex flex-col overflow-hidden">
      {/* --- Header --- */}
      <div className="px-6 py-6 border-b border-stone-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
         <div>
            <h1 className="text-2xl font-serif font-medium text-[#1a1a1a] flex items-center gap-3">
              <Book className="text-[#34A853]" size={24} strokeWidth={2} />
              Skills Library
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Browse and manage your approved capabilities
            </p>
         </div>

         <div className="relative w-full sm:w-72">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
             <input 
                type="text" 
                placeholder="Search skills..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#34A853]/20 focus:border-[#34A853] transition-all"
             />
         </div>
      </div>

      {/* --- Grid Content --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34A853]"></div>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
               <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                  <Book size={24} className="opacity-40" />
               </div>
               <p className="text-lg font-serif">
                  {searchTerm ? "No matching skills found" : "Library is empty"}
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {filteredSkills.map(skill => (
                  <motion.div
                    key={skill.name}
                    layoutId={`card-${skill.name}`}
                    whileHover={{ y: -2 }}
                    onClick={() => setSelectedSkill(skill)}
                    className="bg-white rounded-xl p-5 border border-stone-100 shadow-sm hover:shadow-md hover:border-[#34A853]/30 transition-all cursor-pointer group flex flex-col h-[220px]"
                  >
                     <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-[#E8F5E9] text-[#34A853] rounded-lg">
                           <Code size={18} />
                        </div>
                        <span className="text-[10px] font-mono text-stone-400 px-2 py-1 bg-stone-50 rounded-md border border-stone-100">
                           PYTHON
                        </span>
                     </div>
                     
                     <h3 className="font-serif font-medium text-lg text-[#1a1a1a] mb-2 line-clamp-1 group-hover:text-[#34A853] transition-colors">
                        {skill.name}
                     </h3>
                     
                     <p className="text-sm text-stone-500 leading-relaxed line-clamp-3 mb-4 flex-1">
                        {skill.description}
                     </p>
                     
                     <div className="flex items-center gap-2 text-xs font-medium text-[#34A853] opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                        View Details <Box size={12} />
                     </div>
                  </motion.div>
               ))}
            </div>
          )}
      </div>

      {/* --- Detail Modal --- */}
      <Modal
        isOpen={!!selectedSkill}
        onClose={() => setSelectedSkill(null)}
        title={
            <div className="flex items-center gap-2">
                <Code className="text-[#34A853]" size={20} />
                <span>{selectedSkill?.name}</span>
            </div>
        }
        className="max-w-4xl h-[85vh]"
      >
         {selectedSkill && (
            <div className="flex flex-col h-full bg-[#FAF9F6]">
               {/* Modal Header Actions */}
               <div className="bg-white px-6 py-4 border-b border-stone-200 flex flex-wrap gap-4 justify-between items-center shrink-0">
                  <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
                     <Box size={14} />
                     ID: {selectedSkill.name}
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium transition-colors"
                     >
                        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy Code"}
                     </button>
                     <button 
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors border border-red-100"
                     >
                        <Trash2 size={14} />
                        Delete
                     </button>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Description Section */}
                  <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                     <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-400" /> Description
                     </h3>
                     <p className="text-stone-700 text-sm leading-relaxed font-sans">
                        {selectedSkill.description}
                     </p>
                  </div>

                  {/* Code Section */}
                  <div className="bg-[#1e1e1e] rounded-xl overflow-hidden shadow-lg border border-stone-800 flex flex-col">
                     <div className="px-4 py-2 bg-[#2d2d2d] border-b border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-stone-400">
                             <Terminal size={14} />
                             <span className="text-xs font-mono">implementation.py</span>
                         </div>
                     </div>
                     <div className="overflow-x-auto">
                        <SyntaxHighlighter
                            style={vscDarkPlus}
                            language="python"
                            showLineNumbers={true}
                            wrapLines={true}
                            customStyle={{
                                margin: 0,
                                padding: '1.5rem',
                                background: 'transparent',
                                fontSize: '14px',
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