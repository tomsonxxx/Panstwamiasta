import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useGame } from '../contexts/GameContext';
import { GameActionType, BotDifficulty, BotSetupConfig, PlayerActivityState } from '../types';
import { BOT_DIFFICULTY_LABELS, MAX_PLAYERS_INCLUDING_BOTS, AVATAR_IDS, BOT_NAME_PREFIX } from '../constants';
import PlayerAvatar from '../components/PlayerAvatar';
import toast from 'react-hot-toast';
import { nanoid } from 'nanoid'; 
import { motion, AnimatePresence } from 'framer-motion';
import { getKnowledgeBaseStatus } from './localKnowledgeBaseService';


const OfflineBotConfigScreen: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, dispatch } = useGame();
  const [configuredBots, setConfiguredBots] = useState<BotSetupConfig[]>([]);

  const MAX_BOTS_ALLOWED = MAX_PLAYERS_INCLUDING_BOTS - 1;


  useEffect(() => {
    if (gameState.gamePhase !== 'offline_config') {
      if (gameState.gamePhase === 'letter_drawing') navigate('/draw-letter');
      else if (gameState.gamePhase === 'playing') navigate('/game');
      else if (gameState.gamePhase === 'ended') navigate('/');
    }
    // Add one bot by default if KB is loaded and no bots are configured yet
    if (configuredBots.length === 0 && MAX_BOTS_ALLOWED > 0 && gameState.isKnowledgeBaseLoaded) {
        handleAddBotToList(BotDifficulty.MEDIUM); 
    }
  }, [gameState.gamePhase, navigate, gameState.isKnowledgeBaseLoaded, configuredBots.length]);


  const handleAddBotToList = (defaultDifficulty: BotDifficulty = BotDifficulty.MEDIUM) => {
    if (!gameState.isKnowledgeBaseLoaded) {
      const kbStatus = getKnowledgeBaseStatus();
      toast.error(kbStatus.message || "Lokalna baza wiedzy nie jest załadowana. Nie można dodać bota.", {id: "kb_unavailable_add_bot"});
      return;
    }
    if (configuredBots.length >= MAX_BOTS_ALLOWED) {
      toast.error(`Można dodać maksymalnie ${MAX_BOTS_ALLOWED} botów.`);
      return;
    }
    const newBotId = nanoid();
    const newBot: BotSetupConfig = {
      id: newBotId,
      name: `${BOT_NAME_PREFIX} ${configuredBots.length + 1}`,
      difficulty: defaultDifficulty,
    };
    setConfiguredBots(prevBots => [...prevBots, newBot]);
  };

  const handleRemoveBotFromList = (botIdToRemove: string) => {
    setConfiguredBots(prevBots => {
        const updatedBots = prevBots.filter(bot => bot.id !== botIdToRemove);
        // Re-number bots after removal
        return updatedBots.map((bot, index) => ({
            ...bot,
            name: `${BOT_NAME_PREFIX} ${index + 1}`,
        }));
    });
  };

  const handleChangeBotDifficulty = (botId: string, newDifficulty: BotDifficulty) => {
    setConfiguredBots(prevBots =>
      prevBots.map(bot =>
        bot.id === botId ? { ...bot, difficulty: newDifficulty } : bot
      )
    );
  };

  const handleStartGame = () => {
    if (!gameState.isKnowledgeBaseLoaded) {
        const kbStatus = getKnowledgeBaseStatus();
        toast.error(kbStatus.message || "Lokalna baza wiedzy nie jest załadowana. Nie można rozpocząć gry.", { duration: 4000});
        return;
    }
    // Używamy ujednoliconej akcji INITIALIZE_GAME
    dispatch({
      type: GameActionType.INITIALIZE_GAME,
      payload: { 
        settings: gameState.settings, 
        gameMode: 'solo-offline',
        botsToCreate: configuredBots 
      },
    });
  };

  return (
    <div className="max-w-lg mx-auto text-center">
      <h1 className="text-3xl font-bold mb-6 text-primary">Konfiguracja Botów Offline</h1>
      
      <div className="mb-6 space-y-3 min-h-[150px]">
        <AnimatePresence>
        {configuredBots.map((bot, index) => (
          <motion.div 
            key={bot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between p-3 bg-slate-700 rounded-lg shadow"
          >
            <div className="flex items-center space-x-3">
              <PlayerAvatar 
                avatarId={AVATAR_IDS[(index + 1) % AVATAR_IDS.length]} // +1 to avoid human player's avatar index if they are 0
                activityState={PlayerActivityState.IDLE} 
                size={40} 
                isBot={true} 
              />
              <span className="text-text-primary font-medium">{bot.name</span>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={bot.difficulty}
                onChange={(e) => handleChangeBotDifficulty(bot.id, Number(e.target.value) as BotDifficulty)}
                className="px-2 py-1 bg-slate-600 border border-slate-500 rounded-md text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                aria-label={`Poziom trudności dla ${bot.name}`}
              >
                {Object.entries(BOT_DIFFICULTY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label.split(' (')[0]}</option> 
                ))}
              </select>
              <Button onClick={() => handleRemoveBotFromList(bot.id)} variant="danger" size="sm" className="!p-1.5">
                Usuń
              </Button>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
        {configuredBots.length === 0 && (
            <p className="text-text-secondary italic py-4">Brak botów. Kliknij "Dodaj Bota", aby zagrać z komputerem, lub "Rozpocznij Grę", aby zagrać samemu.</p>
        )}
      </div>

      <div className="mb-6">
        <Button 
            onClick={() => handleAddBotToList()} 
            disabled={configuredBots.length >= MAX_BOTS_ALLOWED || !gameState.isKnowledgeBaseLoaded}
            fullWidth 
            variant="ghost"
            title={!gameState.isKnowledgeBaseLoaded ? (getKnowledgeBaseStatus().message || "Lokalna baza wiedzy niezaładowana") : (configuredBots.length >= MAX_BOTS_ALLOWED ? `Osiągnięto limit ${MAX_BOTS_ALLOWED} botów` : "Dodaj nowego bota")}
        >
          Dodaj Bota ({configuredBots.length}/{MAX_BOTS_ALLOWED})
        </Button>
      </div>
      
      <div className="mt-8 flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:space-x-3">
        <Button onClick={() => {
          dispatch({ type: GameActionType.SET_GAME_PHASE, payload: 'ended' });
          navigate('/');
        }} variant="ghost" className="w-full sm:w-auto">
          Powrót do Menu
        </Button>
        <Button onClick={handleStartGame} variant="primary" className="w-full sm:w-auto" disabled={!gameState.isKnowledgeBaseLoaded}>
          Rozpocznij Grę
        </Button>
      </div>
       {!gameState.isKnowledgeBaseLoaded && (
          <p className="mt-4 text-xs text-danger">
              {getKnowledgeBaseStatus().message || "Lokalna baza wiedzy jest niedostępna! Gra offline z botami może nie działać poprawnie. Sprawdź, czy pliki bazy (`/data/kb_categories/*.json`) są dostępne."}
          </p>
      )}
    </div>
  );
};

export default OfflineBotConfigScreen;