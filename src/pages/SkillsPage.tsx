import { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, Check, X, Wand2, Code, Sparkles, Send, Play, 
  Terminal, Save, RefreshCw, GitPullRequest, AlertCircle, 
  Cpu, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '../components/Toast';
import { SkillApprovalFlow } from '../components/SkillApprovalFlow';
import Modal from '../components/Modal';
import BackgroundGrid from '../components/BackgroundGrid';

// --- Types ---
interface PendingSkill {
  id: string;
  name: string;
  description: string;
  code: string;
  dependencies: string[];
  created_at?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

interface SkillsPageProps {
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
  // Remove headers
  let text = markdown.replace(/^#+\s+/gm, '');
  // Remove bold/italic
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  // Remove links
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  return text.trim();
};

export default function SkillsPage({ apiEndpoint }: SkillsPageProps) {
  const [skills, setSkills] = useState<PendingSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<PendingSkill | null>(null);
  
  // Editor State
  const [editedCode, setEditedCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Actions State
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  
  const { showToast } = useToast();

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch(`${apiEndpoint}/skills/pending`);
      if (res.ok) {
        const data = await res.json();
        const skillsList = Array.isArray(data) ? data : data.skills || [];
        setSkills(skillsList);
      }
    } catch (error) {
      console.error("Failed to fetch skills:", error);
      showToast("Failed to load skills", "error");
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, showToast]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Sync edited code when selection changes
  useEffect(() => {
    if (selectedSkill) {
      setEditedCode(selectedSkill.code);
      setTestOutput(null);
      setRefineInstruction('');
      setIsEditing(false);
      setIsApproving(false);
    }
  }, [selectedSkill]);

  const handleSaveCode = async () => {
    if (!selectedSkill) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${apiEndpoint}/skills/pending/${selectedSkill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editedCode }),
      });
      
      if (res.ok) {
        showToast("Code changes saved", "success");
        // Update local state
        const updatedSkill = { ...selectedSkill, code: editedCode };
        setSelectedSkill(updatedSkill);
        setSkills(prev => prev.map(s => s.id === updatedSkill.id ? updatedSkill : s));
        setIsEditing(false);
      } else {
        showToast("Failed to save changes", "error");
      }
    } catch (error) {
      console.error("Error saving code:", error);
      showToast("Network error saving changes", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = () => {
    if (!selectedSkill) return;
    setIsApproving(true);
  };

  const handleApprovalComplete = () => {
    if (selectedSkill) {
        setSkills(prev => prev.filter(s => s.id !== selectedSkill.id));
        setSelectedSkill(null);
        setIsApproving(false);
        showToast("Skill approved and saved to library", "success");
    }
  };

  const handleDelete = async () => {
    if (!selectedSkill || !confirm("Are you sure you want to delete this skill?")) return;
    try {
      const res = await fetch(`${apiEndpoint}/skills/pending/${selectedSkill.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSkills(prev => prev.filter(s => s.id !== selectedSkill.id));
        setSelectedSkill(null);
        showToast("Skill rejected and deleted", "info");
      } else {
        showToast("Failed to delete skill", "error");
      }
    } catch (error) {
      console.error("Error deleting skill:", error);
      showToast("Network error deleting skill", "error");
    }
  };

  const handleRefine = async () => {
    if (!selectedSkill || !refineInstruction.trim()) return;
    setIsRefining(true);
    try {
      const res = await fetch(`${apiEndpoint}/skills/pending/${selectedSkill.id}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: refineInstruction }),
      });
      if (res.ok) {
        const data = await res.json();
        setEditedCode(data.code); // Update editor directly
        setRefineInstruction('');
        showToast("Code refined. Review and save.", "success");
        setIsEditing(true); // Switch to edit mode so they can see/save
      } else {
        showToast("Refinement failed", "error");
      }
    } catch (error) {
      console.error("Error refining skill:", error);
      showToast("Network error during refinement", "error");
    } finally {
      setIsRefining(false);
    }
  };

  const handleTest = async () => {
    if (!selectedSkill) return;
    setIsTesting(true);
    setTestOutput(null);
    try {
      if (isEditing) {
          await handleSaveCode();
      }

      const res = await fetch(`${apiEndpoint}/skills/pending/${selectedSkill.id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setTestOutput(data.output || "Skill executed successfully with no output.");
        showToast("Skill test completed", "success");
      } else {
        setTestOutput(data.detail || data.error || "Execution failed.");
        showToast("Skill test failed", "error");
      }
    } catch (error) {
      console.error("Error testing skill:", error);
      showToast("Network error during testing", "error");
      setTestOutput("Network error connecting to sandbox.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="h-full bg-[#FAF9F6] flex flex-col overflow-hidden relative">
      <BackgroundGrid />
      
      {/* --- Header --- */}
      <div className="relative z-10 px-6 py-6 border-b border-stone-200/50 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
         <div>
            <h1 className="text-2xl font-serif font-medium text-[#1a1a1a] flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <GitPullRequest className="text-amber-600" size={24} strokeWidth={2} />
              </div>
              Pending Skills
            </h1>
            <p className="text-sm text-stone-500 mt-1 pl-14">
              Review and validate incoming capabilities
            </p>
         </div>
         
         <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-amber-50 border border-amber-100 rounded-full flex items-center gap-2 text-xs font-medium text-amber-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                {skills.length} Pending Review
            </div>
         </div>
      </div>

      {/* --- Grid Content --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 relative z-10">
          {loading ? (
            <div className="flex justify-center items-center h-40">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
               <div className="w-20 h-20 bg-white border border-stone-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                  <Briefcase size={32} className="opacity-20" />
               </div>
               <p className="text-lg font-serif opacity-60">
                  All systems clear. No pending skills.
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               <AnimatePresence>
               {skills.map(skill => (
                  <motion.div
                    key={skill.id}
                    layoutId={`card-${skill.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setSelectedSkill(skill)}
                    className="bg-white/80 backdrop-blur-md rounded-2xl p-0 border border-stone-200/60 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-500/40 transition-all cursor-pointer group flex flex-col h-[260px] relative overflow-hidden"
                  >
                     {/* Decorative Top Bar */}
                     <div className="h-1 w-full bg-gradient-to-r from-amber-500/40 to-transparent absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity" />

                     {/* Header Section */}
                     <div className="p-5 pb-0 flex justify-between items-start z-10">
                        <div className="p-2.5 bg-gradient-to-br from-amber-50 to-white border border-amber-100/50 text-amber-600 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-300">
                           <Code size={20} strokeWidth={2} />
                        </div>
                        {skill.notes && (
                            <span className="animate-pulse flex items-center gap-1.5 text-[10px] font-bold text-amber-600 px-2.5 py-1 bg-amber-50 rounded-full border border-amber-100 uppercase tracking-wide">
                                <AlertCircle size={10} /> Needs Review
                            </span>
                        )}
                     </div>
                     
                     {/* Content Section */}
                     <div className="p-5 flex-1 flex flex-col z-10">
                         <h3 className="font-serif font-medium text-lg text-[#1a1a1a] mb-2 line-clamp-1 group-hover:text-amber-600 transition-colors">
                            {skill.name}
                         </h3>
                         
                         <p className="text-sm text-stone-500 leading-relaxed line-clamp-3 mb-4 flex-1">
                            {stripMarkdown(parseSkillDescription(skill.description))}
                         </p>

                         {/* Footer / Meta */}
                         <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400 font-mono">
                            <span className="flex items-center gap-1.5">
                                <Cpu size={12} />
                                <span>PYTHON</span>
                            </span>
                            <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600 font-medium">
                                INSPECT <GitPullRequest size={12} />
                            </span>
                         </div>
                     </div>

                     {/* Background Tech Decoration */}
                     <div className="absolute -bottom-6 -right-6 text-stone-50 opacity-50 group-hover:opacity-100 group-hover:text-amber-50/50 transition-all duration-500 transform rotate-12 scale-150 pointer-events-none z-0">
                        <Code size={120} strokeWidth={1} />
                     </div>
                  </motion.div>
               ))}
               </AnimatePresence>
            </div>
          )}
      </div>

      {/* --- Detail/Review Modal --- */}
      <Modal
        isOpen={!!selectedSkill}
        onClose={() => { if(!isApproving) setSelectedSkill(null); }}
        title={
            <div className="flex items-center gap-2">
                <GitPullRequest className="text-amber-500" size={20} />
                <span className="font-mono text-sm tracking-wide">PR: {selectedSkill?.name}</span>
            </div>
        }
        className="max-w-7xl h-[95vh]"
      >
         {selectedSkill && (
            isApproving ? (
                <div className="p-6 h-full bg-[#FAF9F6] relative overflow-hidden">
                    <BackgroundGrid />
                    <div className="relative z-10 h-full">
                        <SkillApprovalFlow 
                            skillId={selectedSkill.id}
                            apiEndpoint={apiEndpoint}
                            onComplete={handleApprovalComplete}
                            onCancel={() => setIsApproving(false)}
                        />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full bg-[#FAF9F6]">
                   {/* Actions Header */}
                   <div className="bg-white px-6 py-3 border-b border-stone-200 flex flex-wrap gap-4 justify-between items-center shrink-0">
                      <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
                         <div className="px-2 py-1 bg-stone-100 rounded text-stone-500">ID: {selectedSkill.id.substring(0,8)}...</div>
                         <div className="px-2 py-1 bg-amber-50 text-amber-600 rounded border border-amber-100 flex items-center gap-1">
                            <Activity size={10} /> Pending Verification
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <button 
                            onClick={handleDelete}
                            className="px-4 py-2 bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-lg text-xs uppercase font-bold tracking-wide transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                          >
                            <X size={14} /> Reject
                          </button>
                          <button 
                            onClick={handleApprove}
                            className="px-4 py-2 bg-[#1a1a1a] text-white hover:bg-black rounded-lg text-xs uppercase font-bold tracking-wide transition-all shadow-md active:scale-95 flex items-center gap-2"
                          >
                            <Check size={14} /> Approve & Save
                          </button>
                      </div>
                   </div>
    
                   {/* Main Content: Split View for Desktop, Stack for Mobile */}
                   <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                        
                        {/* Left Pane: Code Editor */}
                        <div className="flex-1 flex flex-col border-r border-stone-200 bg-[#1e1e1e] min-w-0 min-h-[400px] lg:min-h-0">
                            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-black/20 text-stone-400 shrink-0 select-none">
                                <div className="flex items-center gap-2 text-xs font-mono text-[#CCCCCC]">
                                    <Code size={14} className="text-[#34A853]" />
                                    <span>implementation.py</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     {isEditing ? (
                                        <button 
                                            onClick={handleSaveCode}
                                            disabled={isSaving}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-[#34A853]/20 text-[#34A853] hover:bg-[#34A853]/30 rounded text-[10px] uppercase font-bold tracking-wide transition-colors"
                                        >
                                            {isSaving ? <RefreshCw size={10} className="animate-spin"/> : <Save size={10} />}
                                            Save
                                        </button>
                                     ) : (
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="px-2 py-1 hover:bg-white/10 rounded text-[10px] uppercase font-bold tracking-wide transition-colors"
                                        >
                                            Edit
                                        </button>
                                     )}
                                </div>
                            </div>
                            
                            <div className="flex-1 relative overflow-auto no-scrollbar">
                                {isEditing ? (
                                    <textarea
                                        value={editedCode}
                                        onChange={(e) => setEditedCode(e.target.value)}
                                        className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] p-6 font-mono text-sm leading-relaxed resize-none focus:outline-none"
                                        spellCheck={false}
                                    />
                                ) : (
                                    <div className="absolute inset-0">
                                        <SyntaxHighlighter
                                            style={vscDarkPlus}
                                            language="python"
                                            showLineNumbers={true}
                                            wrapLines={true}
                                            customStyle={{
                                                margin: 0,
                                                padding: '1.5rem',
                                                height: '100%',
                                                background: 'transparent',
                                                fontSize: '13px',
                                                lineHeight: '1.6',
                                            }}
                                        >
                                            {editedCode}
                                        </SyntaxHighlighter>
                                    </div>
                                )}
                            </div>
                        </div>
    
                        {/* Right Pane: Tools */}
                        <div className="w-full lg:w-[450px] bg-stone-50/50 backdrop-blur-sm flex flex-col border-l border-stone-200 lg:h-full overflow-y-auto no-scrollbar">
                            <div className="p-6 flex flex-col gap-8">
                                
                                {/* Description */}
                                <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-4 flex items-center gap-2">
                                        <Sparkles size={12} className="text-amber-500" /> Skill Context
                                    </h3>
                                    <div className="text-stone-700 text-sm leading-relaxed font-sans markdown-content">
                                        <ReactMarkdown
                                            components={{
                                                h1: ({children}) => <h1 className="text-base font-bold text-[#1a1a1a] mb-2">{children}</h1>,
                                                h2: ({children}) => <h2 className="text-sm font-bold text-[#1a1a1a] mb-1 mt-2">{children}</h2>,
                                                p: ({children}) => <p className="mb-2 text-stone-600 text-xs leading-5">{children}</p>,
                                                ul: ({children}) => <ul className="list-disc pl-4 mb-2 text-xs text-stone-600">{children}</ul>,
                                                li: ({children}) => <li className="pl-1 mb-1">{children}</li>,
                                                code: ({children}) => <code className="bg-stone-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                                            }}
                                        >
                                            {parseSkillDescription(selectedSkill.description)}
                                        </ReactMarkdown>
                                    </div>
                                </div>
    
                                {/* Refinement Tool */}
                                <div>
                                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-2">
                                        <Wand2 size={12} /> Refine with AI
                                    </h3>
                                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm focus-within:ring-2 focus-within:ring-black/5 transition-shadow overflow-hidden group">
                                        <textarea
                                            value={refineInstruction}
                                            onChange={e => setRefineInstruction(e.target.value)}
                                            placeholder="Enter instructions to refine the code..."
                                            className="w-full px-4 py-3 bg-transparent border-none focus:outline-none text-sm placeholder:text-stone-400 resize-none h-24"
                                        />
                                        <div className="bg-stone-50 px-3 py-2 border-t border-stone-100 flex justify-between items-center">
                                            <span className="text-[10px] text-stone-400 font-medium px-1">AI ASSISTANT READY</span>
                                            <button
                                                onClick={handleRefine}
                                                disabled={isRefining || !refineInstruction.trim()}
                                                className="flex items-center gap-2 px-4 py-1.5 bg-[#1a1a1a] hover:bg-black text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm active:scale-95"
                                            >
                                                {isRefining ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                                Refine Code
                                            </button>
                                        </div>
                                    </div>
                                </div>
    
                                {/* Test & Output */}
                                <div className="flex-1 flex flex-col">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                                            <Terminal size={12} /> Sandbox Output
                                        </h3>
                                        <button
                                            onClick={handleTest}
                                            disabled={isTesting}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-lg text-[10px] uppercase font-bold tracking-wide transition-colors shadow-sm"
                                        >
                                            {isTesting ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                                            Run Test
                                        </button>
                                    </div>
                                    <div className="bg-[#1a1a1a] rounded-xl border border-stone-200 p-4 min-h-[150px] max-h-[300px] overflow-auto no-scrollbar font-mono text-xs shadow-inner relative">
                                        {/* CRT Line Effect */}
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none opacity-20" style={{backgroundSize: "100% 2px, 3px 100%"}}></div>
                                        
                                        {testOutput ? (
                                            <pre className="text-stone-300 whitespace-pre-wrap break-all relative z-0">{testOutput}</pre>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-stone-600 gap-2 min-h-[100px] relative z-0">
                                                <Terminal size={24} className="opacity-20" />
                                                <span className="opacity-50">Waiting for execution...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                   </div>
                </div>
            )
         )}
      </Modal>
    </div>
  );
}