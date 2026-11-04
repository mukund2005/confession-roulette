import { supabase } from '../lib/supabase';
import type { Player, Room } from '../types/game';

export const gameService = {
  // Generate random 4-letter room code
  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  // Create a room in Supabase
  async createRoom(hostName: string): Promise<{ room: Room; player: Player }> {
    const hostId = crypto.randomUUID();
    const roomCode = this.generateRoomCode();

    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert({
        room_code: roomCode,
        status: 'LOBBY',
        host_id: hostId,
      })
      .select()
      .single();

    if (roomError) {
      console.error('Supabase create room error:', roomError);
      throw new Error(`Failed to create room in cloud: ${roomError.message}. Make sure supabase_schema.sql was run in your Supabase SQL editor.`);
    }

    const { data: playerData, error: playerError } = await supabase
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
      console.error('Supabase create host error:', playerError);
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
  },

  // Join an existing room from another phone/device
  async joinRoom(roomCode: string, playerName: string): Promise<{ room: Room; player: Player }> {
    const formattedCode = roomCode.trim().toUpperCase();
    const playerId = crypto.randomUUID();

    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', formattedCode)
      .maybeSingle();

    if (roomError) {
      console.error('Supabase join room error:', roomError);
      throw new Error(`Database error: ${roomError.message}. Make sure supabase_schema.sql was run in Supabase.`);
    }

    if (!roomData) {
      throw new Error(`Room code "${formattedCode}" not found. Verify the code with the host.`);
    }

    if (roomData.status !== 'LOBBY') {
      throw new Error('Game has already started in this room.');
    }

    const { data: playerData, error: playerError } = await supabase
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
      console.error('Supabase create player error:', playerError);
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
  },

  // Update room state in cloud
  async updateRoom(roomId: string, updates: Partial<Room>): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.winner1Id !== undefined) payload.winner1_id = updates.winner1Id;
    if (updates.winner2Id !== undefined) payload.winner2_id = updates.winner2Id;
    if (updates.activeAudioPlayerId !== undefined) payload.active_audio_player_id = updates.activeAudioPlayerId;
    if (updates.minigameTargetTime !== undefined) payload.minigame_target_time = updates.minigameTargetTime;

    const { error } = await supabase.from('rooms').update(payload).eq('id', roomId);
    if (error) {
      console.error('Error updating room in Supabase:', error);
    }
  },

  // Update player record in cloud
  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (updates.hasRecorded !== undefined) payload.has_recorded = updates.hasRecorded;
    if (updates.audioUrl !== undefined) payload.audio_url = updates.audioUrl;
    if (updates.reactionTimeMs !== undefined) payload.reaction_time_ms = updates.reactionTimeMs;
    if (updates.isSafe !== undefined) payload.is_safe = updates.isSafe;
    if (updates.score !== undefined) payload.score = updates.score;

    const { error } = await supabase.from('players').update(payload).eq('id', playerId);
    if (error) {
      console.error('Error updating player in Supabase:', error);
    }
  },

  // Upload recorded audio confession to Supabase Storage
  async uploadAudio(roomId: string, playerId: string, audioBlob: Blob): Promise<string> {
    const fileName = `${roomId}/${playerId}_${Date.now()}.webm`;
    
    const { data, error } = await supabase.storage
      .from('confessions')
      .upload(fileName, audioBlob, {
        contentType: 'audio/webm',
        upsert: true,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      // Fallback data URL if storage upload failed so game never blocks
      const fallbackUrl = URL.createObjectURL(audioBlob);
      await this.updatePlayer(playerId, { audioUrl: fallbackUrl, hasRecorded: true });
      return fallbackUrl;
    }

    const { data: publicData } = supabase.storage.from('confessions').getPublicUrl(data.path);
    const audioUrl = publicData.publicUrl;

    await this.updatePlayer(playerId, { audioUrl, hasRecorded: true });
    return audioUrl;
  },

  // Subscribe to real-time updates for a room and all connected players
  subscribeToRoom(
    roomId: string,
    onRoomChange: (room: Room) => void,
    onPlayersChange: (players: Record<string, Player>) => void
  ): () => void {
    const fetchLatest = async () => {
      const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
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

      const { data: playersData } = await supabase.from('players').select('*').eq('room_id', roomId);
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

    // 1. Initial fetch
    fetchLatest();

    // 2. Supabase Realtime Channel
    const channel = supabase
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
        () => {
          fetchLatest();
        }
      )
      .subscribe();

    // 3. Fallback active polling every 1.5 seconds for rock-solid mobile sync
    const pollInterval = setInterval(fetchLatest, 1500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  },
};
