
import React from 'react';
import Button from './Button';
import { motion, AnimatePresence } from 'framer-motion';

interface SlotMachineComponentProps {
  displayLetter: string;
  onPullLever: () => void;
  onStopMachine: () => void;
  isMachineActive: boolean;
  canInteract: boolean; // True if it's this player's turn and actions are allowed
}

const SlotMachineComponent: React.FC<SlotMachineComponentProps> = ({
  displayLetter,
  onPullLever,
  onStopMachine,
  isMachineActive,
  canInteract,
}) => {
  const [leverPulled, setLeverPulled] = React.useState(false);

  const handleLeverClick = () => {
    if (canInteract && !isMachineActive) {
      setLeverPulled(true);
      onPullLever();
      setTimeout(() => setLeverPulled(false), 300); // Reset lever animation
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-800 rounded-xl shadow-2xl relative overflow-hidden">
      {/* Background accents (optional) */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary opacity-20 rounded-full filter blur-xl"></div>
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-secondary opacity-20 rounded-full filter blur-xl"></div>
      
      {/* Slot Display */}
      <div className="w-40 h-40 md:w-48 md:h-48 bg-slate-900 border-4 border-slate-700 rounded-lg flex items-center justify-center shadow-inner mb-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 opacity-50"></div>
        <AnimatePresence mode="wait">
          <motion.p
            key={displayLetter}
            initial={{ opacity: 0, y: isMachineActive ? 20 : 0, scale: isMachineActive ? 0.8 : 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMachineActive ? -20 : 0, scale: isMachineActive ? 0.8 : 1 }}
            transition={{ duration: isMachineActive ? 0.15 : 0.25 }} // Faster transition when machine is active
            className="text-7xl md:text-8xl font-bold text-secondary select-none"
            style={{ textShadow: '0 0 10px rgba(245, 158, 11, 0.5), 0 0 20px rgba(245, 158, 11, 0.3)' }}
          >
            {displayLetter}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-6">
        {/* Lever */}
        <motion.div
          onClick={handleLeverClick}
          className={`relative w-12 h-32 md:w-14 md:h-36 bg-slate-700 rounded-t-full rounded-b-md shadow-lg cursor-pointer ${(!canInteract || isMachineActive) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-600'}`}
          animate={{ rotate: leverPulled ? 25 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 10 }}
          title="Pociągnij Dźwignię"
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-8 md:w-10 md:h-10 bg-danger rounded-full shadow-md border-2 border-red-700"></div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-10 bg-slate-600 rounded-sm"></div>
        </motion.div>

        {/* Stop Button */}
        <Button
          onClick={onStopMachine}
          disabled={!canInteract || !isMachineActive}
          size="lg"
          variant="danger"
          className="w-32 h-16 md:w-36 md:h-20 text-xl !rounded-xl shadow-xl"
        >
          STOP
        </Button>
      </div>
      <p className="mt-6 text-sm text-text-secondary text-center">
        {isMachineActive ? "Naciśnij STOP, aby wybrać literę!" : "Pociągnij za dźwignię, aby rozpocząć losowanie!"}
      </p>
    </div>
  );
};

export default SlotMachineComponent;