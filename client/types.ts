export type Category = string;

export enum PlayerActivityState {
  IDLE = 'idle',
  THINKING = 'thinking',
  TYPING = 'typing',
  SUBMITTED = 'submitted',
  WAITING = 'waiting',
  GENERATING_ANSWERS = 'generating_answers',
}

export enum BotDifficulty {
  VERY_EASY = 0,
  EASY = 1,
  MEDIUM = 2,
  HARD = 3,
  VERY_HARD = 4,
  EXPERT = 5,
}

export interface AIValidationResponse {
  isValid: boolean;
  reason?: string;
  bonusPoints?: number;
  bonusPointsReason?: string;
}

export enum GameActionType {
  INITIALIZE_GAME = 'INITIALIZE_GAME',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  SET_PLAYER_NAME = 'SET_PLAYER_NAME',
  SET_PLAYER_AVATAR = 'SET_PLAYER_AVATAR',
  START_NEW_ROUND = 'START_NEW_ROUND',
  SET_ANSWER = 'SET_ANSWER',
  END_ROUND = 'END_ROUND',
  PROCESS_VALIDATION_RESULTS = 'PROCESS_VALIDATION_RESULTS',
  NEXT_ROUND = 'NEXT_ROUND',
  RESET_GAME = 'RESET_GAME',
  REPLAY_GAME = 'REPLAY_GAME',
  SET_GAME_PHASE = 'SET_GAME_PHASE',
  SET_API_KEY_STATUS = 'SET_API_KEY_STATUS',
  SET_KNOWLEDGE_BASE_STATUS = 'SET_KNOWLEDGE_BASE_STATUS',
  START_OFFLINE_GAME_WITH_BOTS = 'START_OFFLINE_GAME_WITH_BOTS',
  CREATE_ROOM = 'CREATE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  SET_ROOM_ID = 'SET_ROOM_ID',
  SET_GAME_MODE = 'SET_GAME_MODE',
  UPDATE_PLAYERS_IN_ROOM = 'UPDATE_PLAYERS_IN_ROOM',
  SET_MULTIPLAYER_ROUND_SCORES = 'SET_MULTIPLAYER_ROUND_SCORES',
  HOST_START_GAME = 'HOST_START_GAME',
  HOST_RECEIVE_CLIENT_ANSWERS = 'HOST_RECEIVE_CLIENT_ANSWERS',
  HOST_BROADCAST_GAME_STATE = 'HOST_BROADCAST_GAME_STATE',
  CLIENT_RECEIVE_GAME_STATE = 'CLIENT_RECEIVE_GAME_STATE',
  ADD_BOT_PLAYER = 'ADD_BOT_PLAYER',
  REMOVE_BOT_PLAYER = 'REMOVE_BOT_PLAYER',
  SET_LETTER_DRAWING_PLAYER = 'SET_LETTER_DRAWING_PLAYER',
  START_LETTER_MACHINE = 'START_LETTER_MACHINE',
  SET_LETTER_MACHINE_CONTENT = 'SET_LETTER_MACHINE_CONTENT',
  STOP_LETTER_MACHINE = 'STOP_LETTER_MACHINE',
  SET_CURRENT_LETTER = 'SET_CURRENT_LETTER',
  INITIATE_COUNTDOWN = 'INITIATE_COUNTDOWN',
  DECREMENT_COUNTDOWN = 'DECREMENT_COUNTDOWN',
  END_COUNTDOWN = 'END_COUNTDOWN',
  SET_PLAYER_ACTIVITY = 'SET_PLAYER_ACTIVITY',
  SUBMIT_CLIENT_ANSWERS = 'SUBMIT_CLIENT_ANSWERS',
  // Player Voting Actions
  INITIATE_PLAYER_VOTE = 'INITIATE_PLAYER_VOTE',
  CAST_PLAYER_VOTE = 'CAST_PLAYER_VOTE',
  CANCEL_PLAYER_VOTE = 'CANCEL_PLAYER_VOTE',
  RESOLVE_PLAYER_VOTE = 'RESOLVE_PLAYER_VOTE',
  FINALIZE_AND_RECALCULATE_SCORES = 'FINALIZE_AND_RECALCULATE_SCORES',
  OVERRIDE_ANSWER_VALIDITY = 'OVERRIDE_ANSWER_VALIDITY',
  // New action for Google Drive client ID check
  CLIENT_ID_MISSING = 'CLIENT_ID_MISSING'
}

export interface GameSettings {
  roundDurationSeconds: number;
  numRounds: number;
  categoriesPerRound: number;
  selectedCategories: Category[];
}

export type GameMode = 'solo' | 'solo-offline' | 'multiplayer-host' | 'multiplayer-client' | null;

export type GamePhase = 'menu' | 'settings' | 'offline_config' | 'lobby' | 'letter_drawing' | 'playing' | 'results' | 'summary' | 'ended';

export interface Answer {
  text: string;
  isValid?: boolean;
  isUnique?: boolean;
  isSolo?: boolean;
  reason?: string;
  score: number;
  bonusPoints: number;
  bonusPointsReason?: string;
  isVoteable?: boolean;
  voteOverridden?: 'valid' | 'invalid' | null;
}

export type RoundAnswers = Record<string, Answer>;

export interface Player {
  id: string;
  name: string;
  score: number;
  avatarId: string;
  isBot: boolean;
  isHost?: boolean;
  botDifficulty?: BotDifficulty;
  activityState: PlayerActivityState;
}

export interface RoundResult {
  roundNumber: number;
  letter: string;
  playerAnswers: Record<string, RoundAnswers>;
  scores: Record<string, number>;
  isFinalized: boolean; // True after initial scoring, allowing votes
}

export interface HighScoreEntry {
    id: string;
    playerName: string;
    score: number;
    date: string;
    gameMode: GameMode;
    numRounds: number;
    roundDuration: number;
}

export interface HostedGameInfo {
  roomId: string;
  hostName: string;
  playerCount: number;
}

export interface ActivePlayerVote {
  initiatorId: string;
  targetPlayerId: string;
  category: Category;
  originalIsValid: boolean;
  originalReason: string;
  votes: Record<string, boolean>; // voterId -> vote (true=valid)
}

export interface GameState {
  gameMode: GameMode;
  gamePhase: GamePhase;
  settings: GameSettings;
  players: Player[];
  playerName: string;
  playerAvatarId: string;
  currentRound: number;
  currentLetter: string;
  currentRoundCategories: Category[];
  currentRoundAnswers: RoundAnswers;
  allPlayerRoundAnswers: Record<string, RoundAnswers>;
  isRoundActive: boolean;
  roundResults: RoundResult[];
  totalScore: number;
  isLoadingValidation: boolean;
  apiKeyOk: boolean;
  isKnowledgeBaseLoaded: boolean;
  roomId: string | null;
  multiplayerRoundScores: Record<string, Record<number, number>>;
  letterDrawingPlayerId: string | null;
  letterDrawingPlayerName: string | null;
  isLetterMachineActive: boolean;
  letterMachineDisplayContent: string;
  isCountdownActive: boolean;
  countdownSeconds: number;
  activePlayerVote: ActivePlayerVote | null;
}

export type KnowledgeBase = Record<Category, Record<string, string[]>>;

export interface BotSetupConfig {
  id: string;
  name: string;
  difficulty: BotDifficulty;
}

export type MultiplayerMessageType =
  | 'player_join'
  | 'player_leave'
  | 'player_update'
  | 'game_state_sync' 
  | 'start_game'
  | 'start_round'
  | 'submit_answers'
  | 'round_results'
  | 'end_game'
  | 'request_game_state'
  | 'initiate_letter_draw'
  | 'start_letter_machine_broadcast'
  | 'stop_letter_machine_broadcast'
  | 'initiate_countdown_broadcast'
  // Server-to-client or relayed messages
  | 'new_host'
  // Voting messages
  | 'initiate_vote'
  | 'cast_vote'
  | 'cancel_vote';

export interface MultiplayerMessage {
  type: MultiplayerMessageType;
  senderId: string;
  payload?: any;
}

export interface GoogleUser {
    name: string;
    email: string;
    picture: string;
}