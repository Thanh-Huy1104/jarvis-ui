import { motion } from 'framer-motion';

export default function BouncingDots({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 h-6 pl-1 ${className}`}>
      <motion.div
        className="w-1.5 h-1.5 bg-stone-400 rounded-full"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", times: [0, 0.5, 1] }}
      />
      <motion.div
        className="w-1.5 h-1.5 bg-stone-400 rounded-full"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.15, times: [0, 0.5, 1] }}
      />
      <motion.div
        className="w-1.5 h-1.5 bg-stone-400 rounded-full"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.3, times: [0, 0.5, 1] }}
      />
    </div>
  );
}
