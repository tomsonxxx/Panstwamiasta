import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import { useGame } from '../contexts/GameContext';
import { Player, GameActionType, PlayerActivityState, BotDifficulty } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import PlayerAvatar from '../components/PlayerAvatar'; 
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { AVATAR_IDS, BOT_DIFFICULTY_LABELS, MAX_PLAYERS_INCLUDING_BOTS } from '../constants';


const LobbyScreen: React.FC = () => {
  const navigate = useNavigate();
  const { roomId: routeRoomId } = useParams<{ roomId: string }>();
  const { gameState, dispatch, startGameAsHost, addBotPlayer, removeBotPlayer, leaveRoom } = useGame();
  const { gameMode, roomId, players, playerName, settings, gamePhase, apiKeyOk } = gameState; 
  const [selectedBotDifficulty, setSelectedBotDifficulty] = useState<BotDifficulty>(BotDifficulty.MEDIUM);


  useEffect(() => {
    if (!gameMode?.startsWith('multiplayer')) {
      toast.error("Nie jesteś w pokoju wieloosobowym.");
      dispatch({ type: GameActionType.SET_GAME_PHASE, payload: 'ended' });
      navigate('/multiplayer');
      return;
    }
    if (roomId !== routeRoomId) {
        if (gameMode === 'multiplayer-client' && routeRoomId) {
             toast("Synchronizowanie z pokojem...", { icon: '⏳' });
             dispatch({ type: GameActionType.SET_ROOM_ID, payload: routeRoomId }); 
        } else {
            toast.error("Błąd synchronizacji pokoju. Przekierowanie.");
            leaveRoom();
            navigate('/multiplayer');
        }
    }
    if (gamePhase !== 'lobby' && gamePhase !== 'letter_drawing' && gamePhase !== 'playing') {
         dispatch({ type: GameActionType.SET_GAME_PHASE, payload: 'lobby' });
    }

  }, [gameMode, roomId, routeRoomId, navigate, dispatch, gamePhase, leaveRoom]);
  
  const handleAddBot = () => {
    if (gameMode !== 'multiplayer-host') return;

    if (players.length >= MAX_PLAYERS_INCLUDING_BOTS) {
      toast(`Osiągnięto maksymalną liczbę graczy (${MAX_PLAYERS_INCLUDING_BOTS}).`, { icon: '⚠️' });
      return;
    }
    
    if (!apiKeyOk) {
        toast.error(`Nie można dodać bota: Główny klucz API (API_KEY) jest nieaktywny. Boty online nie będą działać.`, { duration: 5000 });
        return;
    }
    addBotPlayer(selectedBotDifficulty);
  };

  const handleRemoveBot = (botId: string) => {
    if (gameMode === 'multiplayer-host') {
        removeBotPlayer(botId);
    }
  }


  const handleStartGameByHost = () => {
    if (gameMode === 'multiplayer-host') {
      if (!apiKeyOk) {
          toast.error(`Nie można rozpocząć gry: Główny klucz API (API_KEY) jest niepoprawny.`, { duration: 6000 });
          if (players.some(p => p.isBot)) return;
      }

      if (players.length < 1) { 
        toast.error("Co najmniej jeden gracz (host) musi być w pokoju.");
        return;
      }
      if (players.length === 1 && !players[0].isBot) { 
        toast("Rozpoczynasz grę solo jako host.", {duration: 4000, icon: 'ℹ️'});
      }
      startGameAsHost(); 
    }
  };
  
  const handleLeaveLobby = () => {
    leaveRoom();
    navigate('/'); 
  };

  if (!roomId && gameMode?.startsWith('multiplayer')) {
    return <LoadingSpinner text="Ładowanie poczekalni..." />;
  }


  const isHost = gameMode === 'multiplayer-host';
  const canAddMorePlayers = players.length < MAX_PLAYERS_INCLUDING_BOTS;
  const localPlayer = players.find(p => p.id === gameState.players.find(pl => pl.name === playerName && !pl.isBot)?.id && !p.isBot);

  if (gamePhase !== 'lobby') {
      if(gameMode === 'multiplayer-client' && (gamePhase === 'letter_drawing' || gamePhase === 'playing')) {
        return <LoadingSpinner text="Dołączanie do trwającej gry..." />
      }
      if (isHost) return <LoadingSpinner text="Przekierowywanie..." />
  }
  
  const mainApiKeyProblem = !apiKeyOk;
  
  const addBotButtonDisabled = !canAddMorePlayers || mainApiKeyProblem;
  let addBotButtonTitle = "";
  if (!canAddMorePlayers) addBotButtonTitle = "Osiągnięto limit graczy. ";
  if (mainApiKeyProblem) addBotButtonTitle += "Główny Klucz API (API_KEY) jest nieaktywny, boty online nie będą działać. ";


  let startGameButtonTitle = "";
  if (mainApiKeyProblem) {
      startGameButtonTitle += "Główny Klucz API (API_KEY) jest niepoprawny. Funkcje AI mogą być ograniczone. ";
  }


  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg mx-auto"
    >
      <h1 className="text-3xl font-bold mb-4 text-center text-primary">Poczekalnia</h1>
      <div className="mb-6 p-4 bg-slate-700 rounded-lg text-center">
        <p className="text-text-secondary text-sm">ID Pokoju (udostępnij innym):</p>
        <p className="text-2xl font-bold text-secondary tracking-widest">{roomId}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3 text-text-primary">Gracze w Pokoju ({players.length}/{MAX_PLAYERS_INCLUDING_BOTS}):</h2>
        <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-slate-800 rounded-md">
          <AnimatePresence>
            {players.map((player) => {
              const isLocalPlayer = player.id === localPlayer?.id && !player.isBot;
              let displayName = player.name;
              if (isLocalPlayer) { 
                displayName += player.isHost ? " (Ty - Host)" : " (Ty)";
              } else if (player.isHost && !player.isBot) {
                displayName += " (Host)";
              } else if (player.isBot) {
                displayName += ` (Bot - ${BOT_DIFFICULTY_LABELS[player.botDifficulty || BotDifficulty.MEDIUM].split('(')[0].trim()})`;
              }

              return (
                <motion.div
                  key={player.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-3 rounded-md flex items-center space-x-3 transition-colors ${isLocalPlayer ? 'bg-primary text-white font-semibold' : 'bg-slate-600'}`}
                >
                  <PlayerAvatar 
                      avatarId={player.avatarId || AVATAR_IDS[0]} 
                      activityState={player.activityState || PlayerActivityState.IDLE} 
                      size={32} 
                      isBot={player.isBot}
                  />
                  <span className="flex-grow">{displayName}</span>
                  {player.isHost && !player.isBot && <span className="ml-auto text-xs px-2 py-0.5 bg-secondary text-white rounded-full">HOST</span>}
                  {isHost && player.isBot && (
                    <Button size="sm" variant="danger" onClick={() => handleRemoveBot(player.id)} className="ml-auto !p-1">
                      Usuń
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      
      {isHost && (
        <div className="mb-6 p-4 bg-slate-700 rounded-lg">
            <h3 className="text-lg font-medium text-text-primary mb-3">Ustawienia Gry (Host):</h3>
            <div className="text-sm text-text-secondary p-2 bg-slate-800 rounded-md mb-4">
                <p>Rundy: {settings.numRounds}, Czas: {settings.roundDurationSeconds}s, Kategorie/rundę: {settings.categoriesPerRound}</p>
                 <p className="text-xs italic mt-1">Host może zmienić te ustawienia w menu głównym przed założeniem pokoju.</p>
            </div>
             {mainApiKeyProblem && (
                <div className="my-3 p-2 bg-red-800/60 border border-danger text-white rounded-md text-xs">
                    <p className="font-bold">Problem z Kluczem API (API_KEY)!</p>
                    <p>Boty online oraz walidacja AI nie będą działać.</p>
                </div>
            )}
            <div className="my-4 space-y-2">
                <label htmlFor="botDifficulty" className="block text-sm font-medium text-text-secondary text-left">Panel Zarządzania Botami:</label>
                <div title={addBotButtonTitle.trim()} className="flex items-center space-x-2 bg-slate-800 p-2 rounded-md">
                    <select
                        id="botDifficulty"
                        value={selectedBotDifficulty}
                        onChange={(e) => setSelectedBotDifficulty(Number(e.target.value) as BotDifficulty)}
                        className="flex-grow px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={addBotButtonDisabled}
                        aria-label="Poziom Trudności Bota"
                    >
                        {Object.entries(BOT_DIFFICULTY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                    <Button 
                        onClick={handleAddBot} 
                        variant="ghost" 
                        size="md"
                        disabled={addBotButtonDisabled}
                        className="whitespace-nowrap"
                    >
                        Dodaj Bota
                    </Button>
                </div>
            </div>

            <Button 
                onClick={handleStartGameByHost} 
                fullWidth 
                size="lg" 
                disabled={players.length === 0 || (mainApiKeyProblem && players.some(p => p.isBot)) }
                title={startGameButtonTitle.trim()}
            >
                {`Rozpocznij Grę (${players.length} ${players.length === 1 ? 'gracz' : (players.length > 1 && players.length < 5 ? 'graczy' : 'graczy')})`}
            </Button>
        </div>
      )}

      {!isHost && (
        <div className="text-center p-4 bg-slate-700 rounded-lg flex flex-col items-center">
          <PlayerAvatar 
            avatarId={localPlayer?.avatarId || AVATAR_IDS[0]} 
            activityState={localPlayer?.activityState || PlayerActivityState.WAITING} 
            size={48}
            isBot={localPlayer?.isBot}
          />
          <p className="mt-2 text-text-secondary">Oczekiwanie na rozpoczęcie gry przez hosta...</p>
        </div>
      )}

      <Button onClick={handleLeaveLobby} variant="danger" className="w-full mt-4">
        Opuść Poczekalnię
      </Button>
    </motion.div>
  );
};

export default LobbyScreen;