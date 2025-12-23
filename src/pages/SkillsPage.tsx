import { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, Check, X, Wand2, Code, Sparkles, Send, Play, 
  Terminal, Save, AlertCircle, RefreshCw, ChevronRight, Box
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '../components/Toast';

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

  const handleApprove = async () => {
    if (!selectedSkill) return;
    try {
      const res = await fetch(`${apiEndpoint}/skills/pending/${selectedSkill.id}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        setSkills(prev => prev.filter(s => s.id !== selectedSkill.id));
        setSelectedSkill(null);
        showToast("Skill approved and saved to library", "success");
      } else {
        const data = await res.json();
        setTestOutput(`Approval Failed:\n${data.error || 'Unknown error'}\n\nOutput:\n${data.output || ''}`);
        showToast("Verification failed. Check output.", "error");
      }
    } catch (error) {
      console.error("Error approving skill:", error);
      showToast("Network error approving skill", "error");
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
      // We test the *edited* code if there are pending changes, or the saved code?
      // Usually better to test the SAVED code to ensure consistency, 
      // OR we send the code in the body. The current API might only run saved code.
      // Let's assume we need to save first or the API runs saved code.
      // If we want to test 'dirty' code, we'd need a different endpoint or update first.
      // For safety/simplicity, let's warn if dirty, or auto-save.
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
    <div className="h-full bg-[#FAF9F6] flex overflow-hidden">
      {/* --- Sidebar: Skill List --- */}
      <div className="w-80 flex-shrink-0 border-r border-stone-200 bg-white flex flex-col z-10">
        <div className="p-6 border-b border-stone-100">
          <h1 className="text-xl font-serif font-medium text-[#1a1a1a] flex items-center gap-2">
            <Briefcase className="text-stone-400" size={20} />
            Pending Skills
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            {skills.length} {skills.length === 1 ? 'skill' : 'skills'} awaiting review
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center p-8">
               <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-stone-300"></div>
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center p-8 text-stone-400 text-sm">
              No pending skills found.
            </div>
          ) : (
            skills.map((skill) => (
              <motion.button
                key={skill.id}
                layoutId={skill.id}
                onClick={() => setSelectedSkill(skill)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${selectedSkill?.id === skill.id
                    ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-lg'
                    : 'bg-white border-stone-100 hover:border-stone-300 hover:shadow-md text-stone-600'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-medium text-sm line-clamp-1 ${selectedSkill?.id === skill.id ? 'text-white' : 'text-[#1a1a1a]'}`}>
                    {skill.name}
                  </h3>
                  {selectedSkill?.id === skill.id && <ChevronRight size={14} className="text-stone-400" />}
                </div>
                <p className={`text-xs line-clamp-2 ${selectedSkill?.id === skill.id ? 'text-stone-400' : 'text-stone-400'}`}>
                  {skill.description}
                </p>
                {skill.notes && (
                    <div className={`mt-2 text-[10px] flex items-center gap-1 ${selectedSkill?.id === skill.id ? 'text-yellow-400/80' : 'text-amber-600/70'}`}>
                        <AlertCircle size={10} />
                        Needs Review
                    </div>
                )}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* --- Main Area: Workspace --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#FAF9F6]">
        {selectedSkill ? (
          <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="px-8 py-5 border-b border-stone-200 bg-white flex justify-between items-center shadow-sm">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-serif font-medium text-[#1a1a1a]">{selectedSkill.name}</h2>
                  <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-green-100">
                    Draft
                  </span>
                </div>
                <div className="text-xs font-mono text-stone-400 mt-1 flex items-center gap-2">
                    <Box size={12} />
                    {selectedSkill.id}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                 <button 
                    onClick={handleDelete}
                    className="px-4 py-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <X size={16} /> Reject
                  </button>
                  <div className="h-6 w-px bg-stone-200 mx-1" />
                  <button 
                    onClick={handleApprove}
                    className="px-5 py-2 bg-[#1a1a1a] text-white hover:bg-black rounded-lg text-sm font-medium transition-all shadow-lg shadow-black/10 hover:shadow-xl flex items-center gap-2"
                  >
                    <Check size={16} /> Approve & Save
                  </button>
              </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                
                {/* Left Pane: Code Editor */}
                <div className="flex-1 flex flex-col border-r border-stone-200 bg-[#1e1e1e] min-w-0">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5 text-stone-400">
                        <div className="flex items-center gap-2 text-xs font-mono">
                            <Code size={14} />
                            <span>implementation.py</span>
                        </div>
                        <div className="flex items-center gap-2">
                             {isEditing ? (
                                <button 
                                    onClick={handleSaveCode}
                                    disabled={isSaving}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-[10px] uppercase font-bold tracking-wide transition-colors"
                                >
                                    {isSaving ? <RefreshCw size={10} className="animate-spin"/> : <Save size={10} />}
                                    Save Changes
                                </button>
                             ) : (
                                <button 
                                    onClick={() => setIsEditing(true)}
                                    className="text-[10px] uppercase font-bold tracking-wide hover:text-white transition-colors"
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

                {/* Right Pane: Tools & Context */}
                <div className="w-full md:w-[400px] bg-white flex flex-col border-l border-stone-200">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                        
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
                                        Refine Code
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Test & Output */}
                        <div className="flex-1 flex flex-col min-h-0">
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
                            <div className="flex-1 bg-[#1a1a1a] rounded-xl border border-stone-200 p-4 min-h-[200px] overflow-auto custom-scrollbar">
                                {testOutput ? (
                                    <pre className="text-xs font-mono text-stone-300 whitespace-pre-wrap">{testOutput}</pre>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-stone-600 gap-2">
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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-300 p-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-stone-100">
                <Briefcase className="opacity-20 text-stone-600" size={32} strokeWidth={1} />
            </div>
            <p className="text-lg font-serif text-stone-400">Select a skill to review</p>
          </div>
        )}
      </div>
    </div>
  );
}
