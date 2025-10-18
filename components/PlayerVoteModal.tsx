import React from 'react';
// @google/genai-codex-fix: Import `Variants` type from framer-motion.
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Button from './Button';
import { useGame } from '../contexts/GameContext';
import PlayerAvatar from './PlayerAvatar';
import { PlayerActivityState } from '../types';

const PlayerVoteModal: React.FC = () => {
    const { gameState, castPlayerVote, cancelPlayerVote } = useGame();
    const { activePlayerVote, players, playerName } = gameState;

    if (!activePlayerVote) {
        return null;
    }

    const localPlayer = players.find(p => p.name === playerName && !p.isBot);
    const targetPlayer = players.find(p => p.id === activePlayerVote.targetPlayerId);

    if (!localPlayer || !targetPlayer) {
        return null; // Should not happen
    }

    const isMyAnswer = localPlayer.id === targetPlayer.id;
    const isHost = localPlayer.isHost;
    const isInitiator = localPlayer.id === activePlayerVote.initiatorId;
    const haveIVoted = activePlayerVote.votes.hasOwnProperty(localPlayer.id);

    const eligibleVoters = players.filter(p => !p.isBot && p.id !== targetPlayer.id);

    const handleVote = (isValid: boolean) => {
        if (!isMyAnswer && !haveIVoted) {
            castPlayerVote(isValid);
        }
    };

    const handleCancel = () => {
        if (isHost || isInitiator) {
            cancelPlayerVote();
        }
    };
    
    const challengedAnswer = gameState.roundResults[gameState.roundResults.length - 1]
        ?.playerAnswers[activePlayerVote.targetPlayerId]?.[activePlayerVote.category];

    if (!challengedAnswer) return null;


    const backdropVariants = {
        visible: { opacity: 1 },
        hidden: { opacity: 0 },
    };

    // @google/genai-codex-fix: Explicitly type `modalVariants` to resolve type inference issue.
    const modalVariants: Variants = {
        hidden: { y: "-50px", opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } },
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
            >
                <motion.div
                    className="bg-surface p-6 rounded-lg shadow-xl w-full max-w-lg mx-auto"
                    variants={modalVariants}
                >
                    <h2 className="text-2xl font-bold text-primary mb-4">Głosowanie Graczy</h2>
                    <p className="text-text-secondary mb-1">
                        Gracz <span className="font-semibold text-text-primary">{targetPlayer.name}</span> odpowiedział:
                    </p>
                    <div className="my-4 p-4 bg-background rounded-md border border-slate-600">
                        <p className="text-sm text-text-secondary">Kategoria: <span className="font-bold">{activePlayerVote.category}</span></p>
                        <p className="text-2xl font-bold text-secondary break-words">"{challengedAnswer.text}"</p>
                        <p className={`mt-2 text-xs italic ${activePlayerVote.originalIsValid ? 'text-green-400' : 'text-red-400'}`}>
                            Werdykt AI: {activePlayerVote.originalIsValid ? 'Poprawna' : 'Niepoprawna'}. ({activePlayerVote.originalReason})
                        </p>
                    </div>

                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-text-secondary mb-2">Głosujący ({Object.keys(activePlayerVote.votes).length}/{eligibleVoters.length}):</h3>
                        <div className="flex flex-wrap gap-2">
                            {eligibleVoters.map(player => (
                                <div key={player.id} className="flex items-center space-x-1.5 text-xs p-1.5 bg-slate-600 rounded">
                                    <PlayerAvatar avatarId={player.avatarId} activityState={PlayerActivityState.IDLE} size={16} />
                                    <span>{player.name}</span>
                                    {activePlayerVote.votes.hasOwnProperty(player.id) ? (
                                        <span className="text-green-400">✓</span>
                                    ) : (
                                        <span className="text-slate-400 animate-pulse">...</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <p className="text-text-primary mb-6">Czy uważasz, że ta odpowiedź jest poprawna?</p>
                    <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
                        {(isHost || isInitiator) && (
                             <Button onClick={handleCancel} variant="ghost" size="md">
                                Anuluj Głosowanie
                            </Button>
                        )}
                        <div className="flex-grow flex justify-end gap-4">
                            <Button onClick={() => handleVote(false)} variant="danger" size="lg" disabled={isMyAnswer || haveIVoted}>
                                Niepoprawna
                            </Button>
                            <Button onClick={() => handleVote(true)} variant="secondary" size="lg" disabled={isMyAnswer || haveIVoted}>
                                Poprawna
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default PlayerVoteModal;
