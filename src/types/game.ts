export type GameStatus =
  | 'LOBBY'
  | 'RECORDING'
  | 'BREAKOUT'
  | 'GUESSING'
  | 'MINIGAME'
  | 'PICKING'
  | 'REVEAL';

export interface Player {
  id: string;
  roomId: string;
  name: string;
  audioUrl: string | null;
  hasRecorded: boolean;
  score: number;
  reactionTimeMs: number | null;
  recognitionScore: number;
  correctGuessesCount: number;
  isSafe: boolean;
  createdAt?: string;
}

export interface BreakoutPair {
  player1Id: string;
  player2Id: string;
}

export type BreakoutRound = BreakoutPair[];

export interface AnonymousVoice {
  label: string; // "Voice A", "Voice B", etc.
  audioUrl: string;
  targetPlayerId: string;
}

export interface Guess {
  id?: string;
  roomId: string;
  guesserId: string;
  targetPlayerId: string;
  guessedPlayerId: string;
  voiceLabel: string;
}

export interface Room {
  id: string;
  roomCode: string;
  status: GameStatus;
  hostId: string;
  winner1Id: string | null;
  winner2Id: string | null;
  activeAudioPlayerId: string | null;
  minigameTargetTime?: number | null;
  currentBreakoutRound?: number;
  currentBreakoutEndTime?: number | null;
  breakoutSchedule?: BreakoutRound[] | null;
  anonymousAudioQueue?: AnonymousVoice[] | null;
  currentGuessIndex?: number;
  isPublic?: boolean;
  isSolo?: boolean;
  createdAt?: string;
}

export interface GameState {
  room: Room | null;
  players: Record<string, Player>;
  currentPlayerId: string | null;
  isHost: boolean;
}
