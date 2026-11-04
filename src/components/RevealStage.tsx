import React, { useState, useRef, useEffect } from 'react';
import { Shield, Crown, Play, Pause, SkipForward, Volume2, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { Player, Room } from '../types/game';
import { AudioVisualizer } from './AudioVisualizer';

interface RevealStageProps {
  room: Room;
  players: Player[];
  currentPlayer: Player | null;
  winner1: Player | null;
  winner2: Player | null;
  isHost: boolean;
  onNextConfession: () => Promise<void>;
  onPlayAgain: () => Promise<void>;
}

export const RevealStage: React.FC<RevealStageProps> = ({
  room,
  players,
  winner1,
  winner2,
  isHost,
  onNextConfession,
  onPlayAgain,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reactions, setReactions] = useState<Record<string, number>>({
    '😱': 0,
    '🫣': 0,
    '💀': 0,
    '😂': 0,
    '🫡': 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Active player whose audio is on the hot seat
  const activePlayer = room.activeAudioPlayerId
    ? players.find((p) => p.id === room.activeAudioPlayerId) || null
    : null;

  // Filter out Winner 1 (who is safe) to get the reveal queue
  const queuePlayers = players.filter((p) => p.id !== room.winner1Id);

  // Reset audio playback whenever active player changes
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [room.activeAudioPlayerId]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Audio play prevented:', err);
          // Auto fallback to speech synthesis if audioUrl is missing or demo bot
          if (!activePlayer?.audioUrl && 'speechSynthesis' in window) {
            const synth = window.speechSynthesis;
            const utter = new SpeechSynthesisUtterance(
              `This is ${activePlayer?.name}'s confession. I once ate my roommate's leftovers and blamed the dog!`
            );
            utter.onend = () => setIsPlaying(false);
            synth.speak(utter);
            setIsPlaying(true);
          }
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setProgress(100);
  };

  const handleReact = (emoji: string) => {
    setReactions((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto">
      {/* Stage Header */}
      <div className="text-center mb-6">
        <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
          Stage 5: The Hot Seat Reveal
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Secrets Laid Bare
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          One confession is shielded forever. Everyone else's recordings are revealed to the room.
        </p>
      </div>

      {/* Immunity Shield Card for Winner 1 */}
      <div className="w-full max-w-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-emerald-950/70 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">
                {winner1?.name || 'Winner 1'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Crown className="h-3 w-3 text-amber-400" /> IMMUNE & SAFE
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              Audio confession permanently masked and suppressed from playback.
            </p>
          </div>
        </div>

        {winner2 && (
          <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-emerald-500/20 pt-2 sm:pt-0 sm:pl-4">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">
              Winner 2 (Choice)
            </span>
            <span className="text-xs font-semibold text-slate-200">{winner2.name}</span>
          </div>
        )}
      </div>

      {/* Main Hot Seat Player Box */}
      <div className="w-full max-w-2xl">
        {activePlayer ? (
          /* Active Playing Box */
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden mb-6">
            {/* Glow accent */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Hidden HTML Audio element */}
            {activePlayer.audioUrl && (
              <audio
                ref={audioRef}
                src={activePlayer.audioUrl}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleAudioEnded}
                className="hidden"
              />
            )}

            <div className="flex flex-col items-center text-center mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 mb-3 flex items-center gap-1.5 animate-pulse">
                <Volume2 className="h-3.5 w-3.5" /> Now on the Hot Seat
              </span>

              <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-xl shadow-rose-950/50 mb-3 ring-4 ring-rose-500/20">
                {activePlayer.name.charAt(0).toUpperCase()}
              </div>

              <h2 className="text-2xl font-black text-white">{activePlayer.name}'s Confession</h2>
              <p className="text-xs text-slate-400 mt-1">
                {activePlayer.id === winner2?.id
                  ? 'Winner 2 was crowned, but confessions spared no one!'
                  : 'Listen closely...'}
              </p>
            </div>

            {/* Visualizer during play */}
            <div className="flex justify-center mb-6">
              <AudioVisualizer isActive={isPlaying} variant={isPlaying ? 'playing' : 'idle'} />
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mb-6 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Audio Controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                type="button"
                onClick={togglePlay}
                className="h-16 w-16 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white flex items-center justify-center shadow-lg shadow-rose-950/50 hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="h-7 w-7 fill-current ml-0.5" />
                )}
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={onNextConfession}
                  className="flex items-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all active:scale-95 shadow-md"
                  title="Next Confession in Queue"
                >
                  <span>Next Confession</span>
                  <SkipForward className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Fun Emoji Reactions Bar */}
            <div className="border-t border-slate-800/80 pt-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center mb-2.5">
                Room Reactions
              </span>
              <div className="flex justify-center gap-2 sm:gap-3">
                {Object.entries(reactions).map(([emoji, count]) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReact(emoji)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-sm font-semibold transition-all active:scale-125"
                  >
                    <span>{emoji}</span>
                    <span className="text-xs text-slate-400 font-mono">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* All Confessions Completed Card */
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl mb-6">
            <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">All Confessions Revealed!</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-6">
              Every secret was aired out except Winner 1 ({winner1?.name}), whose voice remained
              untouched.
            </p>

            {isHost ? (
              <button
                type="button"
                onClick={onPlayAgain}
                className="w-full max-w-xs py-4 mx-auto rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-rose-950/40 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Play Again with this Room</span>
              </button>
            ) : (
              <p className="text-xs text-slate-400">Waiting for host to start a new round...</p>
            )}
          </div>
        )}

        {/* Reveal Queue List */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-3">
            Room Confession Queue
          </span>

          <div className="space-y-2">
            {/* Winner 1 always listed as safe */}
            {winner1 && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                <div className="flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-300">{winner1.name}</span>
                </div>
                <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  IMMUNE / MASKED
                </span>
              </div>
            )}

            {/* Other queue players */}
            {queuePlayers.map((player) => {
              const isCurrentPlaying = player.id === room.activeAudioPlayerId;
              const isSecondWinner = player.id === room.winner2Id;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                    isCurrentPlaying
                      ? 'bg-rose-500/15 border-rose-500/50 text-white shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : 'bg-slate-950/60 border-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-md bg-slate-800 flex items-center justify-center text-[11px] font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{player.name}</span>
                    {isSecondWinner && (
                      <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                        WINNER 2
                      </span>
                    )}
                  </div>

                  <div>
                    {isCurrentPlaying ? (
                      <span className="flex items-center gap-1 font-bold text-rose-400 text-[11px]">
                        <Volume2 className="h-3.5 w-3.5 animate-bounce" /> Playing
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">In Queue</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
