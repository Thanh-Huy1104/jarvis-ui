import { useState } from 'react';
import { Reveal } from '../components/Reveal';
import { Play, Terminal, FlaskConical, Code, Copy, Check, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../components/Toast';

interface SandboxPageProps {
  apiEndpoint: string;
}

export default function SandboxPage({ apiEndpoint }: SandboxPageProps) {
  const [code, setCode] = useState('import numpy as np\n\n# Create a random array and calculate its mean\narr = np.random.rand(5)\nprint(f"Random Array: {arr}\n")\nprint(f"Mean: {np.mean(arr)}")');
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleRun = async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setOutput(null);
    try {
      const res = await fetch(`${apiEndpoint}/sandbox/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setOutput(data.output || "Code executed successfully with no output.");
        showToast("Execution complete", "success");
      } else {
        setOutput(data.detail || data.error || "Execution failed.");
        showToast("Execution failed", "error");
      }
    } catch (error) {
      console.error("Sandbox execution error:", error);
      showToast("Network error", "error");
      setOutput("Network error connecting to sandbox.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (confirm("Clear code editor?")) {
        setCode('');
        setOutput(null);
    }
  };

  return (
    <div className="min-h-full p-8 bg-[#FAF9F6] pt-12 overflow-y-auto custom-scrollbar">
      <header className="mb-12 max-w-5xl mx-auto pl-2">
        <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-stone-100 rounded-xl text-stone-600">
                <FlaskConical size={24} />
            </div>
            <h1 className="text-4xl font-serif font-medium tracking-tight text-[#1a1a1a]">Code Sandbox</h1>
        </div>
        <p className="text-stone-500 font-sans text-lg">Experiment with arbitrary Python code in a secure, isolated environment.</p>
      </header>

      <main className="max-w-5xl mx-auto space-y-8 pb-20">
        <Reveal>
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            {/* Toolbar */}
            <div className="px-6 py-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Code size={16} className="text-stone-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Python 3.x</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleClear}
                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Clear editor"
                    >
                        <Trash2 size={18} />
                    </button>
                    <button 
                        onClick={handleCopy}
                        className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Copy code"
                    >
                        {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                    <button 
                        onClick={handleRun}
                        disabled={isRunning || !code.trim()}
                        className="ml-2 flex items-center gap-2 px-6 py-2 bg-[#1a1a1a] text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:bg-stone-200 transition-all active:scale-95"
                    >
                        {isRunning ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/> : <Play size={16} fill="currentColor" />}
                        {isRunning ? 'Running...' : 'Run Code'}
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 relative group">
                <textarea 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-full min-h-[300px] p-6 font-mono text-sm bg-transparent border-none focus:outline-none resize-none text-stone-800 placeholder:text-stone-300"
                    placeholder="Write your Python code here..."
                    spellCheck={false}
                />
            </div>
          </div>
        </Reveal>

        <AnimatePresence>
            {output !== null && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="space-y-4"
                >
                    <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 px-2 flex items-center gap-2">
                        <Terminal size={14} /> Output
                    </h3>
                    <div className="bg-[#1e1e1e] rounded-2xl border border-stone-800 shadow-xl overflow-hidden">
                        <div className="px-4 py-2 bg-[#2d2d2d] border-b border-white/5 flex justify-between items-center">
                             <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40"></div>
                            </div>
                            <button 
                                onClick={() => setOutput(null)}
                                className="text-stone-500 hover:text-stone-300 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-6 font-mono text-sm text-stone-300 whitespace-pre-wrap max-h-[400px] overflow-y-auto custom-scrollbar">
                            {output || <span className="text-stone-600 italic">No output produced.</span>}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="bg-stone-100/50 rounded-2xl p-6 border border-stone-200/50">
            <h4 className="text-sm font-bold text-stone-600 mb-2">Did you know?</h4>
            <p className="text-sm text-stone-500 leading-relaxed">
                The sandbox automatically detects imports and installs missing packages from PyPI before execution. 
                Your code runs in a temporary Docker container that is destroyed immediately after execution.
            </p>
        </div>
      </main>
    </div>
  );
}
