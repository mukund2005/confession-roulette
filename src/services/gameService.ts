import { supabase } from '../lib/supabase';
import type { Player, Room, Guess, AnonymousVoice } from '../types/game';
import { generateRoundRobinSchedule } from '../utils/roundRobin';

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

  // Map Supabase room record to Room interface
  mapRoom(r: any): Room {
    return {
      id: r.id,
      roomCode: r.room_code,
      status: r.status,
      hostId: r.host_id,
      winner1Id: r.winner1_id,
      winner2Id: r.winner2_id,
      activeAudioPlayerId: r.active_audio_player_id,
      minigameTargetTime: r.minigame_target_time,
      currentBreakoutRound: r.current_breakout_round || 0,
      currentBreakoutEndTime: r.current_breakout_end_time,
      breakoutSchedule: r.breakout_schedule,
      anonymousAudioQueue: r.anonymous_audio_queue,
      currentGuessIndex: r.current_guess_index || 0,
      isPublic: r.is_public !== undefined ? r.is_public : true,
      createdAt: r.created_at,
    };
  },

  // Map Supabase player record to Player interface
  mapPlayer(p: any): Player {
    return {
      id: p.id,
      roomId: p.room_id,
      name: p.name,
      audioUrl: p.audio_url,
      hasRecorded: p.has_recorded,
      score: p.score || 0,
      reactionTimeMs: p.reaction_time_ms,
      recognitionScore: p.recognition_score || 0,
      correctGuessesCount: p.correct_guesses_count || 0,
      isSafe: p.is_safe || false,
      createdAt: p.created_at,
    };
  },

  // Quick Match: Find an open public bonfire with < 6 players, or create one
  async findOrCreatePublicBonfire(playerName: string): Promise<{ room: Room; player: Player }> {
    const { data: openRooms, error } = await supabase
      .from('rooms')
      .select('*, players(*)')
      .eq('status', 'LOBBY')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && openRooms && openRooms.length > 0) {
      for (const r of openRooms) {
        const count = r.players ? r.players.length : 0;
        if (count < 6) {
          try {
            return await this.joinRoom(r.room_code, playerName);
          } catch {
            // Next candidate
          }
        }
      }
    }

    return await this.createRoom(playerName);
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

    return {
      room: this.mapRoom(roomData),
      player: this.mapPlayer(playerData),
    };
  },

  // Join an existing room
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

    return {
      room: this.mapRoom(roomData),
      player: this.mapPlayer(playerData),
    };
  },

  // Update room state in cloud
  async updateRoom(roomId: string, updates: Partial<Room>): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.winner1Id !== undefined) payload.winner1_id = updates.winner1Id;
    if (updates.winner2Id !== undefined) payload.winner2_id = updates.winner2Id;
    if (updates.activeAudioPlayerId !== undefined) payload.active_audio_player_id = updates.activeAudioPlayerId;
    if (updates.minigameTargetTime !== undefined) payload.minigame_target_time = updates.minigameTargetTime;
    if (updates.currentBreakoutRound !== undefined) payload.current_breakout_round = updates.currentBreakoutRound;
    if (updates.currentBreakoutEndTime !== undefined) payload.current_breakout_end_time = updates.currentBreakoutEndTime;
    if (updates.breakoutSchedule !== undefined) payload.breakout_schedule = updates.breakoutSchedule;
    if (updates.anonymousAudioQueue !== undefined) payload.anonymous_audio_queue = updates.anonymousAudioQueue;
    if (updates.currentGuessIndex !== undefined) payload.current_guess_index = updates.currentGuessIndex;

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
    if (updates.recognitionScore !== undefined) payload.recognition_score = updates.recognitionScore;
    if (updates.correctGuessesCount !== undefined) payload.correct_guesses_count = updates.correctGuessesCount;
    if (updates.isSafe !== undefined) payload.is_safe = updates.isSafe;
    if (updates.score !== undefined) payload.score = updates.score;

    const { error } = await supabase.from('players').update(payload).eq('id', playerId);
    if (error) {
      console.error('Error updating player in Supabase:', error);
    }
  },

  // Upload recorded audio confession
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
      const fallbackUrl = URL.createObjectURL(audioBlob);
      await this.updatePlayer(playerId, { audioUrl: fallbackUrl, hasRecorded: true });
      return fallbackUrl;
    }

    const { data: publicData } = supabase.storage.from('confessions').getPublicUrl(data.path);
    const audioUrl = publicData.publicUrl;

    await this.updatePlayer(playerId, { audioUrl, hasRecorded: true });
    return audioUrl;
  },

  // Step 2: Initialize Speed Talk WebRTC Breakouts
  async startSpeedTalkBreakouts(roomId: string, playerIds: string[]): Promise<void> {
    const schedule = generateRoundRobinSchedule(playerIds);
    const endTime = Date.now() + 30000; // 30 second round

    await this.updateRoom(roomId, {
      status: 'BREAKOUT',
      breakoutSchedule: schedule,
      currentBreakoutRound: 0,
      currentBreakoutEndTime: endTime,
    });
  },

  // Advance to next Speed Talk round
  async advanceBreakoutRound(roomId: string, nextRound: number): Promise<void> {
    const endTime = Date.now() + 30000;
    await this.updateRoom(roomId, {
      currentBreakoutRound: nextRound,
      currentBreakoutEndTime: endTime,
    });
  },

  // Step 3: Initialize Blind Audio Guessing
  async startBlindAudioGuessing(roomId: string, players: Player[]): Promise<void> {
    // Collect all players with audio recorded and shuffle them
    const validPlayers = players.filter((p) => p.audioUrl);
    const shuffled = [...validPlayers].sort(() => Math.random() - 0.5);

    const labels = ['Voice A', 'Voice B', 'Voice C', 'Voice D', 'Voice E', 'Voice F', 'Voice G', 'Voice H'];
    const anonymousQueue: AnonymousVoice[] = shuffled.map((p, idx) => ({
      label: labels[idx] || `Voice ${idx + 1}`,
      audioUrl: p.audioUrl!,
      targetPlayerId: p.id,
    }));

    await this.updateRoom(roomId, {
      status: 'GUESSING',
      anonymousAudioQueue: anonymousQueue,
      currentGuessIndex: 0,
    });
  },

  // Submit a guess for a voice
  async submitGuess(guess: Guess): Promise<void> {
    const { error } = await supabase.from('guesses').insert({
      room_id: guess.roomId,
      guesser_id: guess.guesserId,
      target_player_id: guess.targetPlayerId,
      guessed_player_id: guess.guessedPlayerId,
      voice_label: guess.voiceLabel,
    });

    if (error) {
      console.error('Error submitting guess:', error);
    }
  },

  // Fetch all guesses submitted for this room
  async fetchGuesses(roomId: string): Promise<Guess[]> {
    const { data, error } = await supabase.from('guesses').select('*').eq('room_id', roomId);
    if (error || !data) return [];

    return data.map((g) => ({
      id: g.id,
      roomId: g.room_id,
      guesserId: g.guesser_id,
      targetPlayerId: g.target_player_id,
      guessedPlayerId: g.guessed_player_id,
      voiceLabel: g.voice_label,
    }));
  },

  // Advance to next voice in blind audio guessing
  async advanceGuessIndex(roomId: string, nextIndex: number): Promise<void> {
    await this.updateRoom(roomId, {
      currentGuessIndex: nextIndex,
    });
  },

  // Step 4: Scoring & Winner 1 Determination
  async calculateAndCrownWinner(roomId: string, players: Player[]): Promise<string> {
    const guesses = await this.fetchGuesses(roomId);

    // 1. Calculate Recognition Score for each player:
    // Total number of correct guesses received by each player (how recognizable they were)
    const recognitionScores: Record<string, number> = {};
    const reverseAccuracy: Record<string, number> = {};

    players.forEach((p) => {
      recognitionScores[p.id] = 0;
      reverseAccuracy[p.id] = 0;
    });

    guesses.forEach((g) => {
      // If guessed correctly on target
      if (g.guessedPlayerId === g.targetPlayerId) {
        // Recognition score increment for the target
        recognitionScores[g.targetPlayerId] = (recognitionScores[g.targetPlayerId] || 0) + 1;
        // Correct guesses increment for the guesser
        if (g.guesserId !== g.targetPlayerId) {
          reverseAccuracy[g.guesserId] = (reverseAccuracy[g.guesserId] || 0) + 1;
        }
      }
    });

    // Update scores in database for all players
    for (const p of players) {
      await this.updatePlayer(p.id, {
        recognitionScore: recognitionScores[p.id] || 0,
        correctGuessesCount: reverseAccuracy[p.id] || 0,
      });
    }

    // 2. Winner 1: Player with the MINIMUM recognition score (most unrecognizable voice)
    const candidates = [...players].sort((a, b) => {
      const scoreA = recognitionScores[a.id] || 0;
      const scoreB = recognitionScores[b.id] || 0;

      if (scoreA !== scoreB) {
        return scoreA - scoreB; // Ascending: minimum wins!
      }

      // Tie-Breaker: Highest number of correct guesses on other players
      const accA = reverseAccuracy[a.id] || 0;
      const accB = reverseAccuracy[b.id] || 0;
      if (accA !== accB) {
        return accB - accA; // Descending: higher accuracy wins tie-break!
      }

      // Final fallback: deterministic pseudo-random tie-break
      return a.id.localeCompare(b.id);
    });

    const winner1 = candidates[0];

    // Winner 1 is IMMUNE / SAFE
    await this.updatePlayer(winner1.id, { isSafe: true });

    // Transition room to PICKING stage
    await this.updateRoom(roomId, {
      status: 'PICKING',
      winner1Id: winner1.id,
    });

    return winner1.id;
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
        onRoomChange(this.mapRoom(roomData));
      }

      const { data: playersData } = await supabase.from('players').select('*').eq('room_id', roomId);
      if (playersData) {
        const playerMap: Record<string, Player> = {};
        playersData.forEach((p) => {
          playerMap[p.id] = this.mapPlayer(p);
        });
        onPlayersChange(playerMap);
      }
    };

    fetchLatest();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new) {
            onRoomChange(this.mapRoom(payload.new));
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

    const pollInterval = setInterval(fetchLatest, 1500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  },
};
