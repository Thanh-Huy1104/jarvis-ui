import { Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

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
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <div className="flex flex-col gap-1.5">
        {tools.map((tool, index) => (
          <div key={`${tool.name}-${index}`} className="flex items-start gap-2 text-xs font-mono text-stone-500">
            <Wrench size={12} className="mt-0.5 flex-shrink-0 opacity-70" />
            <div className="flex-1 break-all">
              <span className="font-semibold text-stone-700 mr-2">{tool.name}</span>
              <span className="text-stone-400">
                {JSON.stringify(tool.args)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
