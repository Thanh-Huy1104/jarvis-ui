import { useState } from 'react';
import { Wrench, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ToolCall {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Record<string, any>;
}

interface ToolCallsProps {
  tools: ToolCall[];
}

export default function ToolCalls({ tools }: ToolCallsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!tools || tools.length === 0) return null;

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="my-3 space-y-2 max-w-full">
      {tools.map((tool, index) => {
        const isExpanded = expandedIndex === index;
        const argValues = Object.entries(tool.args || {})
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? '...' : v}`)
          .join(' • ');

        return (
          <motion.div
            key={`${tool.name}-${index}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col"
          >
            {/* Pill Container */}
            <div 
                onClick={() => toggleExpand(index)}
                className={`
                    flex items-center gap-3 p-1.5 pl-3 pr-2 
                    bg-white dark:bg-[#1e1e1e] border border-stone-200 dark:border-white/10 
                    rounded-full shadow-sm hover:border-stone-300 dark:hover:border-white/20 
                    transition-all duration-200 cursor-pointer group select-none w-fit max-w-full
                    ${isExpanded ? 'border-stone-300 dark:border-white/20 ring-1 ring-stone-200 dark:ring-white/5' : ''}
                `}
            >
                {/* Icon & Name */}
                <div className="flex items-center gap-2 shrink-0">
                    <Wrench className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                    <span className="text-[11px] font-bold text-stone-700 dark:text-stone-200 uppercase tracking-wider">
                        {tool.name}
                    </span>
                </div>

                {/* Divider */}
                <div className="h-3 w-px bg-stone-200 dark:bg-white/10 shrink-0" />

                {/* Args Summary */}
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium truncate max-w-[200px] sm:max-w-[300px] font-mono">
                    {argValues || <span className="opacity-50">no args</span>}
                </span>

                {/* Status & Chevron */}
                <div className="flex items-center gap-1.5 ml-auto pl-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                    {isExpanded ? (
                        <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-stone-600 dark:text-stone-500 dark:group-hover:text-stone-300" />
                    ) : (
                        <ChevronRight className="w-3 h-3 text-stone-400 group-hover:text-stone-600 dark:text-stone-500 dark:group-hover:text-stone-300" />
                    )}
                </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden ml-2"
                >
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 text-xs font-mono text-stone-600 dark:text-stone-300 shadow-inner">
                    <pre className="whitespace-pre-wrap break-all leading-relaxed">
                        {JSON.stringify(tool.args, null, 2)}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
