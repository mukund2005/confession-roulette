import React, { useState, useEffect, useRef } from 'react';
import { Crown, Users, Play, Copy, Check, Bot, Share2, Flame, Sparkles } from 'lucide-react';
import type { Player, Room } from '../types/game';
import { audioTheme } from '../utils/audioTheme';

interface LobbyStageProps {
  room: Room;
  players: Player[];
  currentPlayer: Player | null;
  isHost: boolean;
  onStartGame: () => Promise<void>;
  onAddBot: (botName: string) => Promise<void>;
}

export const LobbyStage: React.FC<LobbyStageProps> = ({
  room,
  players,
  currentPlayer,
  isHost,
  onStartGame,
  onAddBot,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const targetTimeRef = useRef<number | null>(null);
  const autoStartRef = useRef(false);
  const onStartGameRef = useRef(onStartGame);
  onStartGameRef.current = onStartGame;
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

  const copyInviteLink = () => {
    audioTheme.playClickSound();
    const origin = window.location.origin;
    const link = `${origin}/?join=${room.roomCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleStart = async () => {
    audioTheme.playClickSound();
    setIsStarting(true);
    try {
      await onStartGame();
    } finally {
      setIsStarting(false);
    }
  };

  const handleAddWanderingCamper = () => {
    audioTheme.playClickSound();
    const camperNames = ['Kian', 'Zara', 'Milo', 'Ember', 'Rowan', 'Sage', 'Orion', 'Luna'];
    const randomName = camperNames[Math.floor(Math.random() * camperNames.length)] + '_' + Math.floor(Math.random() * 89 + 10);
    onAddBot(randomName);
  };

  // Automatic Game Start when everyone (6 campers) is seated
  useEffect(() => {
    if (players.length < 6) {
      targetTimeRef.current = null;
      setAutoCountdown(null);
      return;
    }

    if (!targetTimeRef.current) {
      targetTimeRef.current = Date.now() + 3000;
    }

    const interval = setInterval(() => {
      if (!targetTimeRef.current) return;
      const diff = Math.max(0, Math.ceil((targetTimeRef.current - Date.now()) / 1000));
      setAutoCountdown(diff);

      if (diff === 0) {
        clearInterval(interval);
        if (!autoStartRef.current) {
          autoStartRef.current = true;
          setIsStarting(true);
          onStartGameRef.current();
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [players.length]);

  const isFullCircle = players.length >= 6;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto font-serif">
      {/* Campfire Centerpiece */}
      <div className="flex flex-col items-center text-center mb-6">
        <img
          src="/campfire.png"
          alt="Bonfire"
          className="w-28 h-28 object-contain drop-shadow-[0_10px_25px_rgba(249,115,22,0.45)] mb-3 animate-pulse-subtle"
        />
        <span className="text-xs font-serif tracking-widest text-amber-400 uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5" /> Gathering Around The Bonfire
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif text-white mt-2">
          {players.length} / 6 Campers Seated
        </h1>
        <p className="text-white/60 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          {isFullCircle
            ? 'All 6 campers seated around the fire! Starting automatically...'
            : 'Take your seat as campers gather around the embers.'}
        </p>
      </div>

      {/* Bonfire Code & Share Card (Only shown for Private Hosted Bonfires, hidden for Solo Play) */}
      {!room.isSolo && (
        <div className="bg-[#121214] border border-white/15 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-xl shadow-xl mb-6">
          <div className="text-center sm:text-left">
            <span className="text-[10px] text-white/40 uppercase font-sans tracking-wider block font-semibold">
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
                  <Check className="h-4 w-4" />
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
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-white/60" />
                  <span>Code</span>
                </>
              )}
            </button>
            {players.length < 6 && (
              <button
                onClick={handleAddWanderingCamper}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-medium transition-all"
                title="Add a simulated camper to fill the 6-player group"
              >
                <Bot className="h-4 w-4" />
                <span>+ Camper</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Connected Campers Grid (Up to 6) */}
      <div className="w-full max-w-2xl bg-[#121214]/80 border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4 font-sans">
          <div className="flex items-center gap-2 text-xs font-bold text-white/80 uppercase tracking-wider">
            <Users className="h-4 w-4 text-amber-400" />
            <span>Circle of Campers ({players.length} / 6)</span>
          </div>
          <span className="text-[11px] text-amber-400 font-medium">
            {6 - players.length > 0 ? `${6 - players.length} seats remaining` : 'Full Circle'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {players.map((player) => {
            const isPlayerHost = player.id === room.hostId && !room.isSolo;
            const isMe = player.id === currentPlayer?.id;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isMe
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                    : 'bg-black/60 border-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isPlayerHost
                        ? 'bg-amber-400 text-black shadow-md'
                        : isMe
                        ? 'bg-amber-500/30 text-amber-300'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-sans">
                      <span className="text-xs font-semibold text-white">{player.name}</span>
                      {isMe && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/50 flex items-center gap-1">
                      {isPlayerHost ? (
                        <>
                          <Crown className="h-3 w-3 text-amber-400" /> Keeper
                        </>
                      ) : (
                        'Seated'
                      )}
                    </span>
                  </div>
                </div>

                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              </div>
            );
          })}

          {/* Empty Seats Placeholders up to 6 */}
          {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-white/10 bg-black/30 opacity-40 font-sans"
            >
              <div className="h-9 w-9 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-xs text-white/40">
                ?
              </div>
              <span className="text-xs text-white/40 italic">Waiting for camper...</span>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-Start Status or Countdown */}
      <div className="w-full max-w-md">
        {autoCountdown !== null ? (
          /* Auto-Countdown notification when 6 campers are seated */
          <div className="text-center p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-pulse">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-serif uppercase tracking-widest font-bold">
                Circle of 6 Complete
              </span>
            </div>
            <div className="text-2xl font-serif font-black text-white my-1">
              Igniting the Bonfire in {autoCountdown}s...
            </div>
            <p className="text-[11px] text-white/60 font-sans mb-3">
              Get ready to whisper your confession into the flames.
            </p>
            <button
              type="button"
              onClick={() => {
                audioTheme.playClickSound();
                setIsStarting(true);
                onStartGame();
              }}
              className="px-5 py-2 bg-[#fbbf24] hover:bg-white text-black font-serif text-xs font-bold rounded-xl uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-1.5"
            >
              <Flame className="h-3.5 w-3.5 fill-current" />
              <span>Ignite Now</span>
            </button>
          </div>
        ) : !room.isSolo && isHost ? (
          /* Host Manual start if they want to start early before 6 campers */
          <button
            onClick={handleStart}
            disabled={isStarting || players.length < 1}
            className="w-full py-4 rounded-xl bg-[#e2e8f0] hover:bg-white text-black font-serif font-bold text-sm uppercase tracking-widest shadow-xl shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isStarting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Igniting the Embers...
              </span>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Ignite Bonfire ({players.length} Campers)</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-center p-4 rounded-xl bg-[#121214] border border-white/15">
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-serif uppercase tracking-wider">
                Waiting for 6 campers to be seated...
              </span>
            </div>
            <p className="text-xs text-white/50 font-sans">
              The bonfire automatically ignites once all seats are filled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
