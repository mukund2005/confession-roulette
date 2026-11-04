import React, { useState, useEffect, useRef } from 'react';
import { Zap, AlertTriangle, Trophy, CheckCircle, Clock } from 'lucide-react';
import type { Player, Room } from '../types/game';

interface MinigameStageProps {
  room: Room;
  players: Player[];
  currentPlayer: Player | null;
  isHost: boolean;
  onStartMinigame: () => Promise<void>;
  onSubmitReaction: (reactionTimeMs: number) => Promise<void>;
}

type ReflexState = 'IDLE' | 'WAITING' | 'TRIGGERED' | 'EARLY' | 'COMPLETED';

export const MinigameStage: React.FC<MinigameStageProps> = ({
  room,
  players,
  currentPlayer,
  isHost,
  onStartMinigame,
  onSubmitReaction,
}) => {
  const [reflexState, setReflexState] = useState<ReflexState>('IDLE');
  const [reactionMs, setReactionMs] = useState<number | null>(null);

  const targetTime = room.minigameTargetTime;
  const triggerTimeoutRef = useRef<number | null>(null);

  // If player already submitted their reaction time
  useEffect(() => {
    if (currentPlayer?.reactionTimeMs !== null && currentPlayer?.reactionTimeMs !== undefined) {
      setReactionMs(currentPlayer.reactionTimeMs);
      setReflexState('COMPLETED');
    }
  }, [currentPlayer?.reactionTimeMs]);

  // Synchronized target time watcher
  useEffect(() => {
    if (!targetTime) {
      setReflexState('IDLE');
      return;
    }

    if (currentPlayer?.reactionTimeMs !== null && currentPlayer?.reactionTimeMs !== undefined) {
      return;
    }

    const now = Date.now();
    const remaining = targetTime - now;

    if (remaining > 0) {
      setReflexState('WAITING');

      triggerTimeoutRef.current = window.setTimeout(() => {
        setReflexState('TRIGGERED');
      }, remaining);
    } else {
      // Already passed target time
      setReflexState('TRIGGERED');
    }

    return () => {
      if (triggerTimeoutRef.current) clearTimeout(triggerTimeoutRef.current);
    };
  }, [targetTime, currentPlayer?.reactionTimeMs]);

  const handleTap = () => {
    if (reflexState === 'WAITING') {
      // Early tap penalty!
      setReflexState('EARLY');
      const penaltyTime = 9999; // Disqualified / slowest
      onSubmitReaction(penaltyTime);
    } else if (reflexState === 'TRIGGERED' && targetTime) {
      const recorded = Date.now() - targetTime;
      const finalTime = Math.max(10, recorded);
      setReactionMs(finalTime);
      setReflexState('COMPLETED');
      onSubmitReaction(finalTime);
    }
  };

  // Sorted leaderboard of reactions
  const leaderboard = [...players].sort((a, b) => {
    if (a.reactionTimeMs === null && b.reactionTimeMs === null) return 0;
    if (a.reactionTimeMs === null) return 1;
    if (b.reactionTimeMs === null) return -1;
    return a.reactionTimeMs - b.reactionTimeMs;
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-xs font-semibold tracking-wider text-amber-400 uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          Stage 3: Reflex Duel
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Fastest Finger Wins Immunity
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          When the screen turns GREEN, tap instantly. Winner 1's confession is permanently protected!
        </p>
      </div>

      <div className="w-full max-w-2xl">
        {!targetTime ? (
          /* Host waiting to launch */
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center shadow-xl backdrop-blur-md">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 animate-bounce" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Round 1 Reflex Minigame</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6">
              All players must keep their eyes on the screen. The trigger appears with an
              unpredictable 2–6 second delay.
            </p>

            {isHost ? (
              <button
                type="button"
                onClick={onStartMinigame}
                className="w-full max-w-xs py-4 mx-auto rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Zap className="h-5 w-5 fill-current" />
                <span>Start Reflex Duel</span>
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 py-2.5 px-4 rounded-xl border border-amber-500/20 max-w-xs mx-auto">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span>Host is about to trigger the duel...</span>
              </div>
            )}
          </div>
        ) : (
          /* The Reflex Arena */
          <div className="space-y-6">
            <div
              onClick={handleTap}
              className={`w-full h-80 rounded-3xl border-2 flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer transition-all duration-75 relative overflow-hidden shadow-2xl ${
                reflexState === 'WAITING'
                  ? 'bg-rose-950/90 border-rose-600/80 hover:bg-rose-900/90 active:scale-[0.99]'
                  : reflexState === 'TRIGGERED'
                  ? 'bg-emerald-500 border-emerald-300 text-slate-950 scale-102 ring-8 ring-emerald-400/40 animate-pulse'
                  : reflexState === 'EARLY'
                  ? 'bg-red-950 border-red-700 text-red-300'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              {reflexState === 'WAITING' && (
                <div className="animate-pulse">
                  <div className="h-16 w-16 mx-auto rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mb-3 border border-rose-500/40">
                    <Clock className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wider">
                    WAIT FOR IT...
                  </h2>
                  <p className="text-xs text-rose-300 mt-2 font-medium">
                    Do NOT tap yet! Tapping early is an automatic penalty!
                  </p>
                </div>
              )}

              {reflexState === 'TRIGGERED' && (
                <div>
                  <h2 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tighter uppercase animate-bounce">
                    ⚡ TAP NOW! ⚡
                  </h2>
                  <span className="text-sm font-bold text-slate-900 mt-2 block tracking-wider uppercase">
                    CLICK ANYWHERE FAST!
                  </span>
                </div>
              )}

              {reflexState === 'EARLY' && (
                <div>
                  <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-2" />
                  <h2 className="text-2xl font-bold text-white">FALSE START!</h2>
                  <p className="text-xs text-rose-300 mt-1">
                    You jumped the gun. 9999ms penalty applied.
                  </p>
                </div>
              )}

              {reflexState === 'COMPLETED' && (
                <div>
                  <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 border border-emerald-500/30">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Your Reaction Time
                  </span>
                  <div className="text-4xl sm:text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-amber-300 my-1">
                    {reactionMs === 9999 ? 'PENALTY' : `${reactionMs} ms`}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Waiting for remaining players to finish...
                  </p>
                </div>
              )}
            </div>

            {/* Live Leaderboard */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-400" /> Live Reflex Standings
                </span>
                <span className="text-xs text-slate-400">Fastest secures Immunity</span>
              </div>

              <div className="space-y-2">
                {leaderboard.map((p, index) => {
                  const isCurrent = p.id === currentPlayer?.id;
                  const isLeader = index === 0 && p.reactionTimeMs !== null;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                        isLeader
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold'
                          : isCurrent
                          ? 'bg-rose-500/10 border-rose-500/30 text-white'
                          : 'bg-slate-950/60 border-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-center font-bold text-slate-400 font-mono">
                          #{index + 1}
                        </span>
                        <span>
                          {p.name} {isCurrent && '(You)'}
                        </span>
                        {isLeader && (
                          <span className="px-1.5 py-0.2 bg-amber-400/20 text-amber-300 text-[10px] rounded font-bold">
                            WINNER 1
                          </span>
                        )}
                      </div>

                      <div className="font-mono font-bold">
                        {p.reactionTimeMs === null ? (
                          <span className="text-slate-500 italic">Waiting...</span>
                        ) : p.reactionTimeMs === 9999 ? (
                          <span className="text-rose-400">False Start</span>
                        ) : (
                          <span className="text-emerald-400">{p.reactionTimeMs} ms</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
