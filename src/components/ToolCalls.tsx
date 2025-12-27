import { motion } from 'framer-motion';
import { Wrench, ChevronRight, Code } from 'lucide-react';

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

interface ToolCallsProps {
  tools: ToolCall[];
}

export default function ToolCalls({ tools }: ToolCallsProps) {
  if (!tools || tools.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm"
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 border-b border-stone-100">
        <Wrench size={14} className="text-stone-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Tool Executions</h3>
      </div>
      
      <div className="divide-y divide-stone-100">
        {tools.map((tool, index) => (
          <div key={`${tool.name}-${index}`} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-orange-50 flex items-center justify-center">
                <Code size={12} className="text-orange-600" />
              </div>
              <span className="font-mono text-sm font-bold text-stone-800">{tool.name}</span>
            </div>
            
            <div className="pl-8">
              <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                <div className="flex items-start gap-2">
                  <ChevronRight size={14} className="mt-1 text-stone-400 flex-shrink-0" />
                  <div className="space-y-2 w-full">
                    {Object.entries(tool.args).map(([key, value]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                        <span className="text-[11px] font-bold font-mono text-stone-400 uppercase w-24 flex-shrink-0">{key}</span>
                        <span className="text-xs font-mono text-stone-600 break-all bg-white px-2 py-0.5 rounded border border-stone-200/50">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
