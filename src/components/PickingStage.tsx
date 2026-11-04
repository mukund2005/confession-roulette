import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Crown, Shield, UserCheck, Sparkles, ArrowRight, Hourglass } from 'lucide-react';
import type { Player, Room } from '../types/game';
import { audioTheme } from '../utils/audioTheme';

interface PickingStageProps {
  room: Room;
  players: Player[];
  currentPlayer: Player | null;
  winner1: Player | null;
  onPickSecondWinner: (selectedPlayerId: string) => Promise<void>;
}

export const PickingStage: React.FC<PickingStageProps> = ({
  room,
  players,
  currentPlayer,
  winner1,
  onPickSecondWinner,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWinner1 = currentPlayer?.id === room.winner1Id;

  // Fire celebratory confetti on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#fbbf24', '#34d399', '#38bdf8'],
      });
    } catch {
      // Ignore if canvas not supported
    }
  }, []);

  const eligibleCandidates = players.filter((p) => p.id !== room.winner1Id);

  const handleConfirmPick = async () => {
    if (!selectedId) return;
    audioTheme.playClickSound();
    setIsSubmitting(true);
    try {
      await onPickSecondWinner(selectedId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
          Stage 6: The Final Choice
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Winner 1 Chooses Winner 2
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          All confessions have been heard around the bonfire. Winner 1 now crowns the second survivor.
        </p>
      </div>

      {isWinner1 ? (
        /* Winner 1 View */
        <div className="w-full max-w-xl bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Glow backdrop */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 animate-bounce">
              <Crown className="h-10 w-10 fill-current" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5 mb-1">
              <Sparkles className="h-4 w-4" /> Winner 1: Immunity Champion!
            </span>
            <h2 className="text-2xl font-black text-white">Your Secret Remains Permanently Safe</h2>
            <div className="mt-2 flex flex-col items-center gap-1.5">
              <span className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Least Recognized Voice • Total Immunity
              </span>
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs text-emerald-400 font-semibold">
                <Shield className="h-4 w-4 shrink-0" />
                <span>Your confession was permanently protected and never revealed!</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-5 mb-6">
            <h3 className="text-sm font-bold text-slate-200 mb-1">Crown The Second Winner</h3>
            <p className="text-xs text-slate-400 mb-4">
              Now that you have heard all the confessions, choose which camper will share the victory podium with you.
            </p>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {eligibleCandidates.map((candidate) => {
                const isSelected = selectedId === candidate.id;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      audioTheme.playClickSound();
                      setSelectedId(candidate.id);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {candidate.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white">{candidate.name}</span>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400 text-slate-950'
                          : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <UserCheck className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleConfirmPick}
            disabled={!selectedId || isSubmitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-amber-950/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Crowning Winner 2...
              </span>
            ) : (
              <>
                <span>Crown Winner 2 & Reveal Grand Podium</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      ) : (
        /* Waiting Screen for other players */
        <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4">
            <Hourglass className="h-8 w-8 animate-spin" style={{ animationDuration: '3s' }} />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Winner 1 is Choosing
          </span>
          <h2 className="text-2xl font-black text-white mt-2 mb-2">
            {winner1?.name || 'Winner 1'} is making their choice...
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto mb-6">
            Everyone has heard all the confessions around the fire. Winner 1 is now hand-picking Winner 2 to join them on the victory podium!
          </p>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-left">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              What Happens Next:
            </span>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>Winner 1 remains permanently protected with total immunity.</li>
              <li>Winner 2 is chosen to share the victory crown!</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
