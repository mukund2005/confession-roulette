import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Shield, Crown, Play, Pause, SkipForward, Volume2, RotateCcw, CheckCircle2, ArrowRight, Sparkles, Flame } from 'lucide-react';
import type { Player, Room } from '../types/game';
import { AudioVisualizer } from './AudioVisualizer';
import { audioTheme } from '../utils/audioTheme';

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
  currentPlayer,
  winner1,
  winner2,
  isHost,
  onNextConfession,
  onPlayAgain,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);
  const [reactions, setReactions] = useState<Record<string, number>>({
    '😱': 0,
    '🫣': 0,
    '💀': 0,
    '😂': 0,
    '🫡': 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Active player whose audio is currently playing to all campers
  const activePlayer = room.activeAudioPlayerId
    ? players.find((p) => p.id === room.activeAudioPlayerId) || null
    : null;

  // Filter out Winner 1 (whose voice is permanently protected) to get the confession queue
  const queuePlayers = players.filter((p) => p.id !== room.winner1Id);

  // Fire confetti if this is the Grand Finale (both Winner 1 & Winner 2 crowned)
  useEffect(() => {
    if (room.winner2Id) {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#fbbf24', '#f43f5e', '#34d399', '#38bdf8'],
        });
      } catch {
        // Ignore if canvas unsupported
      }
    }
  }, [room.winner2Id]);

  // Synchronized Audio Playback: Play on all connected devices whenever active audio changes
  useEffect(() => {
    setIsPlaying(false);
    setProgress(0);
    setAutoAdvanceTimer(null);

    if (activePlayer?.audioUrl && audioRef.current) {
      audioRef.current.src = activePlayer.audioUrl;
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Auto play waiting for user interaction:', err);
          setIsPlaying(false);
        });
    }
  }, [room.activeAudioPlayerId, activePlayer?.audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    audioTheme.playClickSound();
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
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

    // Auto-advance to next confession after 2.5 seconds if host
    if (isHost) {
      setAutoAdvanceTimer(3);
      const interval = setInterval(() => {
        setAutoAdvanceTimer((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(interval);
            onNextConfession();
            return null;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);
    }
  };

  const handleReact = (emoji: string) => {
    audioTheme.playClickSound();
    setReactions((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] || 0) + 1,
    }));
  };

  // SCENARIO 2: Grand Finale (Winner 2 has been crowned)
  if (room.winner2Id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto font-serif">
        <div className="text-center mb-6">
          <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 flex items-center gap-1.5 justify-center mx-auto w-fit">
            <Flame className="h-3.5 w-3.5" /> Bonfire Grand Finale
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mt-2">
            The Winners of Rupiko
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto font-sans">
            All confessions were heard around the fire. Two campers emerged victorious!
          </p>
        </div>

        {/* Podium Cards */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Winner 1 */}
          <div className="bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-900 border border-amber-500/40 rounded-3xl p-6 text-center shadow-xl relative overflow-hidden">
            <div className="h-16 w-16 mx-auto rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-3 animate-bounce">
              <Crown className="h-8 w-8 fill-current" />
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-400 font-sans tracking-widest block mb-1">
              Winner 1 • Total Immunity
            </span>
            <h2 className="text-2xl font-black text-white">{winner1?.name || 'Winner 1'}</h2>
            <p className="text-xs text-amber-300/80 font-sans mt-1">
              Most unrecognizable voice in blind guessing. Confession was never exposed!
            </p>
          </div>

          {/* Winner 2 */}
          <div className="bg-gradient-to-b from-emerald-500/20 via-slate-900/90 to-slate-900 border border-emerald-500/40 rounded-3xl p-6 text-center shadow-xl relative overflow-hidden">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-3 animate-bounce">
              <Sparkles className="h-8 w-8 fill-current" />
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 font-sans tracking-widest block mb-1">
              Winner 2 • Chosen Survivor
            </span>
            <h2 className="text-2xl font-black text-white">{winner2?.name || 'Winner 2'}</h2>
            <p className="text-xs text-emerald-300/80 font-sans mt-1">
              Chosen by Winner 1 after all confessions were heard by the bonfire!
            </p>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-2xl p-5 mb-6 backdrop-blur-md">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-3 font-sans">
            Campfire Recognition Scoreboard
          </span>
          <div className="space-y-2 font-sans">
            {players.map((p) => {
              const isW1 = p.id === room.winner1Id;
              const isW2 = p.id === room.winner2Id;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                    isW1
                      ? 'bg-amber-500/15 border-amber-500/50 text-white font-bold'
                      : isW2
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-white font-bold'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{p.name}</span>
                    {p.id === currentPlayer?.id && <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded font-bold">YOU</span>}
                    {isW1 && <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.5 rounded font-black">WINNER 1</span>}
                    {isW2 && <span className="text-[9px] bg-emerald-400 text-black px-1.5 py-0.5 rounded font-black">WINNER 2</span>}
                  </div>
                  <span className="text-xs text-slate-400">
                    Recognized {p.recognitionScore || 0} times
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Play Again */}
        {isHost ? (
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full max-w-xs py-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-amber-950/40 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Play Again with this Bonfire</span>
          </button>
        ) : (
          <p className="text-xs text-slate-400 font-sans">Waiting for host to start a new round...</p>
        )}
      </div>
    );
  }

  // SCENARIO 1: Confession Listening Phase (Playing confessions synchronously to all players)
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto font-serif">
      {/* Stage Header */}
      <div className="text-center mb-6">
        <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 flex items-center gap-1.5 justify-center mx-auto w-fit">
          <Volume2 className="h-3.5 w-3.5" /> Stage 5: Synchronized Confession Listening
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Secrets Around The Bonfire
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto font-sans">
          Listen to all confessions together in real time. Once all have been heard, Winner 1 will choose Winner 2.
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
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 font-sans">
                <Crown className="h-3 w-3 text-amber-400" /> TOTAL IMMUNITY
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 mt-0.5 font-sans">
              Winner 1's confession remains permanently masked and protected from playback.
            </p>
          </div>
        </div>

        <div className="text-center sm:text-right border-t sm:border-t-0 sm:border-l border-emerald-500/20 pt-2 sm:pt-0 sm:pl-4 font-sans">
          <span className="text-[10px] uppercase font-bold text-amber-400 block">
            Listening Circle
          </span>
          <span className="text-xs font-semibold text-slate-200">Hearable to all campers</span>
        </div>
      </div>

      {/* Main Hot Seat Player Box */}
      <div className="w-full max-w-2xl">
        {activePlayer ? (
          /* Active Playing Box */
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden mb-6">
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
              <span className="text-xs font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 mb-3 flex items-center gap-1.5 animate-pulse font-sans">
                <Flame className="h-3.5 w-3.5 text-amber-400" /> Playing to all {players.length} campers
              </span>

              <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-xl shadow-rose-950/50 mb-3 ring-4 ring-rose-500/20">
                {activePlayer.name.charAt(0).toUpperCase()}
              </div>

              <h2 className="text-2xl font-black text-white">{activePlayer.name}'s Confession</h2>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                Listen closely... All campers are hearing this confession at the same time.
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
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 fill-current ml-0.5" />}
              </button>

              {isHost && (
                <button
                  type="button"
                  onClick={onNextConfession}
                  className="flex items-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all active:scale-95 shadow-md font-sans"
                  title="Next Confession in Queue"
                >
                  <span>Next Confession</span>
                  <SkipForward className="h-4 w-4" />
                </button>
              )}
            </div>

            {autoAdvanceTimer !== null && (
              <div className="text-center text-xs text-amber-400 font-sans mb-4 animate-pulse">
                Confession finished! Advancing to next confession in {autoAdvanceTimer}s...
              </div>
            )}

            {/* Fun Emoji Reactions Bar */}
            <div className="border-t border-slate-800/80 pt-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center mb-2.5 font-sans">
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
          /* All Confessions Completed Card -> Proceed to Winner 1 Selection */
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl mb-6">
            <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">All Confessions Have Been Heard!</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mb-6 font-sans">
              Everyone has listened to all the confessions around the fire. Now, Winner 1 ({winner1?.name}) will choose Winner 2!
            </p>

            <button
              type="button"
              onClick={onNextConfession}
              className="w-full max-w-xs py-4 mx-auto rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-amber-950/40 transition-all flex items-center justify-center gap-2 font-sans"
            >
              <span>Proceed to Winner 2 Selection</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Reveal Queue List */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-3 font-sans">
            Bonfire Confession Queue
          </span>

          <div className="space-y-2 font-sans">
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
                  </div>

                  <div>
                    {isCurrentPlaying ? (
                      <span className="flex items-center gap-1 font-bold text-rose-400 text-[11px]">
                        <Volume2 className="h-3.5 w-3.5 animate-bounce" /> Playing Aloud
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
