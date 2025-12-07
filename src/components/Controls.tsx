import { X, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ControlsProps {
  onDisconnect: () => void;
  status: string;
  isPersistent: boolean;
  setIsPersistent: (isPersistent: boolean) => void;
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  isPaused: boolean;
  setIsPaused: (isPaused: boolean) => void;
}

export default function Controls({ 
  onDisconnect,
  status,
  cancelRecording,
  isPaused,
  setIsPaused,
  setIsPersistent,
}: ControlsProps) {

  const handlePauseToggle = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);

    if (newPausedState) { // Pausing
      setIsPersistent(false);
      if (status === 'listening' || status === 'processing') {
        cancelRecording();
      }
    } else { // Un-pausing
      setIsPersistent(true);
    }
  };

  return (
    <div className="w-full max-w-2xl flex justify-center items-center mt-2 mb-8 z-30">
      <motion.div 
        layout
        className="flex items-center gap-2 bg-white/90 backdrop-blur-xl border border-gray-200/60 p-1.5 pr-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      >
        
        {/* Main Action Button (Pause/Resume) */}
        <motion.button
          layout
          onClick={handlePauseToggle}
          whileTap={{ scale: 0.95 }}
          className={`
            relative overflow-hidden flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all duration-300
            ${isPaused 
              ? 'bg-neutral-800 text-white shadow-lg shadow-black/10 hover:bg-neutral-900' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <AnimatePresence mode='wait' initial={false}>
            {isPaused ? (
              <motion.div
                key="resume"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Session</span>
              </motion.div>
            ) : (
              <motion.div
                key="pause"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Vertical Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Disconnect Button - Subtle but accessible */}
        <motion.button
          layout
          onClick={onDisconnect}
          disabled={status === 'disconnected'}
          whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.08)' }}
          whileTap={{ scale: 0.9 }}
          className="group flex items-center justify-center w-10 h-10 rounded-full text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Disconnect Session"
        >
          <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
        </motion.button>

      </motion.div>
    </div>
  );
}