import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Player, Room } from '../types/game';

// Local storage keys for offline/fallback mode
const LOCAL_ROOMS_KEY = 'cr_rooms';
const LOCAL_PLAYERS_KEY = 'cr_players';

// BroadcastChannel for cross-tab realtime sync when offline/demo mode is used
const localSyncChannel = typeof window !== 'undefined' ? new BroadcastChannel('cr_sync_channel') : null;

export const gameService = {
  // Generate random room code
  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  // Create a room
  async createRoom(hostName: string): Promise<{ room: Room; player: Player }> {
    const hostId = crypto.randomUUID();
    const roomCode = this.generateRoomCode();
    const client = supabase;

    if (isSupabaseConfigured && client) {
      // Supabase Mode
      const { data: roomData, error: roomError } = await client
        .from('rooms')
        .insert({
          room_code: roomCode,
          status: 'LOBBY',
          host_id: hostId,
        })
        .select()
        .single();

      if (roomError) {
        throw new Error(`Failed to create room: ${roomError.message}`);
      }

      const { data: playerData, error: playerError } = await client
        .from('players')
        .insert({
          id: hostId,
          room_id: roomData.id,
          name: hostName,
          has_recorded: false,
          score: 0,
          is_safe: false,
        })
        .select()
        .single();

      if (playerError) {
        throw new Error(`Failed to create host player: ${playerError.message}`);
      }

      const room: Room = {
        id: roomData.id,
        roomCode: roomData.room_code,
        status: roomData.status,
        hostId: roomData.host_id,
        winner1Id: roomData.winner1_id,
        winner2Id: roomData.winner2_id,
        activeAudioPlayerId: roomData.active_audio_player_id,
        minigameTargetTime: roomData.minigame_target_time,
        createdAt: roomData.created_at,
      };

      const player: Player = {
        id: playerData.id,
        roomId: playerData.room_id,
        name: playerData.name,
        audioUrl: playerData.audio_url,
        hasRecorded: playerData.has_recorded,
        score: playerData.score,
        reactionTimeMs: playerData.reaction_time_ms,
        isSafe: playerData.is_safe,
        createdAt: playerData.created_at,
      };

      return { room, player };
    } else {
      // Local Sync / BroadcastChannel Mode
      const roomId = crypto.randomUUID();
      const room: Room = {
        id: roomId,
        roomCode,
        status: 'LOBBY',
        hostId,
        winner1Id: null,
        winner2Id: null,
        activeAudioPlayerId: null,
        createdAt: new Date().toISOString(),
      };

      const player: Player = {
        id: hostId,
        roomId,
        name: hostName,
        audioUrl: null,
        hasRecorded: false,
        score: 0,
        reactionTimeMs: null,
        isSafe: false,
        createdAt: new Date().toISOString(),
      };

      // Store in localStorage
      const rooms = this.getLocalRooms();
      rooms[roomId] = room;
      this.setLocalRooms(rooms);

      const players = this.getLocalPlayers();
      players[hostId] = player;
      this.setLocalPlayers(players);

      localSyncChannel?.postMessage({ type: 'ROOM_UPDATE', room });
      localSyncChannel?.postMessage({ type: 'PLAYER_UPDATE', player });

      return { room, player };
    }
  },

  // Join an existing room
  async joinRoom(roomCode: string, playerName: string): Promise<{ room: Room; player: Player }> {
    const formattedCode = roomCode.trim().toUpperCase();
    const playerId = crypto.randomUUID();
    const client = supabase;

    if (isSupabaseConfigured && client) {
      const { data: roomData, error: roomError } = await client
        .from('rooms')
        .select('*')
        .eq('room_code', formattedCode)
        .single();

      if (roomError || !roomData) {
        throw new Error('Room not found. Please verify the 4-letter room code.');
      }

      if (roomData.status !== 'LOBBY') {
        throw new Error('Game has already started in this room.');
      }

      const { data: playerData, error: playerError } = await client
        .from('players')
        .insert({
          id: playerId,
          room_id: roomData.id,
          name: playerName,
          has_recorded: false,
          score: 0,
          is_safe: false,
        })
        .select()
        .single();

      if (playerError) {
        throw new Error(`Failed to join room: ${playerError.message}`);
      }

      const room: Room = {
        id: roomData.id,
        roomCode: roomData.room_code,
        status: roomData.status,
        hostId: roomData.host_id,
        winner1Id: roomData.winner1_id,
        winner2Id: roomData.winner2_id,
        activeAudioPlayerId: roomData.active_audio_player_id,
        minigameTargetTime: roomData.minigame_target_time,
        createdAt: roomData.created_at,
      };

      const player: Player = {
        id: playerData.id,
        roomId: playerData.room_id,
        name: playerData.name,
        audioUrl: playerData.audio_url,
        hasRecorded: playerData.has_recorded,
        score: playerData.score,
        reactionTimeMs: playerData.reaction_time_ms,
        isSafe: playerData.is_safe,
        createdAt: playerData.created_at,
      };

      return { room, player };
    } else {
      // Local Sync mode
      const rooms = this.getLocalRooms();
      const room = Object.values(rooms).find((r) => r.roomCode.toUpperCase() === formattedCode);

      if (!room) {
        throw new Error('Room not found. Please verify the room code.');
      }

      if (room.status !== 'LOBBY') {
        throw new Error('Game has already started in this room.');
      }

      const player: Player = {
        id: playerId,
        roomId: room.id,
        name: playerName,
        audioUrl: null,
        hasRecorded: false,
        score: 0,
        reactionTimeMs: null,
        isSafe: false,
        createdAt: new Date().toISOString(),
      };

      const players = this.getLocalPlayers();
      players[playerId] = player;
      this.setLocalPlayers(players);

      localSyncChannel?.postMessage({ type: 'PLAYER_JOINED', player });

      return { room, player };
    }
  },

  // Update room state (status, winners, active audio, etc.)
  async updateRoom(roomId: string, updates: Partial<Room>): Promise<void> {
    const client = supabase;
    if (isSupabaseConfigured && client) {
      const payload: Record<string, unknown> = {};
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.winner1Id !== undefined) payload.winner1_id = updates.winner1Id;
      if (updates.winner2Id !== undefined) payload.winner2_id = updates.winner2Id;
      if (updates.activeAudioPlayerId !== undefined) payload.active_audio_player_id = updates.activeAudioPlayerId;
      if (updates.minigameTargetTime !== undefined) payload.minigame_target_time = updates.minigameTargetTime;

      const { error } = await client.from('rooms').update(payload).eq('id', roomId);
      if (error) {
        console.error('Error updating room in Supabase:', error);
      }
    } else {
      const rooms = this.getLocalRooms();
      if (rooms[roomId]) {
        rooms[roomId] = { ...rooms[roomId], ...updates };
        this.setLocalRooms(rooms);
        localSyncChannel?.postMessage({ type: 'ROOM_UPDATE', room: rooms[roomId] });
      }
    }
  },

  // Update a player's record
  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<void> {
    const client = supabase;
    if (isSupabaseConfigured && client) {
      const payload: Record<string, unknown> = {};
      if (updates.hasRecorded !== undefined) payload.has_recorded = updates.hasRecorded;
      if (updates.audioUrl !== undefined) payload.audio_url = updates.audioUrl;
      if (updates.reactionTimeMs !== undefined) payload.reaction_time_ms = updates.reactionTimeMs;
      if (updates.isSafe !== undefined) payload.is_safe = updates.isSafe;
      if (updates.score !== undefined) payload.score = updates.score;

      const { error } = await client.from('players').update(payload).eq('id', playerId);
      if (error) {
        console.error('Error updating player in Supabase:', error);
      }
    } else {
      const players = this.getLocalPlayers();
      if (players[playerId]) {
        players[playerId] = { ...players[playerId], ...updates };
        this.setLocalPlayers(players);
        localSyncChannel?.postMessage({ type: 'PLAYER_UPDATE', player: players[playerId] });
      }
    }
  },

  // Upload recorded audio confession
  async uploadAudio(roomId: string, playerId: string, audioBlob: Blob): Promise<string> {
    const client = supabase;
    if (isSupabaseConfigured && client) {
      const fileName = `${roomId}/${playerId}_${Date.now()}.webm`;
      const { data, error } = await client.storage
        .from('confessions')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: true,
        });

      if (error) {
        console.error('Supabase storage upload error:', error);
        // Fallback to object URL if upload fails so user is not stuck
        const fallbackUrl = URL.createObjectURL(audioBlob);
        await this.updatePlayer(playerId, { audioUrl: fallbackUrl, hasRecorded: true });
        return fallbackUrl;
      }

      const { data: publicData } = client.storage.from('confessions').getPublicUrl(data.path);
      const audioUrl = publicData.publicUrl;

      await this.updatePlayer(playerId, { audioUrl, hasRecorded: true });
      return audioUrl;
    } else {
      // Local mode: Convert blob to data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = reader.result as string;
          await this.updatePlayer(playerId, { audioUrl: dataUrl, hasRecorded: true });
          resolve(dataUrl);
        };
        reader.readAsDataURL(audioBlob);
      });
    }
  },

  // Subscribe to real-time updates for a room and all its players
  subscribeToRoom(
    roomId: string,
    onRoomChange: (room: Room) => void,
    onPlayersChange: (players: Record<string, Player>) => void
  ): () => void {
    const client = supabase;

    if (isSupabaseConfigured && client) {
      // 1. Initial fetch
      const fetchInitialData = async () => {
        const { data: roomData } = await client.from('rooms').select('*').eq('id', roomId).single();
        if (roomData) {
          onRoomChange({
            id: roomData.id,
            roomCode: roomData.room_code,
            status: roomData.status,
            hostId: roomData.host_id,
            winner1Id: roomData.winner1_id,
            winner2Id: roomData.winner2_id,
            activeAudioPlayerId: roomData.active_audio_player_id,
            minigameTargetTime: roomData.minigame_target_time,
            createdAt: roomData.created_at,
          });
        }

        const { data: playersData } = await client.from('players').select('*').eq('room_id', roomId);
        if (playersData) {
          const playerMap: Record<string, Player> = {};
          playersData.forEach((p) => {
            playerMap[p.id] = {
              id: p.id,
              roomId: p.room_id,
              name: p.name,
              audioUrl: p.audio_url,
              hasRecorded: p.has_recorded,
              score: p.score,
              reactionTimeMs: p.reaction_time_ms,
              isSafe: p.is_safe,
              createdAt: p.created_at,
            };
          });
          onPlayersChange(playerMap);
        }
      };

      fetchInitialData();

      // 2. Realtime subscription
      const channel = client
        .channel(`room:${roomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
          (payload) => {
            if (payload.new) {
              const r = payload.new as any;
              onRoomChange({
                id: r.id,
                roomCode: r.room_code,
                status: r.status,
                hostId: r.host_id,
                winner1Id: r.winner1_id,
                winner2Id: r.winner2_id,
                activeAudioPlayerId: r.active_audio_player_id,
                minigameTargetTime: r.minigame_target_time,
                createdAt: r.created_at,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
          async () => {
            // Re-fetch room players to keep synchronized
            const { data } = await client.from('players').select('*').eq('room_id', roomId);
            if (data) {
              const playerMap: Record<string, Player> = {};
              data.forEach((p) => {
                playerMap[p.id] = {
                  id: p.id,
                  roomId: p.room_id,
                  name: p.name,
                  audioUrl: p.audio_url,
                  hasRecorded: p.has_recorded,
                  score: p.score,
                  reactionTimeMs: p.reaction_time_ms,
                  isSafe: p.is_safe,
                  createdAt: p.created_at,
                };
              });
              onPlayersChange(playerMap);
            }
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } else {
      // BroadcastChannel & LocalStorage Mode
      const updateFromLocal = () => {
        const rooms = this.getLocalRooms();
        const players = this.getLocalPlayers();
        if (rooms[roomId]) {
          onRoomChange(rooms[roomId]);
        }
        const roomPlayers: Record<string, Player> = {};
        Object.values(players).forEach((p) => {
          if (p.roomId === roomId) {
            roomPlayers[p.id] = p;
          }
        });
        onPlayersChange(roomPlayers);
      };

      updateFromLocal();

      const handleBroadcast = (event: MessageEvent) => {
        const { type } = event.data || {};
        if (type === 'ROOM_UPDATE' || type === 'PLAYER_UPDATE' || type === 'PLAYER_JOINED') {
          updateFromLocal();
        }
      };

      localSyncChannel?.addEventListener('message', handleBroadcast);

      // Poll every 1.5 seconds in local mode to catch tab changes safely
      const interval = setInterval(updateFromLocal, 1500);

      return () => {
        localSyncChannel?.removeEventListener('message', handleBroadcast);
        clearInterval(interval);
      };
    }
  },

  // Local storage helpers
  getLocalRooms(): Record<string, Room> {
    try {
      const data = localStorage.getItem(LOCAL_ROOMS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  setLocalRooms(rooms: Record<string, Room>) {
    try {
      localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
    } catch (e) {
      console.error(e);
    }
  },

  getLocalPlayers(): Record<string, Player> {
    try {
      const data = localStorage.getItem(LOCAL_PLAYERS_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  setLocalPlayers(players: Record<string, Player>) {
    try {
      localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(players));
    } catch (e) {
      console.error(e);
    }
  },
};
