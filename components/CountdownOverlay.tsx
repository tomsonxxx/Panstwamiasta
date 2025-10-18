import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CountdownOverlayProps {
  seconds: number;
  isActive: boolean;
}

const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ seconds, isActive }) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-[100]"
        >
          <motion.div
            key={seconds} // Key change triggers animation
            initial={{ scale: 1.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="text-9xl font-extrabold text-secondary"
            style={{ textShadow: '0 0 15px rgba(245, 158, 11, 0.7)' }} // amber-500
          >
            {seconds}
          </motion.div>
          <p className="mt-4 text-2xl text-text-primary font-semibold">SEKUND DO KOŃCA RUNDY!</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CountdownOverlay;