import { supabase, SUPABASE_URL, SUPABASE_KEY } from '../lib/supabase';
import { MAX_PLAYERS, MIN_PLAYERS_TO_START, type PublicLobbyInfo } from '../types/game';
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
      currentPlayers: r.current_players,
      maxPlayers: r.max_players || MAX_PLAYERS,
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
    let name = p.name || '';
    let avatarIndex = p.avatar_index !== undefined ? p.avatar_index : 0;

    // Graceful extraction if avatar was serialized in name (fallback when schema column not yet added)
    if (name.includes('#')) {
      const parts = name.split('#');
      const parsed = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 7) {
        avatarIndex = parsed;
        name = parts.slice(0, -1).join('#');
      }
    }

    return {
      id: p.id,
      roomId: p.room_id,
      name,
      avatarIndex,
      isHost: Boolean(p.is_host),
      audioUrl: p.audio_url,
      hasRecorded: p.has_recorded,
      score: p.score || 0,
      reactionTimeMs: p.reaction_time_ms,
      recognitionScore: p.recognition_score || 0,
      correctGuessesCount: p.correct_guesses_count || 0,
      isSafe: p.is_safe || false,
      createdAt: p.created_at,
      joinedAt: p.joined_at || p.created_at,
    };
  },

  // Browse live public lobbies (Among Us style)
  async browsePublicLobbies(): Promise<PublicLobbyInfo[]> {
    try {
      const cutoffTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: openRooms, error } = await supabase
        .from('rooms')
        .select('*, players(id, name, avatar_index, is_host)')
        .eq('status', 'LOBBY')
        .eq('is_public', true)
        .gt('created_at', cutoffTime)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !openRooms) {
        console.warn('Could not browse lobbies:', error);
        return [];
      }

      return openRooms
        .filter((r) => r.players && r.players.length > 0)
        .map((r) => {
          const players = r.players || [];
          const hostPlayer = players.find((p: any) => p.id === r.host_id) || players[0];
          return {
            id: r.id,
            roomCode: r.room_code,
            hostName: hostPlayer ? hostPlayer.name : 'Campfire Host',
            hostAvatar: hostPlayer && hostPlayer.avatar_index !== undefined ? hostPlayer.avatar_index : 0,
            playerCount: players.length,
            maxPlayers: r.max_players || MAX_PLAYERS,
            status: r.status,
            createdAt: r.created_at,
          };
        });
    } catch (e) {
      console.warn('Error in browsePublicLobbies:', e);
      return [];
    }
  },

  // Auto-Matchmaking ("Quick Play / Join Bonfire"): FIFO oldest active room, or creates new
  async findOrCreatePublicBonfire(
    playerName: string,
    avatarIndex: number = 0
  ): Promise<{ room: Room; player: Player; allPlayers: Player[] }> {
    // 1. Query active rooms FIFO created within the last 45 minutes (ignores stale/ghost rooms)
    const cutoffTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const { data: openRooms, error } = await supabase
      .from('rooms')
      .select('*, players(*)')
      .eq('status', 'LOBBY')
      .eq('is_public', true)
      .gt('created_at', cutoffTime)
      .order('created_at', { ascending: true }) // FIFO filling
      .limit(10);

    if (!error && openRooms && openRooms.length > 0) {
      for (const r of openRooms) {
        const count = r.players ? r.players.length : 0;
        // Strictly capped at MAX_PLAYERS (6)
        if (count > 0 && count < MAX_PLAYERS) {
          try {
            return await this.joinRoom(r.room_code, playerName, avatarIndex);
          } catch {
            // Room might have filled up or locked, try next candidate
          }
        }
      }
    }

    // 2. If no valid open room, automatically create new room as Host
    return await this.createRoom(playerName, avatarIndex);
  },

  // Start play: real matchmaking alias
  async startSoloPlay(playerName: string, avatarIndex: number = 0): Promise<{ room: Room; player: Player; allPlayers: Player[] }> {
    return this.findOrCreatePublicBonfire(playerName, avatarIndex);
  },

  // Host a Room (The "Bonfire"): generates unique 4-character code, sets host_id, max_players = 6
  async hostRoom(
    hostName: string,
    avatarIndex: number = 0
  ): Promise<{ room: Room; player: Player; allPlayers: Player[] }> {
    return this.createRoom(hostName, avatarIndex);
  },

  // Create a room in Supabase with Host role
  async createRoom(
    hostName: string,
    avatarIndex: number = 0
  ): Promise<{ room: Room; player: Player; allPlayers: Player[] }> {
    const hostId = crypto.randomUUID();
    const roomCode = this.generateRoomCode();

    const insertPayload: Record<string, any> = {
      room_code: roomCode,
      status: 'LOBBY',
      host_id: hostId,
      is_public: true,
    };

    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .insert(insertPayload)
      .select()
      .single();

    if (roomError) {
      console.error('Supabase create room error:', roomError);
      throw new Error(`Failed to create room in cloud: ${roomError.message}. Make sure supabase_schema.sql was run in your Supabase SQL editor.`);
    }

    const playerPayload: Record<string, any> = {
      id: hostId,
      room_id: roomData.id,
      name: `${hostName}#${avatarIndex}`,
      avatar_index: avatarIndex,
      is_host: true,
      has_recorded: false,
      score: 0,
      is_safe: false,
    };

    let { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert(playerPayload)
      .select()
      .single();

    // Fallback if avatar_index or is_host column has not yet been added in Supabase
    if (playerError && (playerError.code === 'PGRST204' || playerError.message?.includes('column'))) {
      delete playerPayload.avatar_index;
      delete playerPayload.is_host;
      const retry = await supabase.from('players').insert(playerPayload).select().single();
      playerData = retry.data;
      playerError = retry.error;
    }

    if (playerError) {
      console.error('Supabase create host error:', playerError);
      throw new Error(`Failed to create host player: ${playerError.message}`);
    }

    const player = this.mapPlayer(playerData);
    return {
      room: this.mapRoom(roomData),
      player,
      allPlayers: [player],
    };
  },

  // Join an existing room with strict 6-player capacity check
  async joinRoom(
    roomCode: string,
    playerName: string,
    avatarIndex: number = 0
  ): Promise<{ room: Room; player: Player; allPlayers: Player[] }> {
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
      throw new Error(`Bonfire code "${formattedCode}" not found. Verify the code with the host.`);
    }

    if (roomData.status !== 'LOBBY') {
      throw new Error('This bonfire game is already in progress.');
    }

    // Hard room capacity limit: Strictly maximum 6 players. Under no circumstances can a 7th player enter!
    const { count: currentCampersCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomData.id);

    if (currentCampersCount !== null && currentCampersCount >= MAX_PLAYERS) {
      throw new Error(`This bonfire is full (maximum ${MAX_PLAYERS} campers allowed). Please join or host another bonfire.`);
    }

    const playerPayload: Record<string, any> = {
      id: playerId,
      room_id: roomData.id,
      name: `${playerName}#${avatarIndex}`,
      avatar_index: avatarIndex,
      is_host: false,
      has_recorded: false,
      score: 0,
      is_safe: false,
    };

    let { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert(playerPayload)
      .select()
      .single();

    // Fallback if avatar_index or is_host column has not yet been added in Supabase
    if (playerError && (playerError.code === 'PGRST204' || playerError.message?.includes('column'))) {
      delete playerPayload.avatar_index;
      delete playerPayload.is_host;
      const retry = await supabase.from('players').insert(playerPayload).select().single();
      playerData = retry.data;
      playerError = retry.error;
    }

    if (playerError) {
      console.error('Supabase create player error:', playerError);
      throw new Error(`Failed to join bonfire: ${playerError.message}`);
    }

    // Fetch all players currently seated in this room so the joining player immediately has the full circle
    const { data: allPlayersData } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomData.id);

    const allPlayers = allPlayersData && allPlayersData.length > 0
      ? allPlayersData.map((p) => this.mapPlayer(p))
      : [this.mapPlayer(playerData)];

    return {
      room: this.mapRoom(roomData),
      player: this.mapPlayer(playerData),
      allPlayers,
    };
  },

  // Host-Exclusive Game Start Authority with validation and atomic room lock
  async startGameAsHost(roomId: string, callerId: string): Promise<void> {
    // 1. Verify caller is the room host
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();

    if (roomError || !roomData) {
      throw new Error('Room not found');
    }

    if (roomData.host_id !== callerId) {
      throw new Error('Unauthorized: Only the host has authority to ignite the bonfire');
    }

    // 2. Verify minimum player threshold (minimum 3 players)
    const { count: playerCount } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);

    if (playerCount !== null && playerCount < MIN_PLAYERS_TO_START) {
      throw new Error(`Need at least ${MIN_PLAYERS_TO_START} campers to ignite the fire (${playerCount}/${MIN_PLAYERS_TO_START} seated).`);
    }

    // 3. Atomic State Lock: transition to RECORDING and lock out public traffic (is_public = false)
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'RECORDING',
        is_public: false,
      })
      .eq('id', roomId)
      .eq('host_id', callerId);

    if (updateError) {
      throw new Error(`Failed to start game: ${updateError.message}`);
    }
  },

  // Promote next host if current host disconnects (Host Migration Fail-Safe)
  async promoteNextHost(roomId: string, nextHostId: string): Promise<void> {
    try {
      await supabase
        .from('rooms')
        .update({ host_id: nextHostId })
        .eq('id', roomId);

      await supabase
        .from('players')
        .update({ is_host: true })
        .eq('id', nextHostId);
    } catch (e) {
      console.warn('Error promoting next host:', e);
    }
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

  // Initialize Round 1 Minigame — "Balloon Popping Frenzy" (30s synchronized clicker)
  async startBalloonMinigame(roomId: string, targetEndTime: number, playerIds: string[]): Promise<void> {
    // Reset all players' minigame scores & last pop timestamps
    for (const pid of playerIds) {
      await this.updatePlayer(pid, {
        score: 0,
        reactionTimeMs: null,
      });
    }

    await this.updateRoom(roomId, {
      status: 'MINIGAME',
      minigameTargetTime: targetEndTime,
      winner1Id: null,
      winner2Id: null,
      activeAudioPlayerId: null,
    });
  },

  // Submit final score and last pop timestamp from client at t = 0
  async submitMinigameScore(playerId: string, score: number, lastPopTimeMs: number): Promise<void> {
    await this.updatePlayer(playerId, {
      score,
      reactionTimeMs: lastPopTimeMs,
    });
  },

  // Calculate highest pop count and crown Winner 1 with tie-breaker
  async crownMinigameWinner(roomId: string, players: Player[]): Promise<string> {
    const candidates = [...players].sort((a, b) => {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;

      // 1. Highest score wins
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      // 2. Tie-Breaker: Earlier final pop timestamp wins
      const timeA = a.reactionTimeMs ?? Number.MAX_SAFE_INTEGER;
      const timeB = b.reactionTimeMs ?? Number.MAX_SAFE_INTEGER;
      if (timeA !== timeB) {
        return timeA - timeB; // smaller timestamp = popped earlier
      }

      // 3. Fallback deterministic tie-breaker
      return a.id.localeCompare(b.id);
    });

    const winner1 = candidates[0];
    if (winner1) {
      await this.updatePlayer(winner1.id, { isSafe: true });
      await this.updateRoom(roomId, {
        winner1Id: winner1.id,
      });
      return winner1.id;
    }

    return '';
  },

  // Proceed from Minigame results to Synchronized Confession Listening (REVEAL)
  async proceedFromMinigameToReveal(roomId: string, winner1Id: string, players: Player[]): Promise<void> {
    const eligible = players.filter((p) => p.id !== winner1Id && p.audioUrl);
    const firstRevealId = eligible[0]?.id || null;

    await this.updateRoom(roomId, {
      status: 'REVEAL',
      winner1Id,
      winner2Id: null,
      activeAudioPlayerId: firstRevealId,
    });
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

    const channelName = `room:${roomId}:${playerId}`;
    const channel = supabase.channel(channelName, {
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
