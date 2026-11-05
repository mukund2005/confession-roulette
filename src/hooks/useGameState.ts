import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Player, Room, Guess } from '../types/game';
import { gameService } from '../services/gameService';
import { generateRoundRobinSchedule } from '../utils/roundRobin';

const SAVED_SESSION_KEY = 'cr_player_session';

export function useGameState() {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [avatarIndex, setAvatarIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session from sessionStorage on mount if available
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SAVED_SESSION_KEY);
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
      sessionStorage.setItem(
        SAVED_SESSION_KEY,
        JSON.stringify({ roomId: room.id, playerId: currentPlayerId })
      );
    }
  }, [room, currentPlayerId]);

  const roomRef = useRef<Room | null>(room);
  const playersRef = useRef<Record<string, Player>>(players);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Subscribe to real-time updates when room is active
  useEffect(() => {
    if (!room?.id || !currentPlayerId) return;

    const unsubscribe = gameService.subscribeToRoom(
      room.id,
      currentPlayerId,
      (updatedRoom) => {
        setRoom((prev) => (prev ? { ...prev, ...updatedRoom } : prev));
      },
      (updatedPlayers) => {
        setPlayers(updatedPlayers);

        // Host migration fail-safe: if current host is no longer in the room, promote oldest remaining camper
        const currentRoom = roomRef.current;
        if (currentRoom?.status === 'LOBBY') {
          const playerIds = Object.keys(updatedPlayers);
          if (playerIds.length > 0 && !playerIds.includes(currentRoom.hostId)) {
            const sortedByJoined = Object.values(updatedPlayers).sort((a, b) => {
              const tA = new Date(a.joinedAt || a.createdAt || 0).getTime();
              const tB = new Date(b.joinedAt || b.createdAt || 0).getTime();
              return tA - tB;
            });
            const nextHost = sortedByJoined[0];
            if (nextHost && nextHost.id === currentPlayerId) {
              gameService.promoteNextHost(currentRoom.id, nextHost.id).catch(() => {});
            }
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [room?.id, currentPlayerId]);

  // Handle client's own internet disconnection
  useEffect(() => {
    const handleOffline = () => {
      setError('Internet connection lost. Reconnecting...');
    };

    const handleOnline = () => {
      setError(null);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

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

  // Quick Play / Auto-Matchmaking (FIFO oldest open room under 6 capacity)
  const quickMatch = useCallback(async (playerName: string, avatar?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const selectedAvatar = avatar !== undefined ? avatar : avatarIndex;
      const { room: matchedRoom, player: newPlayer, allPlayers } = await gameService.findOrCreatePublicBonfire(playerName, selectedAvatar);
      setRoom(matchedRoom);
      const playerMap: Record<string, Player> = {};
      allPlayers.forEach((p) => {
        playerMap[p.id] = p;
      });
      setPlayers(playerMap);
      setCurrentPlayerId(newPlayer.id);
    } catch (err: any) {
      setError(err.message || 'Failed to locate bonfire');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [avatarIndex]);

  // Host a Room (The "Bonfire")
  const hostRoom = useCallback(async (hostName: string, avatar?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const selectedAvatar = avatar !== undefined ? avatar : avatarIndex;
      const { room: newRoom, player: newPlayer, allPlayers } = await gameService.hostRoom(hostName, selectedAvatar);
      setRoom(newRoom);
      const playerMap: Record<string, Player> = {};
      allPlayers.forEach((p) => {
        playerMap[p.id] = p;
      });
      setPlayers(playerMap);
      setCurrentPlayerId(newPlayer.id);
    } catch (err: any) {
      setError(err.message || 'Failed to host bonfire');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [avatarIndex]);

  // Create Room action (alias for hostRoom)
  const createRoom = useCallback(async (hostName: string, avatar?: number) => {
    return hostRoom(hostName, avatar);
  }, [hostRoom]);

  // Join Room action
  const joinRoom = useCallback(async (roomCode: string, playerName: string, avatar?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const selectedAvatar = avatar !== undefined ? avatar : avatarIndex;
      const { room: joinedRoom, player: newPlayer, allPlayers } = await gameService.joinRoom(roomCode, playerName, selectedAvatar);
      setRoom(joinedRoom);
      const playerMap: Record<string, Player> = {};
      allPlayers.forEach((p) => {
        playerMap[p.id] = p;
      });
      setPlayers(playerMap);
      setCurrentPlayerId(newPlayer.id);
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [avatarIndex]);

  // Host-Exclusive Start Game Authority with atomic state lock
  const startGameAsHost = useCallback(async () => {
    if (!room || !currentPlayerId) return;
    setIsLoading(true);
    setError(null);
    try {
      await gameService.startGameAsHost(room.id, currentPlayerId);
      setRoom((prev) => (prev ? { ...prev, status: 'RECORDING', isPublic: false } : prev));
    } catch (err: any) {
      setError(err.message || 'Failed to light bonfire');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [room, currentPlayerId]);

  // Start the confession recording stage (calls startGameAsHost)
  const startRecordingPhase = useCallback(async () => {
    return startGameAsHost();
  }, [startGameAsHost]);

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

  // Step 2: Initialize Round 1 Minigame — "Balloon Popping Frenzy" (30s synchronized clicker)
  const startBalloonMinigame = useCallback(async () => {
    if (!room) return;
    try {
      const readyDelayMs = 3000;
      const gameDurationMs = 30000;
      const targetEndTime = Date.now() + readyDelayMs + gameDurationMs;
      const playerIds = playerList.map((p) => p.id);

      setRoom((prev) =>
        prev
          ? {
              ...prev,
              status: 'MINIGAME',
              minigameTargetTime: targetEndTime,
              winner1Id: null,
              winner2Id: null,
              activeAudioPlayerId: null,
            }
          : prev
      );

      await gameService.startBalloonMinigame(room.id, targetEndTime, playerIds);
    } catch (err: any) {
      console.error('Error starting balloon minigame:', err);
      setError(err.message);
    }
  }, [room, playerList]);

  // Automatically advance to Minigame when all players have sealed confessions
  const autoMinigameTriggeredRef = useRef(false);

  useEffect(() => {
    if (room?.status !== 'RECORDING') {
      autoMinigameTriggeredRef.current = false;
      return;
    }

    if (allRecorded && !autoMinigameTriggeredRef.current && isHost) {
      autoMinigameTriggeredRef.current = true;
      startBalloonMinigame();
    }
  }, [room?.status, allRecorded, isHost, startBalloonMinigame]);

  // Submit client's balloon score at t = 0
  const submitMinigameScore = useCallback(
    async (score: number, lastPopTimeMs: number) => {
      if (!room || !currentPlayerId) return;
      try {
        await gameService.submitMinigameScore(currentPlayerId, score, lastPopTimeMs);
        setPlayers((prev) => ({
          ...prev,
          [currentPlayerId]: {
            ...prev[currentPlayerId],
            score,
            reactionTimeMs: lastPopTimeMs,
          },
        }));
      } catch (err: any) {
        console.warn('Error submitting minigame score:', err);
      }
    },
    [room, currentPlayerId]
  );

  // Crown Winner 1 based on highest score and tie-breaking
  const crownMinigameWinner = useCallback(async () => {
    if (!room) return;
    try {
      const winnerId = await gameService.crownMinigameWinner(room.id, playerList);
      if (winnerId) {
        setRoom((prev) => (prev ? { ...prev, winner1Id: winnerId } : prev));
        setPlayers((prev) => {
          if (!prev[winnerId]) return prev;
          return {
            ...prev,
            [winnerId]: {
              ...prev[winnerId],
              isSafe: true,
            },
          };
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, playerList]);

  // Proceed from Minigame results to Synchronized Confession Listening (REVEAL)
  const proceedFromMinigameToReveal = useCallback(async () => {
    if (!room || !room.winner1Id) return;
    try {
      const eligible = playerList.filter((p) => p.id !== room.winner1Id && p.audioUrl);
      const firstRevealId = eligible[0]?.id || null;

      setRoom((prev) =>
        prev
          ? {
              ...prev,
              status: 'REVEAL',
              activeAudioPlayerId: firstRevealId,
            }
          : prev
      );

      await gameService.proceedFromMinigameToReveal(room.id, room.winner1Id, playerList);
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, playerList]);

  // Step 2 Alternative: Start the Speed Talk WebRTC Breakouts automatically
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
          score: 0,
          reactionTimeMs: null,
          isSafe: false,
        });
      }

      await gameService.updateRoom(room.id, {
        status: 'LOBBY',
        winner1Id: null,
        winner2Id: null,
        activeAudioPlayerId: null,
        minigameTargetTime: null,
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

  // Leave room with cloud sync
  const leaveRoom = useCallback(async () => {
    if (room && currentPlayerId) {
      try {
        await gameService.leaveRoom(room.id, currentPlayerId);
      } catch (e) {
        console.warn('Error leaving room:', e);
      }
    }
    sessionStorage.removeItem(SAVED_SESSION_KEY);
    setRoom(null);
    setPlayers({});
    setCurrentPlayerId(null);
  }, [room, currentPlayerId]);

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
    startBalloonMinigame,
    submitMinigameScore,
    crownMinigameWinner,
    proceedFromMinigameToReveal,
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
    hostRoom,
    startGameAsHost,
    avatarIndex,
    setAvatarIndex,
  };
}
