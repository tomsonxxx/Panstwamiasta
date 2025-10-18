import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useGame } from '../contexts/GameContext';
import { GameActionType, RoundResult, Player, BotDifficulty, HighScoreEntry, PlayerActivityState } from '../types';
import PlayerAvatar from '../components/PlayerAvatar'; 
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { AVATAR_IDS, BOT_DIFFICULTY_LABELS, playAudio, SOUNDS } from '../constants';
import VictoryConfetti from '../components/VictoryConfetti';
import { nanoid } from 'nanoid';

const CrownIcon: React.FC = () => (
  <motion.svg
    initial={{ y: -20, opacity: 0, scale: 0.5 }}
    animate={{ y: 0, opacity: 1, scale: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="gold"
    stroke="orange"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
    style={{ filter: 'drop-shadow(0 0 5px gold)' }}
  >
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7L2 4z"></path>
    <circle cx="5" cy="4" r="1"></circle>
    <circle cx="12" cy="4" r="1"></circle>
    <circle cx="19" cy="4" r="1"></circle>
  </motion.svg>
);


const GameSummaryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, dispatch } = useGame();
  const { totalScore, roundResults, settings, gameMode, players, playerName } = gameState;

  const localHumanPlayer = players.find(p => p.name === playerName && !p.isBot);

  useEffect(() => {
    playAudio(SOUNDS.GAME_VICTORY, 0.3);

    const finalScore = localHumanPlayer?.score ?? 0;
    if (!localHumanPlayer || finalScore <= 0) return;

    try {
        const highScores: HighScoreEntry[] = JSON.parse(localStorage.getItem('paM_highScores') || '[]');
        const lowestHighScore = highScores.length > 0 ? highScores[highScores.length - 1].score : 0;
        
        const MAX_HIGH_SCORES = 10;

        if (highScores.length < MAX_HIGH_SCORES || finalScore > lowestHighScore) {
            const newScoreEntry: HighScoreEntry = {
                id: nanoid(),
                playerName: localHumanPlayer.name,
                score: finalScore,
                date: new Date().toISOString(),
                gameMode: gameMode,
                numRounds: settings.numRounds,
                roundDuration: settings.roundDurationSeconds,
            };

            const updatedHighScores = [...highScores, newScoreEntry]
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_HIGH_SCORES);
            
            localStorage.setItem('paM_highScores', JSON.stringify(updatedHighScores));
            toast.success('Gratulacje! Twój wynik trafił na listę najlepszych!', { icon: '🏆' });
        }
    } catch (e) {
        console.error("Failed to save high score:", e);
    }
  }, []);

  const handlePlayAgain = () => {
    if (gameMode === 'multiplayer-client') {
      dispatch({ type: GameActionType.RESET_GAME }); 
      navigate('/multiplayer');
    } else if (gameMode === 'solo-offline') {
      // Dla tego trybu, ponowna inicjalizacja jest poprawna, aby wrócić do konfiguracji botów
      dispatch({ type: GameActionType.INITIALIZE_GAME, payload: { settings: gameState.settings, gameMode: gameMode } });
    } else { // 'solo' and 'multiplayer-host'
      // Użyj nowej, poprawnej akcji do restartu gry
      dispatch({ type: GameActionType.REPLAY_GAME });
    }
  };

  const handleMainMenu = () => {
    dispatch({ type: GameActionType.RESET_GAME }); 
    navigate('/'); 
  };
  
  const isMultiplayerOrOffline = gameMode === 'multiplayer-host' || gameMode === 'multiplayer-client' || gameMode === 'solo-offline';
  
  const allPlayerScoresSorted: Player[] = [...players].sort((a, b) => b.score - a.score);
  const winnerScore = allPlayerScoresSorted.length > 0 ? allPlayerScoresSorted[0].score : 0;
  const winners = allPlayerScoresSorted.filter(p => p.score === winnerScore && winnerScore > 0);
  const winnerIds = winners.map(w => w.id);

  const roundsHeader = Array.from({ length: settings.numRounds }, (_, i) => i + 1);

  const getPlayAgainButtonText = () => {
    if (gameMode === 'multiplayer-client') return "Dołącz do Nowej Gry";
    if (gameMode === 'multiplayer-host') return "Nowa Gra (Poczekalnia)";
    return "Zagraj Ponownie";
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center relative"
    >
      <AnimatePresence>
        {winners.length > 0 && <VictoryConfetti />}
      </AnimatePresence>

      <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">Koniec Gry!</h1>
      
      <div className="mb-8">
        <h2 className="text-xl md:text-2xl text-text-secondary mb-4">Końcowe Wyniki:</h2>
        <div className="space-y-2 max-w-md mx-auto bg-surface p-4 rounded-lg shadow-inner">
          {allPlayerScoresSorted.map((player, index) => {
            const isWinner = winnerIds.includes(player.id);
            return (
              <motion.div 
                key={player.id} 
                className={`flex items-center space-x-3 p-3 rounded-md text-lg relative overflow-hidden ${isWinner ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-800 font-bold' : 'bg-background'}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: isWinner ? [1, 1.05, 1] : 1,
                }}
                transition={{
                  delay: 0.2 + index * 0.1,
                  ...(isWinner && {
                    scale: {
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }),
                }}
              >
                <div className="relative">
                  <PlayerAvatar avatarId={player.avatarId || AVATAR_IDS[0]} activityState={PlayerActivityState.IDLE} size={32} isBot={player.isBot} />
                  {isWinner && <CrownIcon />}
                </div>
                <span>{index + 1}. {player.name}</span>
                <span className="ml-auto font-bold">{player.score} pkt</span>
              </motion.div>
            )
          })}
          {allPlayerScoresSorted.length === 0 && <p className="text-text-secondary">Brak wyników.</p>}
        </div>
      </div>

      <div className="my-8 bg-surface p-2 sm:p-4 rounded-lg shadow-inner">
        <h3 className="text-lg sm:text-xl font-semibold text-text-primary mb-3">Szczegółowa Punktacja Rund</h3>
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
                <thead className="bg-background/50">
                    <tr>
                        <th className="p-2">Gracz</th>
                        {roundsHeader.map(roundNum => <th key={roundNum} className="p-2 text-center">R{roundNum}</th>)}
                        <th className="p-2 text-right font-bold">Suma</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                    {allPlayerScoresSorted.map(player => (
                        <tr key={player.id} className={`${player.id === localHumanPlayer?.id ? 'bg-primary/30' : ''}`}>
                            <td className="p-2 font-semibold flex items-center space-x-2">
                                <PlayerAvatar avatarId={player.avatarId || AVATAR_IDS[0]} activityState={PlayerActivityState.IDLE} size={20} isBot={player.isBot} />
                                <span className="truncate max-w-24 sm:max-w-none">{player.name}</span>
                            </td>
                            {roundsHeader.map(roundNum => (
                                <td key={roundNum} className="p-2 text-center text-text-secondary">
                                    {gameState.multiplayerRoundScores[player.id]?.[roundNum] ?? '-'}
                                </td>
                            ))}
                            <td className="p-2 text-right font-bold text-secondary">{player.score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      <div className="space-y-3 md:space-y-0 md:space-x-4 md:flex md:justify-center">
        <Button onClick={handlePlayAgain} size="lg" className="w-full md:w-auto">
          {getPlayAgainButtonText()}
        </Button>
        <Button onClick={handleMainMenu} variant="secondary" size="lg" className="w-full md:w-auto">
          Menu Główne
        </Button>
      </div>
    </motion.div>
  );
};

export default GameSummaryScreen;