import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import InputField from '../components/InputField';
import TimerDisplay from '../components/TimerDisplay';
import LoadingSpinner from '../components/LoadingSpinner';
import PlayerAvatar from '../components/PlayerAvatar';
import CountdownOverlay from '../components/CountdownOverlay'; 
import { useGame } from '../contexts/GameContext';
import { GameActionType, Category, Player, PlayerActivityState, BotDifficulty } from '../types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { BOT_DIFFICULTY_LABELS, playAudio, SOUNDS } from '../constants';


const PlayerStatusDisplay: React.FC<{ players: Player[], localPlayerId?: string }> = ({ players, localPlayerId }) => {
  if (!players || players.length === 0) return null;

  return (
    <div className="mb-4 p-3 bg-background rounded-lg shadow">
      <h3 className="text-sm font-semibold text-text-secondary mb-2">Gracze:</h3>
      <div className="flex flex-wrap gap-3">
        {players.map(player => (
          <motion.div 
            key={player.id} 
            className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${player.id === localPlayerId ? 'bg-primary-hover' : 'bg-surface'}`}
            initial={{opacity: 0, y:10}}
            animate={{opacity: 1, y:0}}
            transition={{duration:0.3}}
          >
            <PlayerAvatar avatarId={player.avatarId} activityState={player.activityState} size={32} isBot={player.isBot} />
            <div className="text-xs">
                <span className={`font-semibold ${player.id === localPlayerId ? 'text-white' : 'text-text-primary'}`}>
                    {player.name}
                </span>
                {player.isBot && <span className="block text-sky-400 text-[10px]">({BOT_DIFFICULTY_LABELS[player.botDifficulty || BotDifficulty.MEDIUM]})</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};


const GamePlayScreen: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, dispatch, isLoadingValidation, validateAllAnswers, setPlayerActivity, initiateCountdown, submitAnswersAsClient } = useGame();
  const { settings, currentRound, currentLetter, currentRoundCategories, currentRoundAnswers, allPlayerRoundAnswers, isRoundActive, gameMode, playerName, players, isCountdownActive, countdownSeconds, gamePhase } = gameState;
  
  const [listeningForCategory, setListeningForCategory] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null); // SpeechRecognition instance

  const localPlayer = players.find(p => p.name === playerName && !p.isBot); 
  
  const countdownIntervalRef = useRef<number | null>(null);
  const hasCountdownSoundPlayedRef = useRef(false); 

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Twoja przeglądarka nie wspiera rozpoznawania mowy.", { id: 'speech-unsupported' });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pl-PL';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');

      if (listeningForCategory) {
        handleInputChange(listeningForCategory, transcript);
      }

      if (event.results[0].isFinal) {
        stopListening();
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Błąd rozpoznawania mowy:', event.error);
      if (event.error === 'not-allowed') {
        toast.error('Odmówiono dostępu do mikrofonu.');
      } else if (event.error === 'no-speech') {
        toast.error('Nie wykryto mowy. Spróbuj ponownie.');
      }
      stopListening();
    };

    recognition.onend = () => {
      if(listeningForCategory) {
        stopListening();
      }
    };

    recognitionRef.current = recognition;
  }, [listeningForCategory]); // Re-create if listeningForCategory changes, though it shouldn't

  const startListening = (category: string) => {
    if (recognitionRef.current && !listeningForCategory) {
      setListeningForCategory(category);
      try {
        recognitionRef.current.start();
      } catch (e) {
        // May fail if already started
        console.error("Błąd przy starcie rozpoznawania mowy:", e);
        setListeningForCategory(null);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && listeningForCategory) {
      recognitionRef.current.stop();
      setListeningForCategory(null);
    }
  };


  const forceEndRoundByCountdown = useCallback(() => {
    if (localPlayer) setPlayerActivity(localPlayer.id, PlayerActivityState.SUBMITTED);
    
    if (gameMode === 'solo' || gameMode === 'solo-offline' || (gameMode === 'multiplayer-host' && localPlayer)) {
      dispatch({ type: GameActionType.END_ROUND }); 
      toast.success("Czas minął! (Odliczanie) Walidacja odpowiedzi...", { icon: '⏳' });
      const allAnswersForValidation = { ...allPlayerRoundAnswers, [localPlayer.id]: currentRoundAnswers };
      validateAllAnswers(allAnswersForValidation, currentLetter, localPlayer?.id); 
    } else if (gameMode === 'multiplayer-client' && localPlayer) {
      submitAnswersAsClient();
      toast("Czas minął! (Odliczanie) Odpowiedzi przesłane.", { icon: '⏳' });
    }
  }, [dispatch, currentRoundAnswers, currentLetter, validateAllAnswers, gameMode, localPlayer, setPlayerActivity, submitAnswersAsClient, allPlayerRoundAnswers]);

  const handleTimerEnd = useCallback(() => { 
    if (isRoundActive && !isCountdownActive) { 
      if (localPlayer) setPlayerActivity(localPlayer.id, PlayerActivityState.SUBMITTED);
      if (gameMode === 'solo' || gameMode === 'solo-offline' || (gameMode === 'multiplayer-host' && localPlayer)) {
        dispatch({ type: GameActionType.END_ROUND });
        const validationToastId = toast.loading("Trwa walidacja odpowiedzi...", { id: 'validation-timerend-toast' });
        const allAnswersForValidation = { ...allPlayerRoundAnswers, [localPlayer.id]: currentRoundAnswers };
        validateAllAnswers(allAnswersForValidation, currentLetter, localPlayer?.id)
          .then(() => toast.success("Odpowiedzi zweryfikowane!", {id: validationToastId}))
          .catch(() => toast.error("Błąd podczas walidacji.", {id: validationToastId}));
      } else if (gameMode === 'multiplayer-client' && localPlayer) {
        submitAnswersAsClient();
        toast("Czas minął! Oczekiwanie na wyniki od hosta.", { icon: '⏳' });
      }
    }
  }, [dispatch, currentRoundAnswers, isRoundActive, isCountdownActive, currentLetter, validateAllAnswers, gameMode, localPlayer, setPlayerActivity, submitAnswersAsClient, allPlayerRoundAnswers]); 


  useEffect(() => {
    if (gamePhase !== 'playing') return; 

    if (currentRound > settings.numRounds && (gameMode === 'solo' || gameMode === 'solo-offline' || gameMode === 'multiplayer-host')) {
      dispatch({type: GameActionType.SET_GAME_PHASE, payload: 'summary'});
      return;
    }
  }, [currentRound, settings.numRounds, dispatch, gameMode, gamePhase]);

  useEffect(() => {
    if (isCountdownActive) {
      if (!hasCountdownSoundPlayedRef.current) { 
        playAudio(SOUNDS.COUNTDOWN_START, 0.6); 
        hasCountdownSoundPlayedRef.current = true; 
      }
      
      playAudio(SOUNDS.COUNTDOWN_TICK, 0.2); 

      if (countdownSeconds > 0) {
        countdownIntervalRef.current = window.setTimeout(() => { 
          dispatch({ type: GameActionType.DECREMENT_COUNTDOWN }); 
        }, 1000);
      } else { 
        if (countdownIntervalRef.current) clearTimeout(countdownIntervalRef.current);
        dispatch({ type: GameActionType.END_COUNTDOWN }); 
        forceEndRoundByCountdown(); 
      }
    } else { 
        if (countdownIntervalRef.current) clearTimeout(countdownIntervalRef.current);
        hasCountdownSoundPlayedRef.current = false; 
    }
    return () => { if (countdownIntervalRef.current) clearTimeout(countdownIntervalRef.current); };
  }, [isCountdownActive, countdownSeconds, dispatch, forceEndRoundByCountdown]);


  const handleInputChange = (category: Category, value: string) => {
    if (localPlayer) {
        dispatch({ type: GameActionType.SET_ANSWER, payload: { category, text: value } });
    }
  };

  const handleInputFocus = (category: Category) => {
    if (localPlayer && isRoundActive && localPlayer.activityState !== PlayerActivityState.SUBMITTED && !isCountdownActive) {
      setPlayerActivity(localPlayer.id, PlayerActivityState.TYPING);
    }
  };

  const handleInputBlur = () => {
    if (localPlayer && isRoundActive && localPlayer.activityState !== PlayerActivityState.SUBMITTED && !isCountdownActive) {
      setPlayerActivity(localPlayer.id, PlayerActivityState.THINKING);
    }
  };

  const handleFinishRound = () => { 
    if (!isRoundActive || isCountdownActive || !localPlayer) return; 

    if (gameMode === 'multiplayer-client') {
        submitAnswersAsClient();
        toast.success(`Odpowiedzi przesłane do hosta. Czekaj na wyniki.`);
        return;
    }
    
    setPlayerActivity(localPlayer.id, PlayerActivityState.SUBMITTED);
    dispatch({ type: GameActionType.END_ROUND });
    const validationToastId = toast.loading("Trwa walidacja odpowiedzi...", { id: 'validation-finish-toast' });
    const allAnswersForValidation = { ...allPlayerRoundAnswers, [localPlayer.id]: currentRoundAnswers };
    validateAllAnswers(allAnswersForValidation, currentLetter, localPlayer.id).then(() => {
      toast.success("Odpowiedzi zweryfikowane!", {id: validationToastId});
    }).catch(() => {
       toast.error("Błąd podczas walidacji.", {id: validationToastId});
    });
  };

  const handleQuitGame = () => {
    playAudio(SOUNDS.GAME_QUIT, 0.4); 
    setTimeout(() => {
        dispatch({ type: GameActionType.RESET_GAME });
        navigate('/'); 
    }, 300);
  };
  
  const handleStartCountdown = () => {
    if ((gameMode === 'multiplayer-host' || gameMode === 'solo' || gameMode === 'solo-offline') && isRoundActive && !isCountdownActive && localPlayer) {
      initiateCountdown(); 
    }
  };


  if (gamePhase !== 'playing' || (!isRoundActive && !isLoadingValidation)) {
    if (gamePhase !== 'playing') {
        return <LoadingSpinner text="Przygotowywanie rundy..." />;
    }
  }


  if (isLoadingValidation && localPlayer) {
    return (
      <div className="text-center py-10">
        <PlayerStatusDisplay players={players} localPlayerId={localPlayer?.id} />
        <LoadingSpinner text={`Walidacja Twoich odpowiedzi... Proszę czekać.`} size="lg" />
        <p className="mt-2 text-lg text-primary">Litera: {currentLetter}</p>
      </div>
    );
  }
  
  if (gameMode === 'multiplayer-client' && localPlayer?.activityState === PlayerActivityState.SUBMITTED && isRoundActive) {
      return (
        <div className="text-center py-10">
          <PlayerStatusDisplay players={players} localPlayerId={localPlayer?.id} />
          <LoadingSpinner text={"Oczekiwanie na zakończenie rundy przez innych..."} size="lg" />
          {currentLetter && <p className="mt-2 text-lg text-primary">Runda dla litery: {currentLetter}</p>}
        </div>
      );
  }

  const finishButtonDisabled = !localPlayer || !isRoundActive || isCountdownActive || isLoadingValidation || !currentLetter || (localPlayer?.activityState === PlayerActivityState.SUBMITTED);
  const inputsDisabled = !localPlayer || !isRoundActive || isCountdownActive || isLoadingValidation || !currentLetter || (localPlayer?.activityState === PlayerActivityState.SUBMITTED);
  const isHumanPlayerHostOrSolo = localPlayer && (gameMode === 'multiplayer-host' || gameMode === 'solo' || gameMode === 'solo-offline');


  return (
    <div>
      <CountdownOverlay isActive={isCountdownActive} seconds={countdownSeconds} />
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="text-center md:text-left">
         <h1 className="text-3xl font-bold text-primary">Runda {currentRound > 0 ? currentRound : 1} / {settings.numRounds}</h1>
         {gameMode !== 'solo' && localPlayer && <p className="text-sm text-text-secondary">{localPlayer.name}</p>}
        </div>
        
        <div className="flex items-center gap-6">
            {currentLetter && (
              <div className="text-center">
                <p className="text-sm text-text-secondary">Litera</p>
                <p className="text-6xl md:text-7xl font-bold text-secondary animate-pulse">{currentLetter}</p>
              </div>
            )}
            {!isCountdownActive && <TimerDisplay initialSeconds={settings.roundDurationSeconds} onTimerEnd={handleTimerEnd} isRunning={isRoundActive && !isCountdownActive} />}
        </div>
      </div>
      
      {localPlayer && ( 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
            {currentRoundCategories.map(category => {
              const isListening = listeningForCategory === category;
              return (
              <div key={category} className="flex items-center gap-2">
                <InputField
                  label={category}
                  value={currentRoundAnswers[category]?.text || ''}
                  onChange={(e) => handleInputChange(category, e.target.value)}
                  onFocus={() => handleInputFocus(category)}
                  onBlur={handleInputBlur}
                  placeholder={`Odpowiedź na ${currentLetter}...`}
                  disabled={inputsDisabled || !!listeningForCategory}
                />
                <button
                  onClick={() => isListening ? stopListening() : startListening(category)}
                  disabled={inputsDisabled}
                  className={`mt-6 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-surface hover:bg-slate-600 text-text-secondary'}`}
                  aria-label={isListening ? 'Zatrzymaj nagrywanie' : 'Nagraj odpowiedź głosowo'}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line>
                    </svg>
                </button>
              </div>
            )})}
          </div>
      )}
      {!localPlayer && gameMode !== 'solo' && (
          <div className="my-8 p-4 bg-surface rounded-lg text-center text-text-secondary">
            Jesteś obserwatorem lub wystąpił błąd.
          </div>
      )}

      {(gameMode !== 'solo') && <PlayerStatusDisplay players={players} localPlayerId={localPlayer?.id} />}

      <div className="flex flex-col-reverse sm:flex-col mt-8 gap-3">
        {localPlayer && ( 
            <Button 
                onClick={handleFinishRound} 
                size="lg" 
                fullWidth 
                disabled={finishButtonDisabled} 
                isLoading={isLoadingValidation && localPlayer !== undefined}
            >
            {gameMode === 'multiplayer-client' ? 'Prześlij Odpowiedzi' : 'Zakończ Rundę i Sprawdź'}
            </Button>
        )}
        {isHumanPlayerHostOrSolo && isRoundActive && !isCountdownActive && (
            <Button onClick={handleStartCountdown} size="md" fullWidth variant="secondary">
                ODLICZANIE 10 SEKUND
            </Button>
        )}
        <Button onClick={handleQuitGame} variant="danger" size="md" fullWidth disabled={isLoadingValidation && localPlayer !== undefined}>
          Zakończ Grę
        </Button>
      </div>
    </div>
  );
};

export default GamePlayScreen;