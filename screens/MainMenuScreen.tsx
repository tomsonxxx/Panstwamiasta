import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { useGame } from '../contexts/GameContext';
import { GameActionType, PlayerActivityState } from '../types';
import { checkMainApiKey } from '../services/geminiService'; 
import { getKnowledgeBaseStatus } from './localKnowledgeBaseService';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import HelpModal from '../components/HelpModal';
import PlayerAvatar from '../components/PlayerAvatar';
import { AVATAR_IDS } from '../constants';

const PlayerProfileSetup: React.FC = () => {
  const { gameState, dispatch } = useGame();
  const { playerName, playerAvatarId } = gameState;
  const [localPlayerName, setLocalPlayerName] = useState(playerName);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalPlayerName(e.target.value);
  };

  const savePlayerName = () => {
    if (!localPlayerName.trim()) {
      toast.error("Nazwa gracza nie może być pusta.");
      setLocalPlayerName(playerName); // Revert to original name
      return;
    }
    dispatch({ type: GameActionType.SET_PLAYER_NAME, payload: localPlayerName.trim() });
  };

  const handleAvatarChange = (direction: 'next' | 'prev') => {
    const currentIndex = AVATAR_IDS.indexOf(playerAvatarId);
    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % AVATAR_IDS.length;
    } else {
      nextIndex = (currentIndex - 1 + AVATAR_IDS.length) % AVATAR_IDS.length;
    }
    dispatch({ type: GameActionType.SET_PLAYER_AVATAR, payload: AVATAR_IDS[nextIndex] });
  };

  return (
    <motion.div
      variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
      className="mb-8 p-4 bg-slate-700/50 rounded-lg flex flex-col items-center"
    >
      <h2 className="text-lg font-semibold text-text-primary mb-3">Twój Profil Gracza</h2>
      <div className="flex items-center space-x-4">
        <Button onClick={() => handleAvatarChange('prev')} variant="ghost" size="sm" className="!p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </Button>
        <PlayerAvatar avatarId={playerAvatarId} activityState={PlayerActivityState.IDLE} size={80} />
        <Button onClick={() => handleAvatarChange('next')} variant="ghost" size="sm" className="!p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </Button>
      </div>
      <InputField
        id="mainPlayerName"
        value={localPlayerName}
        onChange={handleNameChange}
        onBlur={savePlayerName}
        placeholder="Wpisz swoją nazwę"
        containerClassName="mt-4 w-full max-w-xs"
        className="text-center"
      />
    </motion.div>
  );
};


const MainMenuScreen: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, dispatch } = useGame();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    const currentMainKeyStatus = checkMainApiKey();
    dispatch({ type: GameActionType.SET_API_KEY_STATUS, payload: currentMainKeyStatus });
    
    if (!currentMainKeyStatus) {
      toast.error("Główny klucz API (API_KEY) dla funkcji online (walidacja, boty) jest nieprawidłowy lub nieustawiony. Funkcje AI mogą nie działać.", { duration: 7000, id: "mainApiKeyErrorToastMainMenu" });
    }
    
    const kbStatus = getKnowledgeBaseStatus();
    if (!kbStatus.loaded) {
        // toast.error(kbStatus.message || "Lokalna baza wiedzy niezaładowana. Tryb offline może być niedostępny.", { duration: 7000, id: "kbErrorToast" });
        console.warn(kbStatus.message || "Lokalna baza wiedzy niezaładowana. Tryb offline może być niedostępny.");
    }

    dispatch({ type: GameActionType.SET_GAME_MODE, payload: null });
    dispatch({ type: GameActionType.SET_ROOM_ID, payload: null });
    if (gameState.gamePhase !== 'offline_config' && gameState.gamePhase !== 'lobby' && gameState.gamePhase !== 'ended') {
      dispatch({ type: GameActionType.SET_GAME_PHASE, payload: 'ended' });
    }

  }, [dispatch]);

  const handleSetupGame = (mode: 'solo' | 'solo-offline') => {
    if (mode === 'solo' && !gameState.apiKeyOk) {
      toast.error(`Nie można rozpocząć gry solo (online): Główny klucz API (API_KEY) nie jest skonfigurowany.`, { duration: 4000 });
      return;
    }
    if (mode === 'solo-offline' && !gameState.isKnowledgeBaseLoaded) {
      const kbStatus = getKnowledgeBaseStatus();
      toast.error(kbStatus.message || "Nie można rozpocząć gry offline: Lokalna baza wiedzy nie jest załadowana. Sprawdź konsolę.", { duration: 5000 });
      return;
    }
    navigate(`/settings?mode=${mode}`);
  };

  const handleMultiplayerGame = () => {
    if (!gameState.apiKeyOk) {
      toast.error(`Nie można przejść do trybu wieloosobowego: Główny klucz API (API_KEY) jest nieprawidłowy. Funkcje AI (boty, walidacja) mogą być niedostępne.`, { duration: 6000 });
    }
    dispatch({type: GameActionType.SET_GAME_PHASE, payload: 'lobby'}); 
    navigate('/multiplayer');
  };
  
  const mainApiKeyProblem = !gameState.apiKeyOk;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <>
    <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    <motion.div 
        className="text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >

      <motion.h1 variants={itemVariants} className="graffiti-title mb-2">Państwa Miasta</motion.h1>
      <motion.p variants={itemVariants} className="graffiti-subtitle mb-8">Lumbago Edition @ Blacha</motion.p>
      
      <PlayerProfileSetup />

      {mainApiKeyProblem && (
        <motion.div variants={itemVariants} className="mb-6 p-3 bg-red-700 bg-opacity-50 border border-danger text-white rounded-md text-sm">
          <p className="font-semibold text-lg mb-2">⚠️ Problem z konfiguracją API dla trybów Online!</p>
          <p className="mb-1">Główny klucz API (<code>API_KEY</code>) jest nieprawidłowy lub nieustawiony.</p>
          <p className="mt-2 text-xs">Tryby gry online (Solo z AI, Wieloosobowy z AI) mogą nie działać poprawnie.</p>
        </motion.div>
      )}
      {!gameState.isKnowledgeBaseLoaded && (
          <motion.div variants={itemVariants} className="mb-6 p-3 bg-yellow-600 bg-opacity-70 border border-yellow-500 text-white rounded-md text-sm">
              <p className="font-semibold">Lokalna baza wiedzy niezaładowana poprawnie!</p>
              <p>{getKnowledgeBaseStatus().message || "Tryb 'Graj Offline z Botami' może być niedostępny. Sprawdź konsolę (F12)."}</p>
          </motion.div>
      )}

      <motion.div 
        className="flex flex-col space-y-4 max-w-sm mx-auto"
      >
        <motion.div variants={itemVariants}>
          <Button 
              onClick={() => handleSetupGame('solo')} 
              size="lg" 
              fullWidth 
              disabled={mainApiKeyProblem}
              title={mainApiKeyProblem ? "Napraw problem z głównym kluczem API (API_KEY)" : "Skonfiguruj i graj solo z weryfikacją AI"}
          >
            Graj Solo (Online z AI)
          </Button>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Button 
              onClick={() => handleSetupGame('solo-offline')} 
              size="lg" 
              fullWidth 
              variant="secondary"
              disabled={!gameState.isKnowledgeBaseLoaded}
              title={!gameState.isKnowledgeBaseLoaded ? (getKnowledgeBaseStatus().message || "Lokalna baza wiedzy niezaładowana") : "Skonfiguruj i graj solo z botami używając lokalnej bazy"}
          >
            Graj Offline z Botami
          </Button>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Button 
              onClick={handleMultiplayerGame} 
              size="lg" 
              fullWidth
              title={mainApiKeyProblem ? "Klucz API_KEY ma problemy, funkcje AI w lobby mogą nie działać" : "Przejdź do lobby multiplayer"}
          >
            Graj Wieloosobowo (Online)
          </Button>
        </motion.div>
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          <Button onClick={() => navigate('/high-scores')} variant="ghost" size="md" fullWidth>
            Najlepsze Wyniki
          </Button>
          <Button onClick={() => setIsHelpModalOpen(true)} variant="ghost" size="md" fullWidth>
            Pomoc
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
    </>
  );
};

export default MainMenuScreen;