import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { Task } from '../hooks/useJarvis';

interface TaskQueueProps {
  tasks: Task[];
}

export default function TaskQueue({ tasks }: TaskQueueProps) {
  if (!tasks || tasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-6 bg-white border border-stone-200 rounded-xl p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-medium text-stone-700">Tasks in Parallel</h3>
      </div>
      
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 text-sm"
          >
            <div className="mt-0.5 flex-shrink-0">
              {task.status === 'complete' ? (
                <CheckCircle2 size={16} className="text-green-500" />
              ) : task.status === 'running' ? (
                <Loader2 size={16} className="text-[#DA7756] animate-spin" />
              ) : task.status === 'failed' ? (
                <Circle size={16} className="text-red-500" />
              ) : (
                <Circle size={16} className="text-stone-300" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`font-mono text-xs ${
                task.status === 'complete' ? 'text-stone-500 line-through' :
                task.status === 'running' ? 'text-stone-900' :
                task.status === 'failed' ? 'text-red-600' :
                'text-stone-600'
              }`}>
                {task.description}
              </p>
            </div>
            
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              task.status === 'complete' ? 'bg-green-50 text-green-700' :
              task.status === 'running' ? 'bg-orange-50 text-orange-700' :
              task.status === 'failed' ? 'bg-red-50 text-red-700' :
              'bg-stone-50 text-stone-500'
            }`}>
              {task.status}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
