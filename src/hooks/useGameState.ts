import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Player, Room, Guess } from '../types/game';
import { gameService } from '../services/gameService';

const SAVED_SESSION_KEY = 'cr_player_session';

export function useGameState() {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage on mount if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_SESSION_KEY);
      if (saved) {
        const { roomId, playerId } = JSON.parse(saved);
        if (roomId && playerId) {
          setCurrentPlayerId(playerId);
        }
      }
    } catch (e) {
      console.warn('Could not restore session:', e);
    }
  }, []);

  // Save session whenever roomId and playerId change
  useEffect(() => {
    if (room && currentPlayerId) {
      localStorage.setItem(
        SAVED_SESSION_KEY,
        JSON.stringify({ roomId: room.id, playerId: currentPlayerId })
      );
    }
  }, [room, currentPlayerId]);

  // Subscribe to real-time updates when room is active
  useEffect(() => {
    if (!room?.id) return;

    const unsubscribe = gameService.subscribeToRoom(
      room.id,
      (updatedRoom) => {
        setRoom((prev) => ({ ...prev, ...updatedRoom }));
      },
      (updatedPlayers) => {
        setPlayers(updatedPlayers);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [room?.id]);

  const playerList = useMemo(() => Object.values(players), [players]);

  const currentPlayer = useMemo(
    () => (currentPlayerId ? players[currentPlayerId] || null : null),
    [players, currentPlayerId]
  );

  const isHost = useMemo(
    () => Boolean(room && currentPlayerId && room.hostId === currentPlayerId),
    [room, currentPlayerId]
  );

  const winner1 = useMemo(
    () => (room?.winner1Id ? players[room.winner1Id] || null : null),
    [room?.winner1Id, players]
  );

  const winner2 = useMemo(
    () => (room?.winner2Id ? players[room.winner2Id] || null : null),
    [room?.winner2Id, players]
  );

  const allRecorded = useMemo(() => {
    if (playerList.length === 0) return false;
    return playerList.every((p) => p.hasRecorded);
  }, [playerList]);

  // Create Room action
  const createRoom = useCallback(async (hostName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { room: newRoom, player: newPlayer } = await gameService.createRoom(hostName);
      setRoom(newRoom);
      setPlayers({ [newPlayer.id]: newPlayer });
      setCurrentPlayerId(newPlayer.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Join Room action
  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { room: joinedRoom, player: newPlayer } = await gameService.joinRoom(roomCode, playerName);
      setRoom(joinedRoom);
      setPlayers((prev) => ({ ...prev, [newPlayer.id]: newPlayer }));
      setCurrentPlayerId(newPlayer.id);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Host starts the confession recording stage
  const startRecordingPhase = useCallback(async () => {
    if (!room || !isHost) return;
    try {
      await gameService.updateRoom(room.id, { status: 'RECORDING' });
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, isHost]);

  // Upload player confession
  const submitAudio = useCallback(
    async (blob: Blob) => {
      if (!room || !currentPlayerId) return;
      setIsLoading(true);
      try {
        await gameService.uploadAudio(room.id, currentPlayerId, blob);
      } catch (err: any) {
        setError(err.message || 'Failed to upload confession');
      } finally {
        setIsLoading(false);
      }
    },
    [room, currentPlayerId]
  );

  // Step 2: Host starts the Speed Talk WebRTC Breakouts
  const startBreakoutRounds = useCallback(async () => {
    if (!room || !isHost) return;
    try {
      const playerIds = playerList.map((p) => p.id);
      await gameService.startSpeedTalkBreakouts(room.id, playerIds);
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, isHost, playerList]);

  // Advance to next breakout round
  const advanceBreakoutRound = useCallback(
    async (nextRound: number) => {
      if (!room || !isHost) return;
      try {
        await gameService.advanceBreakoutRound(room.id, nextRound);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [room, isHost]
  );

  // Step 3: Transition to Blind Audio Guessing
  const startGuessingStage = useCallback(async () => {
    if (!room || !isHost) return;
    try {
      await gameService.startBlindAudioGuessing(room.id, playerList);
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, isHost, playerList]);

  // Submit a guess in the blind guessing round
  const submitVoiceGuess = useCallback(
    async (targetPlayerId: string, guessedPlayerId: string, voiceLabel: string) => {
      if (!room || !currentPlayerId) return;
      const guess: Guess = {
        roomId: room.id,
        guesserId: currentPlayerId,
        targetPlayerId,
        guessedPlayerId,
        voiceLabel,
      };
      await gameService.submitGuess(guess);
    },
    [room, currentPlayerId]
  );

  // Advance to next voice in the blind audio guessing queue
  const advanceGuessVoice = useCallback(
    async (nextIndex: number) => {
      if (!room || !isHost) return;
      try {
        await gameService.advanceGuessIndex(room.id, nextIndex);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [room, isHost]
  );

  // Step 4: Finish guessing and crown Winner 1
  const finishGuessingAndCrownWinner = useCallback(async () => {
    if (!room || !isHost) return;
    try {
      await gameService.calculateAndCrownWinner(room.id, playerList);
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, isHost, playerList]);

  // Winner 1 picks Winner 2
  const pickSecondWinner = useCallback(
    async (selectedPlayerId: string) => {
      if (!room || !room.winner1Id || currentPlayerId !== room.winner1Id) return;
      try {
        const revealPlayers = playerList.filter((p) => p.id !== room.winner1Id);
        const firstRevealId = revealPlayers[0]?.id || null;

        await gameService.updateRoom(room.id, {
          winner2Id: selectedPlayerId,
          status: 'REVEAL',
          activeAudioPlayerId: firstRevealId,
        });
      } catch (err: any) {
        setError(err.message);
      }
    },
    [room, currentPlayerId, playerList]
  );

  // Advance to next confession in the reveal queue
  const nextConfession = useCallback(async () => {
    if (!room || !isHost) return;
    try {
      const eligiblePlayers = playerList.filter((p) => !p.isSafe);
      const currentIndex = eligiblePlayers.findIndex((p) => p.id === room.activeAudioPlayerId);

      if (currentIndex !== -1 && currentIndex + 1 < eligiblePlayers.length) {
        const nextPlayer = eligiblePlayers[currentIndex + 1];
        await gameService.updateRoom(room.id, {
          activeAudioPlayerId: nextPlayer.id,
        });
      } else {
        await gameService.updateRoom(room.id, {
          activeAudioPlayerId: null,
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, isHost, playerList]);

  // Reset / Play Again
  const playAgain = useCallback(async () => {
    if (!room || !isHost) return;
    try {
      for (const p of playerList) {
        await gameService.updatePlayer(p.id, {
          audioUrl: null,
          hasRecorded: false,
          recognitionScore: 0,
          correctGuessesCount: 0,
          isSafe: false,
        });
      }

      await gameService.updateRoom(room.id, {
        status: 'LOBBY',
        winner1Id: null,
        winner2Id: null,
        activeAudioPlayerId: null,
        currentBreakoutRound: 0,
        currentBreakoutEndTime: null,
        breakoutSchedule: null,
        anonymousAudioQueue: null,
        currentGuessIndex: 0,
      });
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, isHost, playerList]);

  // Leave room
  const leaveRoom = useCallback(() => {
    localStorage.removeItem(SAVED_SESSION_KEY);
    setRoom(null);
    setPlayers({});
    setCurrentPlayerId(null);
  }, []);

  // Add demo bot player for testing
  const addDemoPlayer = useCallback(
    async (botName: string) => {
      if (!room) return;
      const botId = crypto.randomUUID();
      const demoPlayer: Player = {
        id: botId,
        roomId: room.id,
        name: botName,
        audioUrl: 'https://actions.google.com/sounds/v1/human_voices/applause.ogg',
        hasRecorded: true,
        score: 0,
        reactionTimeMs: 300,
        recognitionScore: 0,
        correctGuessesCount: 0,
        isSafe: false,
        createdAt: new Date().toISOString(),
      };

      await gameService.updatePlayer(botId, demoPlayer);
      setPlayers((prev) => ({ ...prev, [botId]: demoPlayer }));
    },
    [room]
  );

  return {
    room,
    players,
    playerList,
    currentPlayer,
    currentPlayerId,
    isHost,
    winner1,
    winner2,
    allRecorded,
    isLoading,
    error,
    createRoom,
    joinRoom,
    startRecordingPhase,
    submitAudio,
    startBreakoutRounds,
    advanceBreakoutRound,
    startGuessingStage,
    submitVoiceGuess,
    advanceGuessVoice,
    finishGuessingAndCrownWinner,
    pickSecondWinner,
    nextConfession,
    playAgain,
    leaveRoom,
    addDemoPlayer,
  };
}
