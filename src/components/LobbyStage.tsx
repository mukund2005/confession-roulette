import React, { useState, useEffect, useRef } from 'react';
import { Crown, Play, Copy, Check, Share2, Flame, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MAX_PLAYERS, MIN_PLAYERS_TO_START, type Player, type Room } from '../types/game';
import { getCamperAvatar } from '../utils/avatars';
import { audioTheme } from '../utils/audioTheme';

interface LobbyStageProps {
  room: Room;
  players: Player[];
  currentPlayer: Player | null;
  isHost: boolean;
  onStartGame: () => Promise<void>;
}

export const LobbyStage: React.FC<LobbyStageProps> = ({
  room,
  players,
  currentPlayer,
  isHost,
  onStartGame,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const prevCountRef = useRef(players.length);

  // Play join chime when a new camper sits down
  useEffect(() => {
    if (players.length > prevCountRef.current) {
      audioTheme.playJoinSound();
    }
    prevCountRef.current = players.length;
  }, [players.length]);

  const copyCode = () => {
    audioTheme.playClickSound();
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = async () => {
    audioTheme.playClickSound();
    const origin = window.location.origin;
    const link = `${origin}/?join=${room.roomCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Bonfire on Rupiko!',
          text: `Join our circle of ${MAX_PLAYERS} campers around the bonfire! Code: ${room.roomCode}`,
          url: link,
        });
        return;
      } catch {
        // Fallback to clipboard if share dialog was dismissed
      }
    }

    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleStart = async () => {
    if (!isHost) return;
    if (players.length < MIN_PLAYERS_TO_START) {
      setErrorMsg(`Need at least ${MIN_PLAYERS_TO_START} campers seated to ignite the fire.`);
      return;
    }

    audioTheme.playClickSound();
    setIsStarting(true);
    setErrorMsg(null);
    try {
      await onStartGame();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to light bonfire');
    } finally {
      setIsStarting(false);
    }
  };

  const hostPlayer = players.find((p) => p.id === room.hostId) || players.find((p) => p.isHost) || players[0];
  const canStart = players.length >= MIN_PLAYERS_TO_START;

  // 6 Circular Seating Angles (degrees)
  // Top (270°), Top-Right (330°), Bottom-Right (30°), Bottom (90°), Bottom-Left (150°), Top-Left (210°)
  const seatAngles = [270, 330, 30, 90, 150, 210];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-3 sm:p-4 max-w-4xl mx-auto font-serif select-none">
      {/* Bonfire Status Badge */}
      <div className="flex flex-col items-center text-center mb-4">
        <span className="text-xs font-serif tracking-widest text-amber-400 uppercase bg-amber-500/10 px-3.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 shadow-sm">
          <Flame className="h-3.5 w-3.5 fill-current animate-pulse text-amber-400" /> Gathering Around The Bonfire
        </span>
        <h1 className="text-2xl sm:text-4xl font-serif text-white mt-1.5 font-bold">
          {players.length} / {MAX_PLAYERS} Campers Seated
        </h1>
        <p className="text-white/60 text-xs sm:text-sm mt-0.5 max-w-md mx-auto font-sans">
          {players.length >= MAX_PLAYERS
            ? 'The circle is full! Host can ignite the flame.'
            : `Invite your friends with the bonfire code. Need ${Math.max(0, MIN_PLAYERS_TO_START - players.length)} more to start.`}
        </p>
      </div>

      {/* Bonfire Code & Share Card */}
      <div className="bg-[#121214] border border-white/15 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-xl shadow-xl mb-6">
        <div className="text-center sm:text-left">
          <span className="text-[10px] text-white/40 uppercase font-sans tracking-wider block font-bold">
            Bonfire Code
          </span>
          <div className="text-3xl font-mono font-black tracking-widest text-[#fbbf24]">
            {room.roomCode}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 font-sans">
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#e2e8f0] hover:bg-white text-black rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            title="Copy invite link for friends"
          >
            {copiedLink ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>Share Link</span>
              </>
            )}
          </button>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition-all active:scale-95"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-white/60" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* CIRCULAR BONFIRE ARENA */}
      <div className="relative w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] my-2 flex items-center justify-center">
        {/* Ambient Campfire Glow Rings */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-600/10 via-orange-500/15 to-transparent blur-2xl pointer-events-none animate-pulse-subtle" />
        <div className="absolute w-[260px] h-[260px] sm:w-[330px] sm:h-[330px] rounded-full border border-dashed border-amber-500/20 pointer-events-none" />

        {/* Centerpiece: Campfire Graphic with Flame Animations */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <div className="relative flex items-center justify-center">
            {/* Pulsing Ember Halo */}
            <div className="absolute -inset-4 rounded-full bg-amber-500/20 blur-xl animate-pulse" />

            <img
              src="/campfire.png"
              alt="Bonfire"
              className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_12px_30px_rgba(249,115,22,0.6)] animate-pulse-subtle"
            />
          </div>
          <span className="text-[11px] font-serif uppercase tracking-widest text-amber-400/90 font-bold mt-1 bg-black/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            {players.length} / 6 Seated
          </span>
        </div>

        {/* 6 Circular Seats Around the Bonfire */}
        {seatAngles.map((angleDeg, seatIndex) => {
          // Convert to radians (0° is East, 270° is North)
          const angleRad = (angleDeg * Math.PI) / 180;
          // Radius based on screen size (desktop vs mobile)
          const radiusPct = 40; // 40% from center
          const x = 50 + radiusPct * Math.cos(angleRad);
          const y = 50 + radiusPct * Math.sin(angleRad);

          const player = players[seatIndex] || null;
          const isSeatHost = player ? (player.id === room.hostId || player.isHost) : false;
          const isMe = player ? player.id === currentPlayer?.id : false;
          const avatar = player ? getCamperAvatar(player.avatarIndex) : null;

          return (
            <div
              key={seatIndex}
              style={{
                position: 'absolute',
                top: `${y}%`,
                left: `${x}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="z-20"
            >
              <AnimatePresence mode="wait">
                {player && avatar ? (
                  /* Occupied Seat with Framer Motion entry */
                  <motion.div
                    key={player.id}
                    initial={{ scale: 0, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    {/* Avatar Circle with Glow & Host Crown */}
                    <div className="relative">
                      {isSeatHost && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30">
                          <span className="h-6 w-6 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg shadow-amber-500/50 border border-white/40 animate-bounce">
                            <Crown className="h-3.5 w-3.5 fill-current" />
                          </span>
                        </div>
                      )}

                      <div
                        className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl ${avatar.bgColor} border-2 ${
                          isMe
                            ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
                            : avatar.borderColor
                        } flex items-center justify-center text-2xl sm:text-3xl transition-transform hover:scale-110 shadow-lg relative`}
                      >
                        {avatar.emoji}

                        {/* Online firefly pulse */}
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
                      </div>
                    </div>

                    {/* Name & Role Badge */}
                    <div className="flex flex-col items-center mt-1 text-center font-sans">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white max-w-[70px] truncate">
                          {player.name}
                        </span>
                        {isMe && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-amber-300/70 font-serif">
                        {isSeatHost ? 'Campfire Host' : 'Camper'}
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  /* Empty Campfire Seat Placeholder */
                  <div className="flex flex-col items-center opacity-40 hover:opacity-75 transition-opacity">
                    <div className="h-11 w-11 sm:h-13 sm:w-13 rounded-2xl border-2 border-dashed border-white/30 bg-black/40 flex items-center justify-center text-xs text-white/50 shadow-inner">
                      ?
                    </div>
                    <span className="text-[10px] font-sans text-white/40 mt-1 italic">
                      Seat {seatIndex + 1}
                    </span>
                  </div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="mb-3 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-sans flex items-center gap-2 animate-shake">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* HOST-EXCLUSIVE GAME START AUTHORITY CONTROLS */}
      <div className="w-full max-w-md mt-2">
        {isHost ? (
          /* Host View: Visible Exclusively to the Host */
          <div className="flex flex-col items-center text-center">
            <button
              type="button"
              onClick={handleStart}
              disabled={isStarting || !canStart}
              className={`w-full py-4 rounded-2xl font-serif font-bold text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${
                canStart
                  ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-white hover:to-amber-300 text-black shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700/60 cursor-not-allowed opacity-60'
              }`}
            >
              {isStarting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Igniting the Embers...
                </span>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>
                    Light the Bonfire ({players.length}/{MAX_PLAYERS} Campers)
                  </span>
                </>
              )}
            </button>

            {!canStart && (
              <p className="text-xs text-amber-400/80 font-sans mt-2 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Need at least {MIN_PLAYERS_TO_START} campers to ignite the fire ({players.length}/{MIN_PLAYERS_TO_START} seated).
              </p>
            )}
          </div>
        ) : (
          /* Guest View: Non-host participants must NEVER see a start button */
          <div className="text-center p-4 rounded-2xl bg-[#121214] border border-white/15 shadow-lg">
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-1.5 font-serif font-bold text-xs uppercase tracking-wider">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>
                Waiting for host {hostPlayer?.name || 'the host'} to light the fire...
              </span>
            </div>
            <p className="text-xs text-white/50 font-sans">
              Only the campfire host has the flame to ignite the bonfire once everyone is seated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
