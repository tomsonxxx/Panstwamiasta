import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useGame } from '../contexts/GameContext';
import { GameActionType, Player, PlayerActivityState } from '../types';
import PlayerAvatar from '../components/PlayerAvatar';
import { motion } from 'framer-motion';
import { AVATAR_IDS } from '../constants';
import VictoryConfetti from '../components/VictoryConfetti';
import LoadingSpinner from '../components/LoadingSpinner';
import PlayerVoteModal from '../components/PlayerVoteModal';
import toast from 'react-hot-toast';

const getPointsClass = (score: number) => {
    if (score >= 15) return 'text-green-400';
    if (score >= 10) return 'text-yellow-400';
    if (score >= 5) return 'text-blue-400';
    if (score > 0) return 'text-sky-400';
    return 'text-red-500';
};

const RoundResultsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, dispatch, finalizeAndRecalculateScores, initiatePlayerVote, overrideAnswerValidity } = useGame();
  const { players, currentRound, settings, roundResults, gamePhase, gameMode, playerName, activePlayerVote } = gameState;

  const localPlayer = players.find(p => p.name === playerName && !p.isBot);
  const isHostOrSolo = gameMode === 'multiplayer-host' || gameMode === 'solo' || gameMode === 'solo-offline';
  const isSoloMode = gameMode === 'solo' || gameMode === 'solo-offline';

  const lastResult = roundResults.length > 0 ? roundResults[roundResults.length - 1] : null;

  useEffect(() => {
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
  
  const handleInitiateSoloVote = (playerId: string, category: string) => {
    const answer = lastResult?.playerAnswers[playerId]?.[category];
    if (!answer || !isSoloMode) return;

    toast((t) => (
      <div className="flex flex-col items-center gap-3 p-2 text-text-primary">
        <p className="text-center">Jak oceniasz odpowiedź <span className="font-bold text-secondary">"{answer.text}"</span> w kategorii <span className="font-bold text-primary">{category}</span>?</p>
        <p className="text-xs italic text-slate-400 text-center">AI: {answer.reason}</p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const roundIndex = roundResults.length - 1;
              overrideAnswerValidity(roundIndex, playerId, category, true);
              toast.dismiss(t.id);
            }}
          >
            Poprawna
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              const roundIndex = roundResults.length - 1;
              overrideAnswerValidity(roundIndex, playerId, category, false);
              toast.dismiss(t.id);
            }}
          >
            Niepoprawna
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toast.dismiss(t.id)}>
            Anuluj
          </Button>
        </div>
      </div>
    ), { duration: 15000, id: `solo-vote-${playerId}-${category}` });
  };


  const isLastRound = currentRound >= settings.numRounds;

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === localPlayer?.id) return -1;
    if (b.id === localPlayer?.id) return 1;
    if (a.isBot && !b.isBot) return 1;
    if (!a.isBot && b.isBot) return -1;
    return a.name.localeCompare(b.name);
  });
  
  const roundWinner = [...players].sort((a,b) => (lastResult.scores[b.id] || 0) - (lastResult.scores[a.id] || 0))[0];
  const playerWonRound = localPlayer && roundWinner?.id === localPlayer.id && (lastResult.scores[localPlayer.id] || 0) > 0;

  const canInitiateMultiplayerVote = isHostOrSolo && !isSoloMode && lastResult.isFinalized && !activePlayerVote;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-full mx-auto"
    >
      {playerWonRound && <VictoryConfetti />}
      <PlayerVoteModal />
      <h1 className="text-3xl font-bold mb-2 text-center text-primary">Wyniki Rundy {lastResult.roundNumber}</h1>
      <p className="text-center text-5xl font-bold text-secondary mb-6">Litera: {lastResult.letter}</p>
      
        <div className="overflow-x-auto bg-surface p-1 sm:p-4 rounded-lg shadow-md">
            <table className="min-w-full text-sm text-left border-separate border-spacing-0">
                <thead className="bg-background/50">
                    <tr>
                        <th className="p-2 sticky left-0 bg-background z-10 font-semibold text-text-primary">Kategoria</th>
                        {sortedPlayers.map(player => (
                            <th key={player.id} className="p-2 text-center whitespace-nowrap">
                                <div className="flex flex-col items-center gap-1">
                                    <PlayerAvatar avatarId={player.avatarId} activityState={PlayerActivityState.IDLE} size={32} isBot={player.isBot} />
                                    <span className="font-semibold text-text-primary text-xs truncate max-w-24">{player.name}</span>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                    {gameState.currentRoundCategories.map(category => (
                        <tr key={category}>
                            <td className="p-2 font-bold text-text-primary sticky left-0 bg-surface z-10 align-top">{category}</td>
                            {sortedPlayers.map(player => {
                                const answer = lastResult.playerAnswers[player.id]?.[category];
                                const totalScore = (answer?.score || 0) + (answer?.bonusPoints || 0);
                                const canVoteOnThis = (isSoloMode && lastResult.isFinalized && player.id === localPlayer?.id) || (canInitiateMultiplayerVote && !player.isBot && player.id !== localPlayer?.id);

                                return (
                                    <td key={`${player.id}-${category}`} className={`p-2 align-top border-t border-slate-600 ${answer?.isValid ? 'bg-green-900/20' : (answer?.text ? 'bg-red-900/20' : 'bg-transparent')}`}>
                                        {answer && (
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <p className="font-semibold text-base text-text-primary break-words pr-2">{answer.text || "-"}</p>
                                                    <p className={`font-bold text-lg whitespace-nowrap ${getPointsClass(totalScore)}`}>
                                                        {lastResult.isFinalized ? totalScore : '?'}
                                                    </p>
                                                </div>
                                                {answer.voteOverridden && (
                                                    <span className={`text-xs italic ${answer.voteOverridden === 'valid' ? 'text-green-400' : 'text-red-400'}`} title="Werdykt zmieniony przez gracza">
                                                        {answer.voteOverridden === 'valid' ? '✓ Ocena gracza' : '✗ Ocena gracza'}
                                                    </span>
                                                )}
                                                {answer.bonusPoints > 0 && answer.bonusPointsReason && (
                                                    <p className="text-xs text-amber-400 italic" title="Uzasadnienie punktów bonusowych">+ {answer.bonusPointsReason}</p>
                                                )}
                                                {lastResult.isFinalized && !answer.isValid && answer.reason && (
                                                    <p className="text-xs text-red-300/80 italic mt-1">{answer.reason}</p>
                                                )}

                                                {canVoteOnThis && (
                                                    <button 
                                                        onClick={() => isSoloMode ? handleInitiateSoloVote(player.id, category) : initiatePlayerVote(player.id, category)} 
                                                        title="Podważ ocenę odpowiedzi" 
                                                        className="mt-1 text-xs text-sky-400 hover:text-sky-300"
                                                    >
                                                        Podważ
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                    <tr className="bg-background/50 font-bold">
                        <td className="p-2 sticky left-0 bg-background z-10">Suma w Rundzie</td>
                        {sortedPlayers.map(player => (
                            <td key={player.id} className="p-2 text-center text-xl text-secondary">
                               {lastResult.isFinalized ? (lastResult.scores[player.id] || 0) : '?'}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
      
       <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2 text-center text-text-primary">Punktacja Ogólna</h3>
            <div className="flex flex-wrap justify-center gap-4">
                {[...players].sort((a, b) => b.score - a.score).map(player => (
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