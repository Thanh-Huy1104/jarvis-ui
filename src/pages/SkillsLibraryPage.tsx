import { useState, useEffect, useCallback } from 'react';
import { 
  Trash2, Code, Sparkles, Box, Search, Copy, Check, Terminal, Database, Server
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import BackgroundGrid from '../components/BackgroundGrid';

// --- Types ---
interface LibrarySkill {
  name: string; // Used as ID
  description: string;
  code: string;
}

interface SkillsLibraryPageProps {
  apiEndpoint: string;
}

const parseSkillDescription = (content: string) => {
  if (!content) return '';
  const match = content.match(/^---\s*[\s\S]*?---\s*([\s\S]*)$/);
  if (match) {
    return match[1].trim();
  }
  return content;
};

const stripMarkdown = (markdown: string) => {
  if (!markdown) return '';
  
  // Remove entire header lines (e.g. "# Title", "## Description")
  let text = markdown.replace(/^#+\s+.*$/gm, '');
  
  // Remove bold/italic
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Remove links & images
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');

  // Collapse whitespace
  return text.replace(/\s+/g, ' ').trim();
};

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
    <div className="h-full bg-[#FAF9F6] flex flex-col overflow-hidden relative">
      <BackgroundGrid />

      {/* --- Header --- */}
      <div className="relative z-10 px-6 py-6 border-b border-stone-200/50 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
         <div>
            <h1 className="text-2xl font-serif font-medium text-[#1a1a1a] flex items-center gap-3">
              <div className="p-2 bg-[#34A853]/10 rounded-lg border border-[#34A853]/20">
                <Database className="text-[#34A853]" size={24} strokeWidth={2} />
              </div>
              Skills Library
            </h1>
            <p className="text-sm text-stone-500 mt-1 pl-14">
              Access and manage verified system capabilities
            </p>
         </div>

         <div className="relative w-full sm:w-80 group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-[#34A853] transition-colors" size={16} />
             <input 
                type="text" 
                placeholder="Search modules..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#34A853]/20 focus:border-[#34A853] transition-all shadow-sm"
             />
         </div>
      </div>

      {/* --- Grid Content --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 relative z-10">
          {loading ? (
            <div className="flex justify-center items-center h-40">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34A853]"></div>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
               <div className="w-20 h-20 bg-white border border-stone-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <Server size={32} className="opacity-20" />
               </div>
               <p className="text-lg font-serif opacity-60">
                  {searchTerm ? "No matching modules found" : "Library is empty"}
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    className="bg-white/90 backdrop-blur-md rounded-2xl p-0 border border-stone-200/60 shadow-sm hover:shadow-xl hover:shadow-[#34A853]/10 hover:border-[#34A853]/40 transition-all cursor-pointer group flex flex-col h-[240px] relative overflow-hidden"
                  >
                     {/* Decorative Top Bar */}
                     <div className="h-1 w-full bg-gradient-to-r from-[#34A853]/40 to-transparent absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity" />

                     <div className="p-5 pb-0 flex justify-between items-start z-10">
                        <div className="p-2.5 bg-gradient-to-br from-green-50 to-white border border-green-100/50 text-[#34A853] rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-300">
                           <Code size={20} strokeWidth={2} />
                        </div>
                        <span className="text-[10px] font-mono text-stone-400 px-2 py-1 bg-stone-50 rounded-md border border-stone-100 flex items-center gap-1">
                           <Check size={10} className="text-[#34A853]" /> VERIFIED
                        </span>
                     </div>
                     
                     <div className="p-5 flex-1 flex flex-col z-10">
                        <h3 className="font-serif font-medium text-lg text-[#1a1a1a] mb-2 line-clamp-1 group-hover:text-[#34A853] transition-colors">
                            {skill.name}
                        </h3>
                        
                        <p className="text-sm text-stone-500 leading-relaxed line-clamp-3 mb-4 flex-1">
                            {stripMarkdown(parseSkillDescription(skill.description))}
                        </p>
                        
                        <div className="pt-4 border-t border-stone-100 flex items-center gap-2 text-xs font-medium text-[#34A853] opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                            ACCESS MODULE <Box size={12} />
                        </div>
                     </div>
                     
                     {/* Background Tech Decoration */}
                     <div className="absolute -bottom-6 -right-6 text-stone-50 opacity-50 group-hover:opacity-100 group-hover:text-green-50/50 transition-all duration-500 transform -rotate-12 scale-150 pointer-events-none z-0">
                        <Database size={120} strokeWidth={1} />
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
                <Box className="text-[#34A853]" size={20} />
                <span className="font-mono text-sm tracking-wide">{selectedSkill?.name}</span>
            </div>
        }
        className="max-w-5xl h-[85vh]"
      >
         {selectedSkill && (
            <div className="flex flex-col h-full bg-[#FAF9F6]">
               {/* Modal Header Actions */}
               <div className="bg-white px-6 py-3 border-b border-stone-200 flex flex-wrap gap-4 justify-between items-center shrink-0">
                  <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
                     <div className="px-2 py-1 bg-[#34A853]/10 text-[#34A853] rounded border border-[#34A853]/20 flex items-center gap-1">
                         <Check size={10} /> ACTIVE
                     </div>
                     <span className="text-stone-300">|</span>
                     <span>MODULE_ID: {selectedSkill.name.toUpperCase()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <button 
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                     >
                        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        {copied ? "Copied" : "Copy Code"}
                     </button>
                     <button 
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                     >
                        <Trash2 size={14} />
                        Delete
                     </button>
                  </div>
               </div>

               <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                    {/* Left: Description */}
                    <div className="w-full lg:w-1/3 p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-stone-200 bg-white">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-4 flex items-center gap-2">
                            <Sparkles size={12} className="text-[#34A853]" /> Module Documentation
                        </h3>
                        <div className="text-stone-700 text-sm leading-relaxed font-sans markdown-content">
                            <ReactMarkdown
                                components={{
                                    h1: ({children}) => <h1 className="text-lg font-bold text-[#1a1a1a] mb-2 mt-4 first:mt-0">{children}</h1>,
                                    h2: ({children}) => <h2 className="text-base font-bold text-[#1a1a1a] mb-2 mt-3">{children}</h2>,
                                    p: ({children}) => <p className="mb-3 text-stone-600">{children}</p>,
                                    ul: ({children}) => <ul className="list-disc pl-4 mb-3 space-y-1 text-stone-600">{children}</ul>,
                                    li: ({children}) => <li className="pl-1">{children}</li>,
                                    code: ({children}) => <code className="bg-stone-100 px-1 py-0.5 rounded text-xs font-mono text-[#D95757]">{children}</code>
                                }}
                            >
                                {parseSkillDescription(selectedSkill.description)}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Right: Code */}
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