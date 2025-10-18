import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useGame } from '../contexts/GameContext';
import { GameActionType, Player, Answer, RoundResult, PlayerActivityState } from '../types';
import PlayerAvatar from '../components/PlayerAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { AVATAR_IDS } from '../constants';
import VictoryConfetti from '../components/VictoryConfetti';
import LoadingSpinner from '../components/LoadingSpinner';
import PlayerVoteModal from '../components/PlayerVoteModal';

const getPointsClass = (score: number) => {
    if (score >= 15) return 'text-green-400';
    if (score >= 10) return 'text-yellow-400';
    if (score >= 5) return 'text-blue-400';
    if (score > 0) return 'text-sky-400';
    return 'text-red-500';
};

const PlayerAnswerCard: React.FC<{ 
    player: Player; 
    answer?: Answer;
    onInitiateVote: () => void;
    canVote: boolean;
}> = ({ player, answer, onInitiateVote, canVote }) => {
    
    return (
        <div className="flex items-center space-x-3 p-2 bg-background/50 rounded-md">
            <PlayerAvatar avatarId={player.avatarId} activityState={PlayerActivityState.IDLE} size={24} isBot={player.isBot} />
            <div className="flex-grow flex items-center space-x-2">
                <div className="flex-grow">
                  <p className="font-medium text-sm text-text-primary truncate" title={answer?.text || '-'}>
                      {answer?.text || '-'}
                      {answer?.voteOverridden === 'valid' && <span className="text-green-400 ml-1" title="Werdykt zmieniony przez graczy">✓</span>}
                      {answer?.voteOverridden === 'invalid' && <span className="text-red-400 ml-1" title="Werdykt zmieniony przez graczy">✗</span>}
                  </p>
                  {answer && !answer.isValid && answer.reason && <p className="text-xs text-danger/80 italic truncate" title={answer.reason}>{answer.reason}</p>}
                </div>
                {canVote && answer?.isVoteable && (
                    <button onClick={onInitiateVote} title="Zakwestionuj odpowiedź" className="p-1 rounded-full hover:bg-slate-500 transition-colors">
                        <span role="img" aria-label="Głosuj">🗳️</span>
                    </button>
                )}
            </div>
            {answer && answer.text && (
                 <p className={`text-sm font-bold ml-auto pl-2 ${getPointsClass(answer.score + (answer.bonusPoints || 0))}`}>
                    {answer.score}{answer.bonusPoints > 0 ? `+${answer.bonusPoints}` : ''}
                 </p>
            )}
        </div>
    );
};

const RoundResultsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, dispatch, finalizeAndRecalculateScores, initiatePlayerVote } = useGame();
  const { players, currentRound, settings, roundResults, gamePhase, gameMode, playerName, activePlayerVote } = gameState;
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const localPlayer = players.find(p => p.name === playerName && !p.isBot);
  const isHostOrSolo = gameMode === 'multiplayer-host' || gameMode === 'solo' || gameMode === 'solo-offline';

  const lastResult = roundResults.length > 0 ? roundResults[roundResults.length - 1] : null;

  useEffect(() => {
      // Host or solo player finalizes scores after AI validation is done
      if (isHostOrSolo && lastResult && !lastResult.isFinalized && gamePhase === 'results' && !gameState.isLoadingValidation) {
          const roundIndex = roundResults.length - 1;
          finalizeAndRecalculateScores(roundIndex);
      }
  }, [isHostOrSolo, lastResult, gamePhase, gameState.isLoadingValidation, finalizeAndRecalculateScores, roundResults.length]);
  
  if (gamePhase !== 'results') {
    if (gamePhase === 'summary') navigate('/summary');
    else if (gamePhase === 'playing') navigate('/game');
    else navigate('/');
    return null;
  }

  if (!lastResult) {
    return (
      <div className="text-center">
        <LoadingSpinner text="Oczekiwanie na wyniki od hosta..." />
      </div>
    );
  }

  const handleNextAction = () => {
    if (currentRound >= settings.numRounds) {
      dispatch({ type: GameActionType.SET_GAME_PHASE, payload: 'summary' });
    } else {
        if (isHostOrSolo) {
            dispatch({ type: GameActionType.NEXT_ROUND });
        }
    }
  };

  const isLastRound = currentRound >= settings.numRounds;

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  const roundWinner = [...players].sort((a,b) => (lastResult.scores[b.id] || 0) - (lastResult.scores[a.id] || 0))[0];
  const playerWonRound = localPlayer && roundWinner?.id === localPlayer.id && (lastResult.scores[localPlayer.id] || 0) > 0;

  const canInitiateVote = isHostOrSolo && lastResult.isFinalized && !activePlayerVote;


  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      {playerWonRound && <VictoryConfetti />}
      <PlayerVoteModal />
      <h1 className="text-3xl font-bold mb-2 text-center text-primary">Wyniki Rundy {lastResult.roundNumber}</h1>
      <p className="text-center text-5xl font-bold text-secondary mb-6">Litera: {lastResult.letter}</p>
      
      <div className="space-y-3">
        {gameState.currentRoundCategories.map(category => {
          const isCategoryOpen = openCategory === category;
          return (
            <div key={category} className="bg-surface p-3 rounded-lg shadow-md">
                <h3 
                  className="font-bold text-lg text-text-primary mb-2 cursor-pointer flex justify-between items-center"
                  onClick={() => setOpenCategory(isCategoryOpen ? null : category)}
                >
                  {category}
                  <motion.span animate={{ rotate: isCategoryOpen ? 180 : 0 }}>▼</motion.span>
                </h3>
                <AnimatePresence>
                {isCategoryOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                        {players.map(player => (
                            <PlayerAnswerCard 
                                key={player.id} 
                                player={player} 
                                answer={lastResult.playerAnswers[player.id]?.[category]}
                                onInitiateVote={() => initiatePlayerVote(player.id, category)}
                                canVote={
                                    canInitiateVote && 
                                    !player.isBot && 
                                    player.id !== localPlayer?.id
                                }
                            />
                        ))}
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
            </div>
          )
        })}
        <div className="bg-background p-3 rounded-lg shadow-lg mt-4">
             <h3 className="font-bold text-lg text-text-primary mb-2">Suma Punktów w Rundzie</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                 {players.map(player => (
                     <div key={player.id} className="flex flex-col items-center p-2 bg-surface rounded-md">
                         <span className="text-sm text-text-secondary truncate">{player.name}</span>
                         <span className={`font-bold text-2xl ${lastResult.isFinalized ? 'text-secondary' : 'text-text-secondary animate-pulse'}`}>
                           {lastResult.isFinalized ? (lastResult.scores[player.id] || 0) : '?'}
                         </span>
                     </div>
                 ))}
             </div>
        </div>
      </div>
      
       <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2 text-center text-text-primary">Punktacja Ogólna</h3>
            <div className="flex flex-wrap justify-center gap-4">
                {sortedPlayers.map(player => (
                    <div key={player.id} className="flex items-center space-x-2 p-2 bg-surface rounded-lg">
                        <PlayerAvatar avatarId={player.avatarId || AVATAR_IDS[0]} activityState={PlayerActivityState.IDLE} size={32} isBot={player.isBot} />
                        <div>
                            <p className="font-semibold text-text-primary">{player.name}</p>
                            <p className="text-sm text-secondary font-bold">{player.score} pkt</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      <div className="mt-8 text-center">
        {isHostOrSolo ? (
          <Button 
            onClick={handleNextAction} 
            size="lg" 
            variant="primary"
            disabled={!lastResult.isFinalized || !!activePlayerVote}
            title={!!activePlayerVote ? "Głosowanie w toku..." : (!lastResult.isFinalized ? "Finalizowanie wyników..." : "")}
          >
            {isLastRound ? 'Zobacz Podsumowanie Gry' : 'Następna Runda'}
          </Button>
        ) : (
          <div className="flex flex-col items-center">
            <LoadingSpinner size="sm"/>
            <p className="text-text-secondary mt-2">Oczekiwanie na akcję hosta...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default RoundResultsScreen;