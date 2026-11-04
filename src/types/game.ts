export type GameStatus = 'LOBBY' | 'RECORDING' | 'MINIGAME' | 'PICKING' | 'REVEAL';

export interface Player {
  id: string;
  roomId: string;
  name: string;
  audioUrl: string | null;
  hasRecorded: boolean;
  score: number;
  reactionTimeMs: number | null;
  isSafe: boolean;
  createdAt?: string;
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
  createdAt?: string;
}

export interface GameState {
  room: Room | null;
  players: Record<string, Player>;
  currentPlayerId: string | null;
  isHost: boolean;
}
