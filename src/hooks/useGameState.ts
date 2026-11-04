import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Player, Room, Guess } from '../types/game';
import { gameService } from '../services/gameService';
import { generateRoundRobinSchedule } from '../utils/roundRobin';

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

  // Quick Match action for real 6-player matchmaking
  const quickMatch = useCallback(async (playerName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { room: matchedRoom, player: newPlayer } = await gameService.findOrCreatePublicBonfire(playerName);
      setRoom(matchedRoom);
      setPlayers({ [newPlayer.id]: newPlayer });
      setCurrentPlayerId(newPlayer.id);
    } catch (err: any) {
      setError(err.message || 'Failed to locate bonfire');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Start the confession recording stage
  const startRecordingPhase = useCallback(async () => {
    if (!room) return;
    try {
      await gameService.updateRoom(room.id, { status: 'RECORDING' });
    } catch (err: any) {
      setError(err.message);
    }
  }, [room]);

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

  // Step 2: Start the Speed Talk WebRTC Breakouts automatically
  const startBreakoutRounds = useCallback(async () => {
    if (!room) return;
    try {
      const playerIds = playerList.map((p) => p.id);
      const schedule = generateRoundRobinSchedule(playerIds);
      const endTime = Date.now() + 30000;

      // Optimistically switch room status immediately so there's zero UI delay or freeze
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              status: 'BREAKOUT',
              breakoutSchedule: schedule,
              currentBreakoutRound: 0,
              currentBreakoutEndTime: endTime,
            }
          : prev
      );

      await gameService.startSpeedTalkBreakouts(room.id, playerIds);
    } catch (err: any) {
      console.error('Error starting breakout rounds:', err);
      setError(err.message);
    }
  }, [room, playerList]);

  // Automatically start Speed Talk Breakouts immediately when all players have sealed confessions
  const autoBreakoutTriggeredRef = useRef(false);

  useEffect(() => {
    if (room?.status !== 'RECORDING') {
      autoBreakoutTriggeredRef.current = false;
      return;
    }

    if (allRecorded && !autoBreakoutTriggeredRef.current) {
      autoBreakoutTriggeredRef.current = true;
      startBreakoutRounds();
    }
  }, [room?.status, allRecorded, startBreakoutRounds]);

  // Advance to next breakout round
  const advanceBreakoutRound = useCallback(
    async (nextRound: number) => {
      if (!room) return;
      const endTime = Date.now() + 30000;
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              currentBreakoutRound: nextRound,
              currentBreakoutEndTime: endTime,
            }
          : prev
      );
      try {
        await gameService.advanceBreakoutRound(room.id, nextRound);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [room]
  );

  // Step 3: Transition to Blind Audio Guessing
  const startGuessingStage = useCallback(async () => {
    if (!room) return;
    try {
      const validPlayers = playerList.filter((p) => p.audioUrl);
      const shuffled = [...validPlayers].sort(() => Math.random() - 0.5);
      const labels = ['Voice A', 'Voice B', 'Voice C', 'Voice D', 'Voice E', 'Voice F', 'Voice G', 'Voice H'];
      const anonymousQueue = shuffled.map((p, idx) => ({
        label: labels[idx] || `Voice ${idx + 1}`,
        audioUrl: p.audioUrl!,
        targetPlayerId: p.id,
      }));

      setRoom((prev) =>
        prev
          ? {
              ...prev,
              status: 'GUESSING',
              anonymousAudioQueue: anonymousQueue,
              currentGuessIndex: 0,
            }
          : prev
      );

      await gameService.startBlindAudioGuessing(room.id, playerList);
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, playerList]);

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
      if (!room) return;
      setRoom((prev) => (prev ? { ...prev, currentGuessIndex: nextIndex } : prev));
      try {
        await gameService.advanceGuessIndex(room.id, nextIndex);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [room]
  );

  // Step 4: Finish guessing and crown Winner 1, then transition to synchronized confession listening!
  const finishGuessingAndCrownWinner = useCallback(async () => {
    if (!room) return;
    try {
      const winner1Id = await gameService.calculateAndCrownWinner(room.id, playerList);
      const eligible = playerList.filter((p) => p.id !== winner1Id && p.audioUrl);
      const firstRevealId = eligible[0]?.id || null;

      // Optimistically move to REVEAL so all players listen to all confessions synchronously!
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              status: 'REVEAL',
              winner1Id,
              winner2Id: null,
              activeAudioPlayerId: firstRevealId,
            }
          : prev
      );
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, playerList]);

  // Winner 1 picks Winner 2 after listening to all confessions
  const pickSecondWinner = useCallback(
    async (selectedPlayerId: string) => {
      if (!room || !room.winner1Id || currentPlayerId !== room.winner1Id) return;
      try {
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                winner2Id: selectedPlayerId,
                status: 'REVEAL',
                activeAudioPlayerId: null,
              }
            : prev
        );

        await gameService.updatePlayer(selectedPlayerId, { isSafe: true });
        await gameService.updateRoom(room.id, {
          winner2Id: selectedPlayerId,
          status: 'REVEAL',
          activeAudioPlayerId: null,
        });
      } catch (err: any) {
        setError(err.message);
      }
    },
    [room, currentPlayerId]
  );

  // Advance to next confession in the reveal queue, or transition to PICKING when all have been heard!
  const nextConfession = useCallback(async () => {
    if (!room) return;
    try {
      const eligiblePlayers = playerList.filter((p) => p.id !== room.winner1Id && p.audioUrl);
      const currentIndex = eligiblePlayers.findIndex((p) => p.id === room.activeAudioPlayerId);

      if (currentIndex !== -1 && currentIndex + 1 < eligiblePlayers.length) {
        const nextPlayer = eligiblePlayers[currentIndex + 1];
        setRoom((prev) => (prev ? { ...prev, activeAudioPlayerId: nextPlayer.id } : prev));
        await gameService.updateRoom(room.id, {
          activeAudioPlayerId: nextPlayer.id,
        });
      } else {
        // All confessions have been heard by the entire bonfire! Transition to PICKING so Winner 1 chooses Winner 2!
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                status: 'PICKING',
                activeAudioPlayerId: null,
              }
            : prev
        );
        await gameService.updateRoom(room.id, {
          status: 'PICKING',
          activeAudioPlayerId: null,
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, playerList]);

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
    quickMatch,
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
