


import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import SlotMachineComponent from '../components/SlotMachineComponent';
import LoadingSpinner from '../components/LoadingSpinner';
import PlayerAvatar from '../components/PlayerAvatar';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
// @google/genai-codex-fix: Import `PlayerActivityState` to use its enum members.
import { PlayerActivityState } from '../types';

const LetterDrawingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, pullLetterMachineLever, stopLetterMachine } = useGame();
  const { 
    gamePhase, 
    currentRound,
    letterDrawingPlayerId, 
    letterDrawingPlayerName,
    isLetterMachineActive, 
    letterMachineDisplayContent,
    players, // Full list of players
    playerName // Local player's name
  } = gameState;

  const localPlayer = players.find(p => p.name === playerName);
  const isMyTurnToDraw = localPlayer?.id === letterDrawingPlayerId;

  useEffect(() => {
    if (gamePhase !== 'letter_drawing') {
      // If somehow this screen is rendered when not in letter_drawing phase,
      // navigate away. App.tsx should usually handle this.
      if (gamePhase === 'playing') navigate('/game');
      else if (gamePhase === 'lobby' && gameState.roomId) navigate(`/lobby/${gameState.roomId}`);
      else navigate('/'); // Fallback
    }
  }, [gamePhase, navigate, gameState.roomId]);
  
  useEffect(() => {
      if(isMyTurnToDraw && !isLetterMachineActive && letterMachineDisplayContent === '?'){
        // toast("Twoja kolej, aby wylosować literę!", {icon: '🎰'});
      }
  }, [isMyTurnToDraw, isLetterMachineActive, letterMachineDisplayContent]);


  if (gamePhase !== 'letter_drawing') {
    return <LoadingSpinner text="Ładowanie..." />; // Should be navigated away by useEffect
  }
  
  if (!letterDrawingPlayerId || !letterDrawingPlayerName) {
      toast.error("Błąd: Nie można określić, kto losuje literę.");
      return <LoadingSpinner text="Błąd konfiguracji rundy..." />;
  }
  
  const drawingPlayerAvatarId = players.find(p => p.id === letterDrawingPlayerId)?.avatarId || 'default';


  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] md:min-h-0" // Ensure it takes height for centering
    >
      <div className="mb-6 flex items-center justify-center space-x-3 p-3 bg-slate-700 rounded-lg shadow-md">
        <PlayerAvatar 
            avatarId={drawingPlayerAvatarId} 
            // @google/genai-codex-fix: Use `PlayerActivityState` enum members instead of string literals.
            activityState={isMyTurnToDraw ? (isLetterMachineActive ? PlayerActivityState.TYPING : PlayerActivityState.THINKING) : PlayerActivityState.WAITING} 
            size={40} 
        />
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Runda {currentRound}: Losuje <span className="text-secondary">{letterDrawingPlayerName}</span>
            {isMyTurnToDraw && " (Ty)"}
        </h1>
      </div>

      {isMyTurnToDraw ? (
        <SlotMachineComponent
          displayLetter={letterMachineDisplayContent}
          onPullLever={pullLetterMachineLever}
          onStopMachine={stopLetterMachine}
          isMachineActive={isLetterMachineActive}
          canInteract={true}
        />
      ) : (
        <div className="flex flex-col items-center p-8 bg-slate-800 rounded-xl shadow-2xl">
          <LoadingSpinner text={`Oczekiwanie na ${letterDrawingPlayerName}...`} size="lg" />
           <div className="mt-6 w-32 h-32 bg-slate-900 border-4 border-slate-700 rounded-lg flex items-center justify-center shadow-inner">
             <p className="text-6xl font-bold text-text-secondary select-none">
               {isLetterMachineActive ? letterMachineDisplayContent : '?'}
             </p>
           </div>
        </div>
      )}
       <p className="mt-8 text-xs text-slate-500">
        Litera zostanie użyta do wszystkich kategorii w tej rundzie.
      </p>
    </motion.div>
  );
};

export default LetterDrawingScreen;
