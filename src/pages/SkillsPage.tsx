import { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, Check, X, Wand2, Code, Sparkles, Send, Play, 
  Terminal, Save, RefreshCw, GitPullRequest, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '../components/Toast';
import { SkillApprovalFlow } from '../components/SkillApprovalFlow';
import Modal from '../components/Modal';

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
    <div className="h-full bg-[#FAF9F6] flex flex-col overflow-hidden">
      
      {/* --- Header --- */}
      <div className="px-6 py-6 border-b border-stone-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
         <div>
            <h1 className="text-2xl font-serif font-medium text-[#1a1a1a] flex items-center gap-3">
              <GitPullRequest className="text-amber-500" size={24} strokeWidth={2} />
              Pending Skills
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Review, refine, and approve new capabilities
            </p>
         </div>
      </div>

      {/* --- Grid Content --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-stone-400">
               <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                  <Briefcase size={24} className="opacity-40" />
               </div>
               <p className="text-lg font-serif">
                  No pending skills awaiting review
               </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {skills.map(skill => (
                  <motion.div
                    key={skill.id}
                    layoutId={`card-${skill.id}`}
                    whileHover={{ y: -2 }}
                    onClick={() => setSelectedSkill(skill)}
                    className="bg-white rounded-xl p-5 border border-stone-100 shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all cursor-pointer group flex flex-col h-[220px]"
                  >
                     <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                           <Code size={18} />
                        </div>
                        {skill.notes && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 px-2 py-1 bg-amber-50 rounded-md border border-amber-100 uppercase tracking-wide">
                                <AlertCircle size={10} /> Needs Review
                            </span>
                        )}
                     </div>
                     
                     <h3 className="font-serif font-medium text-lg text-[#1a1a1a] mb-2 line-clamp-1 group-hover:text-amber-600 transition-colors">
                        {skill.name}
                     </h3>
                     
                     <p className="text-sm text-stone-500 leading-relaxed line-clamp-3 mb-4 flex-1">
                        {skill.description}
                     </p>
                     
                     <div className="flex items-center gap-2 text-xs font-medium text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity mt-auto">
                        Review Skill <GitPullRequest size={12} />
                     </div>
                  </motion.div>
               ))}
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
                <span>Review: {selectedSkill?.name}</span>
            </div>
        }
        className="max-w-6xl h-[90vh]"
      >
         {selectedSkill && (
            isApproving ? (
                <div className="p-6 h-full">
                    <SkillApprovalFlow 
                        skillId={selectedSkill.id}
                        apiEndpoint={apiEndpoint}
                        onComplete={handleApprovalComplete}
                        onCancel={() => setIsApproving(false)}
                    />
                </div>
            ) : (
                <div className="flex flex-col h-full bg-[#FAF9F6]">
                   {/* Actions Header */}
                   <div className="bg-white px-6 py-4 border-b border-stone-200 flex flex-wrap gap-4 justify-between items-center shrink-0">
                      <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
                         ID: {selectedSkill.id}
                      </div>
                      
                      <div className="flex items-center gap-3">
                         <button 
                            onClick={handleDelete}
                            className="px-4 py-2 bg-white text-red-600 border border-red-100 hover:bg-red-50 hover:border-red-200 rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                          >
                            <X size={16} /> Reject
                          </button>
                          <button 
                            onClick={handleApprove}
                            className="px-4 py-2 bg-[#1a1a1a] text-white hover:bg-black rounded-lg text-sm font-medium transition-all shadow-md active:scale-95 flex items-center gap-2"
                          >
                            <Check size={16} /> Approve & Save
                          </button>
                      </div>
                   </div>
    
                   {/* Main Content: Split View for Desktop, Stack for Mobile */}
                   <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                        
                        {/* Left Pane: Code Editor */}
                        <div className="flex-1 flex flex-col border-r border-stone-200 bg-[#1e1e1e] min-w-0 min-h-[400px] lg:min-h-0">
                            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5 text-stone-400 shrink-0">
                                <div className="flex items-center gap-2 text-xs font-mono">
                                    <Code size={14} />
                                    <span>implementation.py</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     {isEditing ? (
                                        <button 
                                            onClick={handleSaveCode}
                                            disabled={isSaving}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-xs uppercase font-bold tracking-wide transition-colors"
                                        >
                                            {isSaving ? <RefreshCw size={12} className="animate-spin"/> : <Save size={12} />}
                                            Save
                                        </button>
                                     ) : (
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="px-2 py-1 hover:bg-white/10 rounded text-xs uppercase font-bold tracking-wide transition-colors"
                                        >
                                            Edit
                                        </button>
                                     )}
                                </div>
                            </div>
                            
                            <div className="flex-1 relative overflow-auto custom-scrollbar">
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
                                                fontSize: '14px',
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
                        <div className="w-full lg:w-[400px] bg-white flex flex-col border-l border-stone-200 lg:h-full overflow-y-auto custom-scrollbar">
                            <div className="p-6 flex flex-col gap-8">
                                
                                {/* Description */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-2">
                                        <Sparkles size={12} /> Context
                                    </h3>
                                    <p className="text-stone-600 text-sm leading-relaxed font-sans bg-stone-50 p-3 rounded-lg border border-stone-100">
                                        {selectedSkill.description}
                                    </p>
                                </div>
    
                                {/* Refinement Tool */}
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-2">
                                        <Wand2 size={12} /> Refine with AI
                                    </h3>
                                    <div className="bg-white rounded-xl border border-stone-200 shadow-sm focus-within:ring-2 focus-within:ring-black/5 transition-shadow overflow-hidden">
                                        <textarea
                                            value={refineInstruction}
                                            onChange={e => setRefineInstruction(e.target.value)}
                                            placeholder="Instructions (e.g., 'Add error handling')..."
                                            className="w-full px-4 py-3 bg-transparent border-none focus:outline-none text-sm placeholder:text-stone-400 resize-none h-20"
                                        />
                                        <div className="bg-stone-50 px-3 py-2 border-t border-stone-100 flex justify-end">
                                            <button
                                                onClick={handleRefine}
                                                disabled={isRefining || !refineInstruction.trim()}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                            >
                                                {isRefining ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                                                Refine
                                            </button>
                                        </div>
                                    </div>
                                </div>
    
                                {/* Test & Output */}
                                <div className="flex-1 flex flex-col">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                                            <Terminal size={12} /> Sandbox Output
                                        </h3>
                                        <button
                                            onClick={handleTest}
                                            disabled={isTesting}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            {isTesting ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                                            Run Test
                                        </button>
                                    </div>
                                    <div className="bg-[#1a1a1a] rounded-xl border border-stone-200 p-4 min-h-[150px] max-h-[300px] overflow-auto custom-scrollbar">
                                        {testOutput ? (
                                            <pre className="text-xs font-mono text-stone-300 whitespace-pre-wrap break-all">{testOutput}</pre>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-stone-600 gap-2 min-h-[100px]">
                                                <Terminal size={24} className="opacity-20" />
                                                <span className="text-xs font-mono opacity-50">Ready to execute</span>
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