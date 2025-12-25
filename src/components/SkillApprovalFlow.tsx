import React, { useState, useEffect, useRef } from 'react';
import { Terminal, CheckCircle2, Loader2, XCircle, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface LogEvent {
  stage: string;    // PLANNING, TESTING, REFINING, COMPLETED, FAILED
  type: string;     // STEP_START, LOG, ERROR
  content: string;
  timestamp: number;
}

interface SkillApprovalFlowProps {
  skillId: string;
  apiEndpoint: string;
  onComplete: () => void;
  onCancel: () => void;
}

export const SkillApprovalFlow: React.FC<SkillApprovalFlowProps> = ({ 
  skillId, 
  apiEndpoint, 
  onComplete,
  onCancel
}) => {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [currentStage, setCurrentStage] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleApprove = async () => {
    console.log(`[SkillApproval] Starting approval for skill: ${skillId} at ${apiEndpoint}`);
    setLogs([]);
    setStatus('running');
    
    try {
      console.log(`[SkillApproval] Sending POST to ${apiEndpoint}/skills/pending/${skillId}/approve`);
      const res = await fetch(`${apiEndpoint}/skills/pending/${skillId}/approve`, {
        method: "POST",
      });
      
      console.log(`[SkillApproval] Response status: ${res.status}`);
      if (!res.ok) {
          const text = await res.text();
          console.error(`[SkillApproval] Request failed: ${text}`);
          throw new Error(`Failed to start approval job: ${res.status} ${text}`);
      }
      
      const data = await res.json();
      console.log(`[SkillApproval] Job started, data:`, data);
      const { job_id } = data;
      
      if (!job_id) {
          console.error("[SkillApproval] No job_id returned!");
          throw new Error("No job_id returned from backend");
      }

      console.log(`[SkillApproval] Connecting to SSE: ${apiEndpoint}/jobs/${job_id}/stream`);
      const eventSource = new EventSource(`${apiEndpoint}/jobs/${job_id}/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        console.log(`[SkillApproval] SSE Message:`, event.data);
        const data: LogEvent = JSON.parse(event.data);
        
        setLogs((prev) => [...prev, data]);
        setCurrentStage(data.stage);

        if (data.stage === 'COMPLETED' && data.type === 'STEP_COMPLETE') {
          console.log("[SkillApproval] Job Completed Successfully");
          setStatus('success');
          eventSource.close();
          // Removed timeout: User must explicitly click "Done"
        } else if (data.stage === 'FAILED' || data.type === 'ERROR') {
          console.error("[SkillApproval] Job Failed");
          setStatus('error');
          eventSource.close();
        }
      };

      eventSource.onerror = (err) => {
        console.error("[SkillApproval] Stream connection failed/error", err);
        if (eventSource.readyState === EventSource.CLOSED) {
             console.log("[SkillApproval] SSE Closed.");
             eventSource.close();
             if (status !== 'success') setStatus('error');
        }
      };
      
      eventSource.onopen = () => {
          console.log("[SkillApproval] SSE Connected!");
      };

    } catch (e) {
      console.error("[SkillApproval] Exception caught:", e);
      setStatus('error');
    }
  };

  // Trigger start immediately when mounted (as requested by context of modal)
  useEffect(() => {
      if (status === 'idle') {
          handleApprove();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = (stage: string, type: string) => {
    if (type === 'ERROR') return 'text-red-400';
    if (stage === 'REFINING') return 'text-yellow-400';
    if (stage === 'TESTING') return 'text-blue-400';
    if (stage === 'COMPLETED') return 'text-green-400';
    return 'text-gray-300';
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] overflow-hidden shadow-2xl relative">
      {/* Header - GitHub Style */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#161b22] border-b border-[#30363d] shrink-0">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${
            status === 'running' ? 'bg-blue-500/10 text-blue-400' :
            status === 'success' ? 'bg-green-500/10 text-green-400' :
            status === 'error' ? 'bg-red-500/10 text-red-400' :
            'bg-gray-500/10 text-gray-400'
          }`}>
            {status === 'running' ? <Loader2 size={24} className="animate-spin" /> :
             status === 'success' ? <CheckCircle2 size={24} /> :
             status === 'error' ? <XCircle size={24} /> :
             <Terminal size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#e6edf3] tracking-tight">
              {status === 'idle' ? 'Initializing...' : 
               status === 'running' ? `Running Verification: ${currentStage}` :
               status === 'success' ? 'Skill Verified & Saved' : 'Verification Failed'}
            </h3>
            <p className="text-xs text-[#7d8590] font-mono uppercase tracking-widest mt-1">
              Job ID: {skillId.split('-')[0]}
            </p>
          </div>
        </div>
        
        {/* Close Button (Top Right) */}
        {status !== 'running' && (
            <button 
                onClick={status === 'success' ? onComplete : onCancel}
                className="text-[#7d8590] hover:text-[#e6edf3] transition-colors p-2 hover:bg-[#30363d] rounded-lg"
            >
                <X size={20} />
            </button>
        )}
      </div>

      {/* Logs Terminal */}
      <div 
        ref={scrollRef}
        className="flex-1 p-6 font-mono text-sm overflow-y-auto custom-scrollbar bg-[#0d1117] dot-grid min-h-[400px]"
      >
        <div className="space-y-2">
          {logs.map((log, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              key={idx} 
              className="flex gap-4 group items-start"
            >
              <span className="text-[#484f58] select-none w-20 shrink-0 text-right opacity-50 font-normal text-xs pt-0.5">
                {new Date(log.timestamp * 1000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`shrink-0 font-bold uppercase text-xs pt-0.5 w-24 ${getStatusColor(log.stage, log.type)}`}>
                {log.stage}
              </span>
              <span className="text-[#c9d1d9] break-all whitespace-pre-wrap leading-relaxed flex-1">
                {log.content}
              </span>
            </motion.div>
          ))}
          {status === 'running' && (
            <div className="flex gap-4 items-center text-[#c9d1d9] animate-pulse mt-4">
               <span className="text-[#484f58] w-20 shrink-0" />
               <span className="w-2 h-5 bg-[#30363d] rounded-sm" />
            </div>
          )}
        </div>
      </div>

      {/* Footer Status / Actions */}
      <div className="p-6 bg-[#161b22] border-t border-[#30363d] flex justify-end shrink-0">
          {status === 'running' && (
              <div className="flex items-center gap-3 text-[#7d8590] text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Processing skill verification pipeline...
              </div>
          )}
          {status === 'success' && (
              <button 
                onClick={onComplete}
                className="bg-[#238636] hover:bg-[#2ea043] text-white px-6 py-2 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-[#238636]/20 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                Done & Save
              </button>
          )}
          {status === 'error' && (
              <button 
                onClick={onCancel}
                className="bg-[#da3633]/10 hover:bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/30 px-6 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                Close
              </button>
          )}
      </div>
    </div>
  );
};
