import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Player, Room } from '../types/game';
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

  // Host starts the minigame
  const startMinigame = useCallback(async () => {
    if (!room || !isHost) return;
    try {
      // Set random target delay between 3.0 to 6.0 seconds from now
      const delayMs = Math.floor(Math.random() * 3000) + 3000;
      const targetTime = Date.now() + delayMs;

      // Reset players' reaction times
      for (const p of playerList) {
        await gameService.updatePlayer(p.id, { reactionTimeMs: null });
      }

      await gameService.updateRoom(room.id, {
        status: 'MINIGAME',
        minigameTargetTime: targetTime,
        winner1Id: null,
        winner2Id: null,
      });
    } catch (err: any) {
      setError(err.message);
    }
  }, [room, isHost, playerList]);

  // Submit reaction time for minigame
  const submitReaction = useCallback(
    async (reactionTimeMs: number) => {
      if (!room || !currentPlayerId) return;
      try {
        await gameService.updatePlayer(currentPlayerId, { reactionTimeMs });

        // Check if all players have submitted reaction times
        setTimeout(async () => {
          const updatedList = Object.values(players);
          const allReacted = updatedList.every(
            (p) => (p.id === currentPlayerId ? true : p.reactionTimeMs !== null)
          );

          if (allReacted && updatedList.length > 0) {
            // Find player with the fastest reaction time (> 0)
            const validReactions = updatedList
              .map((p) => ({
                id: p.id,
                time: p.id === currentPlayerId ? reactionTimeMs : p.reactionTimeMs || 99999,
              }))
              .filter((p) => p.time > 0);

            if (validReactions.length > 0) {
              validReactions.sort((a, b) => a.time - b.time);
              const winner1Id = validReactions[0].id;

              // Winner 1's confession is permanently protected
              await gameService.updatePlayer(winner1Id, { isSafe: true });
              await gameService.updateRoom(room.id, {
                status: 'PICKING',
                winner1Id,
              });
            }
          }
        }, 300);
      } catch (err: any) {
        setError(err.message);
      }
    },
    [room, currentPlayerId, players]
  );

  // Winner 1 picks Winner 2
  const pickSecondWinner = useCallback(
    async (selectedPlayerId: string) => {
      if (!room || !room.winner1Id || currentPlayerId !== room.winner1Id) return;
      try {
        // Find the first player who is NOT safe (not Winner 1) to start the reveal queue
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
      // Find eligible reveal players (everyone except Winner 1 who is safe)
      const eligiblePlayers = playerList.filter((p) => !p.isSafe);
      const currentIndex = eligiblePlayers.findIndex((p) => p.id === room.activeAudioPlayerId);

      if (currentIndex !== -1 && currentIndex + 1 < eligiblePlayers.length) {
        const nextPlayer = eligiblePlayers[currentIndex + 1];
        await gameService.updateRoom(room.id, {
          activeAudioPlayerId: nextPlayer.id,
        });
      } else {
        // All confessions revealed
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
        audioUrl: null,
        hasRecorded: true,
        score: 0,
        reactionTimeMs: Math.floor(Math.random() * 250) + 260,
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
    startMinigame,
    submitReaction,
    pickSecondWinner,
    nextConfession,
    playAgain,
    leaveRoom,
    addDemoPlayer,
  };
}
