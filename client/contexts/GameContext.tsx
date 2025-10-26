
import React, { createContext, useContext, useReducer, ReactNode, useCallback, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import {
  GameActionType,
  GameState,
  GameSettings,
  Player,
  RoundAnswers,
  Category,
  Answer,
  GameMode,
  GamePhase,
  BotDifficulty,
  BotSetupConfig,
  MultiplayerMessage,
  PlayerActivityState,
  ActivePlayerVote,
  RoundResult
} from '../types';
import {
  DEFAULT_CATEGORIES_PER_ROUND,
  DEFAULT_NUM_ROUNDS,
  DEFAULT_ROUND_DURATION_SECONDS,
  ALL_CATEGORIES,
  AVATAR_IDS,
  POLISH_ALPHABET,
  POINTS_CORRECT_SHARED,
  POINTS_CORRECT_SOLO,
  POINTS_CORRECT_UNIQUE,
  POINTS_INVALID_OR_EMPTY,
  BOT_NAME_PREFIX
} from '../constants';
import { validateAnswerWithAI, generateAnswerForBotWithMainAI } from '../services/geminiService';
import { loadKnowledgeBase, validateAnswerWithKB, getAnswerFromKB, getKnowledgeBaseStatus } from '../screens/localKnowledgeBaseService';
import { 
    connectToServer, 
    disconnectFromServer, 
    getRooms as getRoomsFromServer,
    createRoom as createRoomOnServer,
    joinRoom as joinRoomOnServer,
    leaveRoom as leaveRoomOnServer,
    relayMessage,
    broadcastGameState,
    onJoinSuccess,
    onRoomNotFound,
    onGameStateSync,
    onMessageRelayed,
    cleanupListeners
} from '../services/multiplayerService';
import toast from 'react-hot-toast';


const initialState: GameState = {
  gameMode: null,
  gamePhase: 'ended',
  settings: {
    roundDurationSeconds: DEFAULT_ROUND_DURATION_SECONDS,
    numRounds: DEFAULT_NUM_ROUNDS,
    categoriesPerRound: DEFAULT_CATEGORIES_PER_ROUND,
    selectedCategories: ALL_CATEGORIES.slice(0, DEFAULT_CATEGORIES_PER_ROUND),
  },
  players: [],
  playerName: localStorage.getItem('paM_playerName') || 'Gracz',
  playerAvatarId: localStorage.getItem('paM_playerAvatarId') || AVATAR_IDS[0],
  currentRound: 0,
  currentLetter: '',
  currentRoundCategories: [],
  currentRoundAnswers: {},
  allPlayerRoundAnswers: {},
  isRoundActive: false,
  roundResults: [],
  totalScore: 0,
  isLoadingValidation: false,
  apiKeyOk: false,
  isKnowledgeBaseLoaded: false,
  roomId: null,
  multiplayerRoundScores: {},
  letterDrawingPlayerId: null,
  letterDrawingPlayerName: null,
  isLetterMachineActive: false,
  letterMachineDisplayContent: '?',
  isCountdownActive: false,
  countdownSeconds: 10,
  activePlayerVote: null,
};

// ... (rest of the imports)

const gameReducer = (state: GameState, action: { type: GameActionType, payload?: any }): GameState => {
  switch (action.type) {
    case GameActionType.SET_GAME_PHASE:
      return { ...state, gamePhase: action.payload };

    case GameActionType.UPDATE_SETTINGS:
      return { ...state, settings: action.payload };

    case GameActionType.SET_PLAYER_NAME:
      localStorage.setItem('paM_playerName', action.payload);
      return { ...state, playerName: action.payload };

    case GameActionType.SET_PLAYER_AVATAR:
      localStorage.setItem('paM_playerAvatarId', action.payload);
      return { ...state, playerAvatarId: action.payload };

    case GameActionType.INITIALIZE_GAME: {
      const { settings, gameMode } = action.payload;
      const humanPlayer: Player = {
        id: nanoid(),
        name: state.playerName,
        score: 0,
        avatarId: state.playerAvatarId,
        isBot: false,
        isHost: gameMode === 'multiplayer-host' || gameMode === 'solo' || gameMode === 'solo-offline',
        activityState: PlayerActivityState.IDLE,
      };
      return {
        ...initialState,
        settings,
        gameMode,
        playerName: state.playerName,
        playerAvatarId: state.playerAvatarId,
        players: [humanPlayer],
        gamePhase: gameMode === 'solo-offline' ? 'offline_config' : 'letter_drawing',
        apiKeyOk: state.apiKeyOk,
        isKnowledgeBaseLoaded: state.isKnowledgeBaseLoaded,
      };
    }
    
    case GameActionType.START_OFFLINE_GAME_WITH_BOTS: {
        const { botsToCreate } = action.payload as { botsToCreate: BotSetupConfig[] };
        const humanPlayer = state.players.find(p => !p.isBot);
        if (!humanPlayer) return state; // Should not happen

        const botPlayers: Player[] = botsToCreate.map((botConfig, index) => ({
            id: botConfig.id,
            name: botConfig.name,
            score: 0,
            avatarId: AVATAR_IDS[(index + 1) % AVATAR_IDS.length],
            isBot: true,
            botDifficulty: botConfig.difficulty,
            activityState: PlayerActivityState.IDLE,
        }));

        return {
            ...state,
            players: [humanPlayer, ...botPlayers],
            gamePhase: 'letter_drawing',
        };
    }

    case GameActionType.SET_LETTER_DRAWING_PLAYER: {
        const { playerId, playerName } = action.payload;
        return {
            ...state,
            letterDrawingPlayerId: playerId,
            letterDrawingPlayerName: playerName,
            isLetterMachineActive: false,
            letterMachineDisplayContent: '?',
        };
    }
    
    case GameActionType.START_LETTER_MACHINE:
        return { ...state, isLetterMachineActive: true };
    
    case GameActionType.SET_LETTER_MACHINE_CONTENT:
        return { ...state, letterMachineDisplayContent: action.payload };
    
    case GameActionType.STOP_LETTER_MACHINE:
        return { ...state, isLetterMachineActive: false, currentLetter: action.payload };
        
    case GameActionType.START_NEW_ROUND: {
      const categoriesForRound = [...state.settings.selectedCategories].sort(() => 0.5 - Math.random()).slice(0, state.settings.categoriesPerRound);
      const initialAnswers = categoriesForRound.reduce((acc, category) => {
        acc[category] = { text: '', score: 0, bonusPoints: 0 };
        return acc;
      }, {} as RoundAnswers);

      return {
        ...state,
        currentRound: state.currentRound + 1,
        isRoundActive: true,
        currentRoundCategories: categoriesForRound,
        currentRoundAnswers: initialAnswers,
        allPlayerRoundAnswers: {},
        gamePhase: 'playing',
        isCountdownActive: false,
        countdownSeconds: 10,
        activePlayerVote: null, // Clear any previous vote
      };
    }
    
    case GameActionType.END_ROUND:
      return { ...state, isRoundActive: false, isLoadingValidation: true };

    case GameActionType.PROCESS_VALIDATION_RESULTS: {
        const { playerAnswers, scores, letter, roundNumber } = action.payload;
        const newRoundResult: RoundResult = { roundNumber, letter, playerAnswers, scores, isFinalized: false };
        
        const updatedPlayers = state.players.map(player => ({
            ...player,
            // Scores are finalized later after votes
            activityState: PlayerActivityState.IDLE,
        }));

        return {
            ...state,
            isLoadingValidation: false,
            roundResults: [...state.roundResults.filter(r => r.roundNumber !== roundNumber), newRoundResult],
            players: updatedPlayers,
            gamePhase: 'results',
        };
    }

    case GameActionType.FINALIZE_AND_RECALCULATE_SCORES: {
        const { roundIndex, updatedRoundResult, updatedPlayers } = action.payload;
        const newRoundResults = [...state.roundResults];
        newRoundResults[roundIndex] = updatedRoundResult;

        const updatedMultiplayerScores = { ...state.multiplayerRoundScores };
        Object.keys(updatedRoundResult.scores).forEach(playerId => {
            if (!updatedMultiplayerScores[playerId]) {
                updatedMultiplayerScores[playerId] = {};
            }
            updatedMultiplayerScores[playerId][updatedRoundResult.roundNumber] = updatedRoundResult.scores[playerId];
        });
        
        return {
            ...state,
            roundResults: newRoundResults,
            players: updatedPlayers,
            multiplayerRoundScores: updatedMultiplayerScores
        };
    }
    
    case GameActionType.NEXT_ROUND:
        return {
            ...state,
            gamePhase: 'letter_drawing'
        };

    case GameActionType.RESET_GAME:
      return {
          ...initialState,
          playerName: state.playerName,
          playerAvatarId: state.playerAvatarId,
          apiKeyOk: state.apiKeyOk,
          isKnowledgeBaseLoaded: state.isKnowledgeBaseLoaded
      };

    case GameActionType.REPLAY_GAME: { // For solo, solo-offline and multiplayer-host
        const { gameMode } = state;
        // @google/genai-codex-fix: Explicitly type `nextPhase` as `GamePhase` to resolve type inference issue.
        const nextPhase: GamePhase = gameMode === 'multiplayer-host' 
            ? 'lobby' 
            : (gameMode === 'solo-offline' ? 'offline_config' : 'letter_drawing');

        const baseState = {
             ...state,
            gamePhase: nextPhase,
            currentRound: 0,
            currentLetter: '',
            roundResults: [],
            multiplayerRoundScores: {},
            isRoundActive: false,
            isCountdownActive: false,
            countdownSeconds: 10,
            letterDrawingPlayerId: null,
            letterDrawingPlayerName: null,
            isLetterMachineActive: false,
            activePlayerVote: null,
            currentRoundAnswers: {},
            allPlayerRoundAnswers: {},
        }

        if (gameMode === 'solo-offline') {
            // Reset players to just the human, as they will re-configure bots
            const humanPlayer = state.players.find(p => !p.isBot);
            if(humanPlayer){
                 return { ...baseState, players: [{ ...humanPlayer, score: 0, activityState: PlayerActivityState.IDLE }] };
            }
        }
        
        // For solo and multiplayer-host, just reset scores
        return {
            ...baseState,
            players: state.players.map(p => ({ ...p, score: 0, activityState: PlayerActivityState.IDLE })),
        };
    }
      
    case GameActionType.SET_ANSWER: {
      const { category, text } = action.payload;
      return {
        ...state,
        currentRoundAnswers: {
          ...state.currentRoundAnswers,
          [category]: { ...state.currentRoundAnswers[category], text },
        },
      };
    }
    
    case GameActionType.SET_API_KEY_STATUS:
      return { ...state, apiKeyOk: action.payload };

    case GameActionType.SET_KNOWLEDGE_BASE_STATUS:
      return { ...state, isKnowledgeBaseLoaded: action.payload };

    case GameActionType.SET_GAME_MODE:
        return { ...state, gameMode: action.payload };

    case GameActionType.SET_ROOM_ID:
        return { ...state, roomId: action.payload };
    
    case GameActionType.CREATE_ROOM: {
        const { roomId, hostPlayer } = action.payload;
        return {
            ...state,
            gameMode: 'multiplayer-host',
            roomId,
            players: [hostPlayer],
            gamePhase: 'lobby'
        };
    }

    case GameActionType.JOIN_ROOM: {
        const { roomId, player } = action.payload;
        // Host is set by the server/state sync
        const newPlayer = {...player, isHost: false};
        return { ...state, gameMode: 'multiplayer-client', roomId, players: [newPlayer], gamePhase: 'lobby' };
    }
    
    case GameActionType.LEAVE_ROOM:
        return {
            ...state,
            gameMode: null,
            roomId: null,
            players: [],
            gamePhase: 'ended',
            currentRound: 0,
            roundResults: [],
        };

    case GameActionType.UPDATE_PLAYERS_IN_ROOM:
        return { ...state, players: action.payload };
        
    case GameActionType.HOST_RECEIVE_CLIENT_ANSWERS: {
        const { playerId, answers } = action.payload;
        return {
            ...state,
            allPlayerRoundAnswers: {
                ...state.allPlayerRoundAnswers,
                [playerId]: answers
            },
             players: state.players.map(p => p.id === playerId ? {...p, activityState: PlayerActivityState.SUBMITTED} : p)
        };
    }

    case GameActionType.CLIENT_RECEIVE_GAME_STATE: {
      const { currentRoundAnswers: _localAnswers, ...restOfState } = action.payload;
      return { 
          ...state, 
          ...restOfState,
          // Zachowaj lokalne odpowiedzi gracza, aby uniknąć ich nadpisania przez stan hosta
          currentRoundAnswers: state.isRoundActive ? state.currentRoundAnswers : _localAnswers, 
      };
    }

    case GameActionType.SET_PLAYER_ACTIVITY:
        const { playerId, activityState } = action.payload;
        return {
            ...state,
            players: state.players.map(p => p.id === playerId ? {...p, activityState} : p)
        };

    case GameActionType.INITIATE_COUNTDOWN:
        return { ...state, isCountdownActive: true, countdownSeconds: 10 };
    
    case GameActionType.DECREMENT_COUNTDOWN:
        return { ...state, countdownSeconds: Math.max(0, state.countdownSeconds - 1) };
    
    case GameActionType.END_COUNTDOWN:
        return { ...state, isCountdownActive: false };

    case GameActionType.HOST_BROADCAST_GAME_STATE:
        // This is a special action that doesn't change state but is used to trigger an effect
        return state;

    case GameActionType.INITIATE_PLAYER_VOTE:
        return { ...state, activePlayerVote: action.payload };

    case GameActionType.CAST_PLAYER_VOTE:
        if (!state.activePlayerVote) return state;
        return {
            ...state,
            activePlayerVote: {
                ...state.activePlayerVote,
                votes: { ...state.activePlayerVote.votes, ...action.payload }
            }
        };
    
    case GameActionType.CANCEL_PLAYER_VOTE:
        return { ...state, activePlayerVote: null };

    case GameActionType.RESOLVE_PLAYER_VOTE: {
        if (!state.activePlayerVote) return state;
        const { targetPlayerId, category, finalIsValid } = action.payload;
        const roundIndex = state.roundResults.length - 1;
        if (roundIndex < 0) return state;
        
        const newRoundResults = [...state.roundResults];
        const newPlayerAnswers = { ...newRoundResults[roundIndex].playerAnswers };
        const targetAnswer = newPlayerAnswers[targetPlayerId]?.[category];

        if (targetAnswer) {
            targetAnswer.isValid = finalIsValid;
            targetAnswer.voteOverridden = targetAnswer.isValid !== state.activePlayerVote.originalIsValid
                ? (finalIsValid ? 'valid' : 'invalid')
                : null;
        }

        return {
            ...state,
            roundResults: newRoundResults,
            activePlayerVote: null,
        };
    }
    
    case GameActionType.OVERRIDE_ANSWER_VALIDITY: {
        const { roundIndex, playerId, category, newIsValid } = action.payload;
        if (roundIndex < 0 || roundIndex >= state.roundResults.length) return state;

        // Create a deep copy to avoid mutation issues
        const newRoundResults = JSON.parse(JSON.stringify(state.roundResults));
        const roundResult = newRoundResults[roundIndex];
        const answer = roundResult.playerAnswers[playerId]?.[category];

        if (answer) {
            const originalIsValid = answer.isValid;
            answer.isValid = newIsValid;
            answer.voteOverridden = originalIsValid !== newIsValid ? (newIsValid ? 'valid' : 'invalid') : null;
            answer.reason = `Werdykt AI zmieniony przez gracza. Nowa ocena: ${newIsValid ? 'Poprawna' : 'Niepoprawna'}.`;
        }

        return { ...state, roundResults: newRoundResults };
    }


    default:
      return state;
  }
};

const GameContext = createContext<{
  gameState: GameState;
  dispatch: React.Dispatch<{ type: GameActionType; payload?: any }>;
  validateAllAnswers: (allAnswers: Record<string, RoundAnswers>, letter: string, localPlayerId?: string) => Promise<void>;
  createRoom: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  startGameAsHost: () => void;
  addBotPlayer: (difficulty: BotDifficulty) => void;
  removeBotPlayer: (botId: string) => void;
  setPlayerActivity: (playerId: string, activityState: PlayerActivityState) => void;
  pullLetterMachineLever: () => void;
  stopLetterMachine: () => void;
  initiateCountdown: () => void;
  submitAnswersAsClient: () => void;
  initiatePlayerVote: (targetPlayerId: string, category: Category) => void;
  castPlayerVote: (vote: boolean) => void;
  cancelPlayerVote: () => void;
  finalizeAndRecalculateScores: (roundIndex: number) => void;
  overrideAnswerValidity: (roundIndex: number, playerId: string, category: string, newIsValid: boolean) => void;
  isLoadingValidation: boolean;
}>({
  gameState: initialState,
  dispatch: () => null,
  validateAllAnswers: async () => {},
  createRoom: () => {},
  joinRoom: () => {},
  leaveRoom: () => {},
  startGameAsHost: () => {},
  addBotPlayer: () => {},
  removeBotPlayer: () => {},
  setPlayerActivity: () => {},
  pullLetterMachineLever: () => {},
  stopLetterMachine: () => {},
  initiateCountdown: () => {},
  submitAnswersAsClient: () => {},
  initiatePlayerVote: () => {},
  castPlayerVote: () => {},
  cancelPlayerVote: () => {},
  finalizeAndRecalculateScores: () => {},
  overrideAnswerValidity: () => {},
  isLoadingValidation: false,
});

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, initialState);
  const letterMachineInterval = useRef<number | null>(null);

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const checkKB = async () => {
      const loaded = await loadKnowledgeBase();
      dispatch({ type: GameActionType.SET_KNOWLEDGE_BASE_STATUS, payload: loaded });
    };
    checkKB();
  }, []);

  const getLocalPlayer = useCallback(() => {
      const { players, playerName } = gameStateRef.current;
      return players.find(p => p.name === playerName && !p.isBot);
  }, []);
  
  // --- SCORE RECALCULATION LOGIC ---
  const recalculateScoresForRound = useCallback((roundResult: RoundResult) => {
    const { playerAnswers, letter } = roundResult;
    const currentCategories = Object.keys(playerAnswers[Object.keys(playerAnswers)[0]] || {});

    // Create a deep copy to avoid direct state mutation
    let finalPlayerAnswers: Record<string, RoundAnswers> = JSON.parse(JSON.stringify(playerAnswers));

    // 1. Build a map of valid answers for each category
    const categoryAnswers: Record<Category, { playerId: string, text: string }[]> = {};
    currentCategories.forEach(cat => categoryAnswers[cat] = []);

    Object.entries(finalPlayerAnswers).forEach(([playerId, answers]) => {
        Object.entries(answers).forEach(([category, answer]) => {
            if (answer.isValid) {
                categoryAnswers[category].push({ playerId, text: answer.text.trim().toLowerCase() });
            }
        });
    });

    // 2. Recalculate scores based on the new validity map
    Object.entries(finalPlayerAnswers).forEach(([playerId, answers]) => {
        Object.entries(answers).forEach(([category, answer]) => {
            let score = POINTS_INVALID_OR_EMPTY;
            if (answer.isValid) {
                const validAnswersForCat = categoryAnswers[category];
                const competingAnswers = validAnswersForCat.filter(a => a.text === answer.text.trim().toLowerCase());
                
                if (competingAnswers.length === 1) { // Unique answer
                    score = POINTS_CORRECT_UNIQUE;
                } else { // Shared answer
                    score = POINTS_CORRECT_SHARED;
                }
                
                if (validAnswersForCat.length === 1) { // Only person with a valid answer
                    score = POINTS_CORRECT_SOLO;
                }
            }
            finalPlayerAnswers[playerId][category].score = score;
        });
    });
    
    // 3. Tally up new total scores for the round
    const roundScores: Record<string, number> = {};
    Object.entries(finalPlayerAnswers).forEach(([playerId, answers]) => {
        roundScores[playerId] = Object.values(answers).reduce((total, ans) => total + ans.score + (ans.bonusPoints || 0), 0);
    });

    return {
        updatedPlayerAnswers: finalPlayerAnswers,
        updatedRoundScores: roundScores
    };
  }, []);
  
  const finalizeAndRecalculateScores = useCallback((roundIndex: number) => {
    if (gameState.gameMode !== 'multiplayer-host' && gameState.gameMode !== 'solo' && gameState.gameMode !== 'solo-offline') return;

    const currentRoundResult = gameState.roundResults[roundIndex];
    if (!currentRoundResult) return;
    
    const { updatedPlayerAnswers, updatedRoundScores } = recalculateScoresForRound(currentRoundResult);

    const updatedRoundResult: RoundResult = {
        ...currentRoundResult,
        playerAnswers: updatedPlayerAnswers,
        scores: updatedRoundScores,
        isFinalized: true
    };

    const baseScores: Record<string, number> = {};
    gameState.players.forEach(p => baseScores[p.id] = 0);
    
    const allRoundResults = [...gameState.roundResults];
    allRoundResults[roundIndex] = updatedRoundResult;

    // Recalculate total scores from ALL finalized rounds
    const finalizedRounds = allRoundResults.filter(r => r.isFinalized);
    finalizedRounds.forEach(result => {
        Object.entries(result.scores).forEach(([playerId, score]) => {
            if (baseScores[playerId] !== undefined) {
                baseScores[playerId] += score as number;
            }
        });
    });

    const updatedPlayers = gameState.players.map(player => ({
        ...player,
        score: baseScores[player.id] || 0
    }));

    dispatch({ 
        type: GameActionType.FINALIZE_AND_RECALCULATE_SCORES, 
        payload: { roundIndex, updatedRoundResult, updatedPlayers }
    });

  }, [gameState.gameMode, gameState.roundResults, gameState.players, recalculateScoresForRound]);
  
  const isSoloMode = gameState.gameMode === 'solo' || gameState.gameMode === 'solo-offline';

  const overrideAnswerValidity = useCallback((roundIndex: number, playerId: string, category: string, newIsValid: boolean) => {
      if (!isSoloMode) return;
      dispatch({ 
          type: GameActionType.OVERRIDE_ANSWER_VALIDITY, 
          payload: { roundIndex, playerId, category, newIsValid }
      });
      // Recalculate scores after a short delay to ensure state update has propagated
      setTimeout(() => finalizeAndRecalculateScores(roundIndex), 50);
  }, [finalizeAndRecalculateScores, isSoloMode]);

  const sendRelayedMessage = useCallback((type: MultiplayerMessage['type'], payload?: any) => {
      const localPlayer = getLocalPlayer();
      const roomId = gameStateRef.current.roomId;
      if (localPlayer && roomId) {
          relayMessage(roomId, { type, senderId: localPlayer.id, payload });
      }
  }, [getLocalPlayer]);

  const initiatePlayerVote = useCallback((targetPlayerId: string, category: Category) => {
    const localPlayer = getLocalPlayer();
    const currentRoundResult = gameStateRef.current.roundResults[gameStateRef.current.roundResults.length - 1];
    
    if (!localPlayer || !currentRoundResult || gameStateRef.current.activePlayerVote) return;
    
    const answerToVote = currentRoundResult.playerAnswers[targetPlayerId]?.[category];
    if (!answerToVote) return;

    const votePayload: ActivePlayerVote = {
        initiatorId: localPlayer.id,
        targetPlayerId,
        category,
        originalIsValid: !!answerToVote.isValid,
        originalReason: answerToVote.reason || 'Brak uzasadnienia AI.',
        votes: {}
    };

    if(gameStateRef.current.gameMode === 'multiplayer-host') {
        dispatch({ type: GameActionType.INITIATE_PLAYER_VOTE, payload: votePayload });
    } else {
        sendRelayedMessage('initiate_vote', votePayload);
    }
  }, [getLocalPlayer, sendRelayedMessage]);

  const castPlayerVote = useCallback((vote: boolean) => {
      const localPlayer = getLocalPlayer();
      if (!localPlayer || !gameStateRef.current.activePlayerVote) return;
      const votePayload = { [localPlayer.id]: vote };
      
      if(gameStateRef.current.gameMode === 'multiplayer-host') {
        dispatch({ type: GameActionType.CAST_PLAYER_VOTE, payload: votePayload });
      } else {
        sendRelayedMessage('cast_vote', votePayload);
      }
  }, [getLocalPlayer, sendRelayedMessage]);

  const cancelPlayerVote = useCallback(() => {
    const localPlayer = getLocalPlayer();
    if (!localPlayer || !gameStateRef.current.activePlayerVote) return;

    if (gameStateRef.current.gameMode === 'multiplayer-host') {
        dispatch({ type: GameActionType.CANCEL_PLAYER_VOTE });
    } else {
        sendRelayedMessage('cancel_vote');
    }
  }, [getLocalPlayer, sendRelayedMessage]);

    // Effect to resolve a completed vote (HOST ONLY)
  useEffect(() => {
    if (gameState.gameMode !== 'multiplayer-host' || !gameState.activePlayerVote) return;

    const { activePlayerVote, players } = gameState;
    const humanPlayers = players.filter(p => !p.isBot);
    const eligibleVoters = humanPlayers.filter(p => p.id !== activePlayerVote.targetPlayerId);

    if (Object.keys(activePlayerVote.votes).length >= eligibleVoters.length) {
        const votesFor = Object.values(activePlayerVote.votes).filter(v => v === true).length;
        const votesAgainst = Object.values(activePlayerVote.votes).filter(v => v === false).length;

        let finalIsValid: boolean;
        if (votesFor > votesAgainst) {
            finalIsValid = true;
        } else if (votesAgainst > votesFor) {
            finalIsValid = false;
        } else { // Tie
            finalIsValid = activePlayerVote.originalIsValid;
        }

        dispatch({
            type: GameActionType.RESOLVE_PLAYER_VOTE,
            payload: { 
                targetPlayerId: activePlayerVote.targetPlayerId,
                category: activePlayerVote.category,
                finalIsValid
            }
        });
        
        const roundIndex = gameState.roundResults.length - 1;
        if(roundIndex >= 0) {
             setTimeout(() => finalizeAndRecalculateScores(roundIndex), 100);
        }
    }
  }, [gameState.activePlayerVote?.votes, gameState.gameMode, gameState.players, finalizeAndRecalculateScores]);


  const doBroadcastGameState = useCallback(() => {
      if (gameStateRef.current.gameMode === 'multiplayer-host' && gameStateRef.current.roomId) {
          broadcastGameState(gameStateRef.current.roomId, gameStateRef.current);
      }
  }, []);
  
    // Main effect for multiplayer communication
  useEffect(() => {
    if (gameState.gamePhase !== 'lobby' && gameState.gameMode?.startsWith('multiplayer')) {
        // We're in a multiplayer game but not in lobby, so connection should exist
    } else if (gameState.gamePhase !== 'lobby') {
        disconnectFromServer();
        return;
    }
    
    const localPlayer = getLocalPlayer();
    const playerForConnection = localPlayer || { id: nanoid(), name: gameState.playerName, score: 0, isBot: false, avatarId: gameState.playerAvatarId, activityState: PlayerActivityState.IDLE };
    
    connectToServer(playerForConnection);

    onJoinSuccess((fullPlayerList) => {
        dispatch({ type: GameActionType.UPDATE_PLAYERS_IN_ROOM, payload: fullPlayerList });
    });

    onRoomNotFound(() => {
        toast.error("Pokój, do którego próbujesz dołączyć, nie istnieje.");
        dispatch({ type: GameActionType.LEAVE_ROOM }); // This will reset state
    });

    onGameStateSync((newState) => {
        dispatch({ type: GameActionType.CLIENT_RECEIVE_GAME_STATE, payload: newState });
    });

    onMessageRelayed((message: MultiplayerMessage) => {
        // Host logic for processing messages from clients
        if (gameStateRef.current.gameMode === 'multiplayer-host') {
             switch(message.type) {
                case 'player_join':
                    if (!gameStateRef.current.players.some(p => p.id === message.payload.player.id)) {
                        const updatedPlayers = [...gameStateRef.current.players, message.payload.player];
                        dispatch({ type: GameActionType.UPDATE_PLAYERS_IN_ROOM, payload: updatedPlayers });
                    }
                    break;
                case 'player_leave':
                    const updatedPlayers = gameStateRef.current.players.filter(p => p.id !== message.payload.playerId);
                    dispatch({ type: GameActionType.UPDATE_PLAYERS_IN_ROOM, payload: updatedPlayers });
                    break;
                case 'player_update':
                     dispatch({ type: GameActionType.SET_PLAYER_ACTIVITY, payload: message.payload });
                    break;
                case 'submit_answers':
                     dispatch({ type: GameActionType.HOST_RECEIVE_CLIENT_ANSWERS, payload: message.payload });
                     break;
                case 'initiate_vote':
                    dispatch({ type: GameActionType.INITIATE_PLAYER_VOTE, payload: message.payload });
                    break;
                case 'cast_vote':
                    dispatch({ type: GameActionType.CAST_PLAYER_VOTE, payload: message.payload });
                    break;
                case 'cancel_vote':
                    dispatch({ type: GameActionType.CANCEL_PLAYER_VOTE });
                    break;
                case 'new_host':
                    toast(`Nowym hostem jest ${gameStateRef.current.players.find(p=>p.id === message.payload.newHostId)?.name}`, { icon: 'ℹ️' });
                    break;
            }
        }
    });

    return () => {
        cleanupListeners();
    };
  }, [gameState.gamePhase, gameState.playerName, getLocalPlayer, gameState.playerAvatarId]);

  const validateAllAnswers = useCallback(async (allAnswers: Record<string, RoundAnswers>, letter: string, localPlayerId?: string) => {
    const botPlayers = gameStateRef.current.players.filter(p => p.isBot);
    botPlayers.forEach(bot => {
        dispatch({ type: GameActionType.SET_PLAYER_ACTIVITY, payload: { playerId: bot.id, activityState: PlayerActivityState.GENERATING_ANSWERS } });
    });

    // @google/genai-codex-fix: Dodano rzutowanie typu, aby rozwiązać błędy TypeScript związane z `JSON.parse`.
    let finalPlayerAnswers: Record<string, RoundAnswers> = JSON.parse(JSON.stringify(allAnswers)) as Record<string, RoundAnswers>;
    let validationPromises: Promise<any>[] = [];

    const useOnlineValidation = gameState.gameMode !== 'solo-offline';

    for (const player of gameState.players) {
        if (player.isBot) {
            const botAnswers: RoundAnswers = {};
            const botAnswerPromises = gameState.currentRoundCategories.map(async (category) => {
                const answerText = useOnlineValidation ?
                    await generateAnswerForBotWithMainAI(category, letter, player.botDifficulty!) :
                    getAnswerFromKB(category, letter, player.botDifficulty!);
                
                botAnswers[category] = { text: answerText, score: 0, bonusPoints: 0 };
            });
            await Promise.all(botAnswerPromises);
            finalPlayerAnswers[player.id] = botAnswers;
        }
    }

    Object.entries(finalPlayerAnswers).forEach(([playerId, answers]) => {
        Object.entries(answers).forEach(([category, answer]) => {
            if (answer.text && answer.text.trim() !== "" && answer.text.toLowerCase() !== 'nie wiem') {
                const promise = (useOnlineValidation ? validateAnswerWithAI(answer.text, category, letter) : Promise.resolve(validateAnswerWithKB(answer.text, category, letter)))
                    .then(validationResult => {
                        finalPlayerAnswers[playerId][category].isValid = validationResult.isValid;
                        finalPlayerAnswers[playerId][category].reason = validationResult.reason;
                        finalPlayerAnswers[playerId][category].bonusPoints = validationResult.bonusPoints || 0;
                    });
                validationPromises.push(promise);
            } else {
                finalPlayerAnswers[playerId][category].isValid = false;
                finalPlayerAnswers[playerId][category].reason = "Brak odpowiedzi";
                finalPlayerAnswers[playerId][category].bonusPoints = 0;
            }
        });
    });

    await Promise.all(validationPromises);

    dispatch({
        type: GameActionType.PROCESS_VALIDATION_RESULTS,
        payload: {
            playerAnswers: finalPlayerAnswers,
            scores: {}, // Scores will be calculated in finalizeAndRecalculateScores
            letter: letter,
            roundNumber: gameState.currentRound,
        },
    });

  }, [gameState.gameMode, gameState.players, gameState.currentRoundCategories, gameState.currentRound]);

  // Effect to broadcast game state from host when it changes
  useEffect(() => {
      if (gameState.gameMode === 'multiplayer-host') {
          doBroadcastGameState();
      }
  }, [gameState, doBroadcastGameState]); 

  const {
      createRoom,
      joinRoom,
      leaveRoom,
      startGameAsHost,
      addBotPlayer,
      removeBotPlayer,
      setPlayerActivity,
      pullLetterMachineLever,
      stopLetterMachine,
      initiateCountdown,
      submitAnswersAsClient
  } = {
      createRoom: useCallback(() => {
          const roomId = nanoid(6);
          const hostPlayer: Player = {
              id: nanoid(),
              name: gameState.playerName,
              score: 0,
              avatarId: gameState.playerAvatarId,
              isBot: false,
              isHost: true,
              activityState: PlayerActivityState.IDLE,
          };
          dispatch({ type: GameActionType.CREATE_ROOM, payload: { roomId, hostPlayer } });
          createRoomOnServer(roomId, hostPlayer);
      }, [gameState.playerName, gameState.playerAvatarId]),
      joinRoom: useCallback((roomId: string) => {
          const player: Player = {
              id: nanoid(),
              name: gameState.playerName,
              score: 0,
              avatarId: gameState.playerAvatarId,
              isBot: false,
              isHost: false,
              activityState: PlayerActivityState.IDLE,
          };
          dispatch({ type: GameActionType.JOIN_ROOM, payload: { roomId, player } });
          joinRoomOnServer(roomId, player);
      }, [gameState.playerName, gameState.playerAvatarId]),
      leaveRoom: useCallback(() => {
          if (gameState.roomId) {
            leaveRoomOnServer(gameState.roomId);
          }
          dispatch({ type: GameActionType.LEAVE_ROOM });
      }, [gameState.roomId]),
      startGameAsHost: useCallback(() => {
        if(gameState.gameMode === 'multiplayer-host') {
            dispatch({ type: GameActionType.SET_GAME_PHASE, payload: 'letter_drawing' });
        }
      }, [gameState.gameMode]),
      addBotPlayer: useCallback((difficulty: BotDifficulty) => {
          if (gameState.gameMode !== 'multiplayer-host') return;
          const botPlayer: Player = {
              id: nanoid(),
              name: `${BOT_NAME_PREFIX} ${gameState.players.filter(p => p.isBot).length + 1}`,
              score: 0,
              avatarId: AVATAR_IDS[(gameState.players.length) % AVATAR_IDS.length],
              isBot: true,
              botDifficulty: difficulty,
              activityState: PlayerActivityState.IDLE,
          };
          const updatedPlayers = [...gameState.players, botPlayer];
          dispatch({ type: GameActionType.UPDATE_PLAYERS_IN_ROOM, payload: updatedPlayers });
      }, [gameState.players, gameState.gameMode]),
      removeBotPlayer: useCallback((botId: string) => {
          if (gameState.gameMode !== 'multiplayer-host') return;
          const updatedPlayers = gameState.players.filter(p => p.id !== botId);
          dispatch({ type: GameActionType.UPDATE_PLAYERS_IN_ROOM, payload: updatedPlayers });
      }, [gameState.players, gameState.gameMode]),
      setPlayerActivity: useCallback((playerId: string, activityState: PlayerActivityState) => {
          dispatch({ type: GameActionType.SET_PLAYER_ACTIVITY, payload: { playerId, activityState } });
          if(gameStateRef.current.gameMode === 'multiplayer-client'){
            sendRelayedMessage('player_update', { id: playerId, activityState });
          }
      }, [sendRelayedMessage]),
      pullLetterMachineLever: useCallback(() => {
          dispatch({ type: GameActionType.START_LETTER_MACHINE });
      }, []),
      stopLetterMachine: useCallback(() => {
          if (letterMachineInterval.current) {
              clearInterval(letterMachineInterval.current);
              letterMachineInterval.current = null;
          }
          const finalLetter = gameState.letterMachineDisplayContent;
          dispatch({ type: GameActionType.STOP_LETTER_MACHINE, payload: finalLetter });
          
          setTimeout(() => {
              dispatch({ type: GameActionType.START_NEW_ROUND });
          }, 1500);
      }, [gameState.letterMachineDisplayContent]),
      initiateCountdown: useCallback(() => {
          dispatch({ type: GameActionType.INITIATE_COUNTDOWN });
      }, []),
      submitAnswersAsClient: useCallback(() => {
          const localPlayer = getLocalPlayer();
          if (gameState.gameMode === 'multiplayer-client' && localPlayer) {
              dispatch({ type: GameActionType.SET_PLAYER_ACTIVITY, payload: { playerId: localPlayer.id, activityState: PlayerActivityState.SUBMITTED } });
              sendRelayedMessage('submit_answers', {
                  playerId: localPlayer.id,
                  answers: gameState.currentRoundAnswers,
              });
          }
      }, [gameState.gameMode, gameState.currentRoundAnswers, getLocalPlayer, sendRelayedMessage]),
  };

  useEffect(() => {
      if (gameState.gamePhase === 'letter_drawing' && (gameState.gameMode === 'multiplayer-host' || gameState.gameMode === 'solo' || gameState.gameMode === 'solo-offline')) {
          const drawingPlayer = gameState.players[(gameState.currentRound) % gameState.players.length];
          if (drawingPlayer) {
              dispatch({ type: GameActionType.SET_LETTER_DRAWING_PLAYER, payload: { playerId: drawingPlayer.id, playerName: drawingPlayer.name } });
          }
      }
  }, [gameState.gamePhase, gameState.gameMode, gameState.players, gameState.currentRound]);

  useEffect(() => {
      const localPlayer = getLocalPlayer();
      if(gameState.isLetterMachineActive && localPlayer?.id === gameState.letterDrawingPlayerId) {
          letterMachineInterval.current = window.setInterval(() => {
              const randomLetter = POLISH_ALPHABET[Math.floor(Math.random() * POLISH_ALPHABET.length)];
              dispatch({ type: GameActionType.SET_LETTER_MACHINE_CONTENT, payload: randomLetter });
          }, 100);
      } else {
          if (letterMachineInterval.current) clearInterval(letterMachineInterval.current);
      }
      return () => { if(letterMachineInterval.current) clearInterval(letterMachineInterval.current) };
  }, [gameState.isLetterMachineActive, getLocalPlayer, gameState.letterDrawingPlayerId]);

  return (
    <GameContext.Provider value={{
      gameState,
      dispatch,
      validateAllAnswers,
      isLoadingValidation: gameState.isLoadingValidation,
      ...{createRoom, joinRoom, leaveRoom, startGameAsHost, addBotPlayer, removeBotPlayer, setPlayerActivity, pullLetterMachineLever, stopLetterMachine, initiateCountdown, submitAnswersAsClient},
      initiatePlayerVote,
      castPlayerVote,
      cancelPlayerVote,
      finalizeAndRecalculateScores,
      overrideAnswerValidity,
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
