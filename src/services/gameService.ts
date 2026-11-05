import { supabase, SUPABASE_URL, SUPABASE_KEY } from '../lib/supabase';
import { MAX_PLAYERS } from '../types/game';
import type { Player, Room, Guess, AnonymousVoice } from '../types/game';
import { generateRoundRobinSchedule } from '../utils/roundRobin';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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
      isSolo: r.is_public === false,
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

  // Quick Match: Find an open public bonfire with < MAX_PLAYERS, or create one
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
        if (count < MAX_PLAYERS) {
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

  // Start play: real 4-player matchmaking without bots
  async startSoloPlay(playerName: string): Promise<{ room: Room; player: Player }> {
    return this.findOrCreatePublicBonfire(playerName);
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

    // Strict MAX_PLAYERS maximum cap restriction
    const { count: currentCampersCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomData.id);

    if (currentCampersCount !== null && currentCampersCount >= MAX_PLAYERS) {
      throw new Error(`This bonfire is full (maximum ${MAX_PLAYERS} campers allowed). Please join or host another bonfire.`);
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

  // Upload recorded audio confession with base64 data URL fallback for reliable cross-internet sync
  async uploadAudio(roomId: string, playerId: string, audioBlob: Blob): Promise<string> {
    const fileName = `${roomId}/${playerId}_${Date.now()}.webm`;

    try {
      const { data, error } = await supabase.storage
        .from('confessions')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicData } = supabase.storage.from('confessions').getPublicUrl(data.path);
        const audioUrl = publicData.publicUrl;
        await this.updatePlayer(playerId, { audioUrl, hasRecorded: true });
        return audioUrl;
      }
    } catch (err) {
      console.warn('Storage upload error, using base64 audio sync over internet:', err);
    }

    // Base64 fallback ensures audio is 100% playable over the internet even if bucket policies fail
    const base64DataUrl = await blobToBase64(audioBlob);
    await this.updatePlayer(playerId, { audioUrl: base64DataUrl, hasRecorded: true });
    return base64DataUrl;
  },

  // Remove player from room and cleanup empty rooms
  async leaveRoom(roomId: string, playerId: string): Promise<void> {
    await supabase.from('players').delete().eq('id', playerId).eq('room_id', roomId);
    const { count } = await supabase.from('players').select('*', { count: 'exact', head: true }).eq('room_id', roomId);
    if (count === 0) {
      await supabase.from('rooms').delete().eq('id', roomId);
    }
  },

  // Synchronous keepalive deletion for tab close / pagehide
  sendKeepaliveLeave(playerId: string) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/players?id=eq.${playerId}`;
      fetch(url, {
        method: 'DELETE',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        keepalive: true,
      }).catch(() => {});
    } catch (e) {
      console.warn('Keepalive leave failed:', e);
    }
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

    // Queue up confessions to be heard together by all players (excluding Winner 1 whose voice is permanently safe)
    const eligible = players.filter((p) => p.id !== winner1.id && p.audioUrl);
    const firstRevealId = eligible[0]?.id || null;

    // Transition room to REVEAL so all players listen to all confessions synchronously before Winner 1 chooses Winner 2!
    await this.updateRoom(roomId, {
      status: 'REVEAL',
      winner1Id: winner1.id,
      winner2Id: null,
      activeAudioPlayerId: firstRevealId,
    });

    return winner1.id;
  },

  // Subscribe to real-time updates and presence heartbeats for a room and all connected players
  subscribeToRoom(
    roomId: string,
    playerId: string,
    onRoomChange: (room: Room) => void,
    onPlayersChange: (players: Record<string, Player>) => void,
    onPlayerDisconnect?: (disconnectedPlayerId: string) => void,
    onPresenceSync?: (activePresenceKeys: string[]) => void
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

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: playerId,
        },
      },
    });

    channel
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
      .on('presence', { event: 'sync' }, () => {
        try {
          const state = channel.presenceState();
          const activeKeys = Object.keys(state);
          onPresenceSync?.(activeKeys);
        } catch {
          // ignore
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Automatically kick out disconnected campers
        const candidateKeys: string[] = [];
        if (key) candidateKeys.push(key);
        if (leftPresences && Array.isArray(leftPresences)) {
          leftPresences.forEach((p: any) => {
            const id = p.playerId || p.key;
            if (id) candidateKeys.push(id);
          });
        }
        candidateKeys.forEach((leftId) => {
          if (leftId && leftId !== playerId) {
            onPlayerDisconnect?.(leftId);
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            playerId,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    const pollInterval = setInterval(fetchLatest, 1500);

    return () => {
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  },
};
