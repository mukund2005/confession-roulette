import React, { useState, useEffect, useMemo } from 'react';
import { Users, PhoneCall, Clock, Sparkles, MessageCircle, Mic } from 'lucide-react';
import type { Player, Room } from '../types/game';
import { useWebRTCBreakout } from '../hooks/useWebRTCBreakout';
import { AudioVisualizer } from './AudioVisualizer';

interface BreakoutStageProps {
  room: Room;
  players: Player[];
  currentPlayer: Player | null;
  isHost: boolean;
  onAdvanceRound: (nextRound: number) => Promise<void>;
  onFinishBreakouts: () => Promise<void>;
}

const SPEED_TALK_TOPICS = [
  "What's your most controversial food opinion?",
  "Tell a quick embarrassing childhood memory in 15 seconds!",
  "What is the most chaotic thing you did in high school?",
  "Pitch a terrible movie idea right now!",
  "What is something you pretend to understand but really don't?",
];

export const BreakoutStage: React.FC<BreakoutStageProps> = ({
  room,
  players,
  currentPlayer,
  isHost,
  onAdvanceRound,
  onFinishBreakouts,
}) => {
  const currentRoundIndex = room.currentBreakoutRound || 0;
  const schedule = room.breakoutSchedule || [];
  const totalRounds = schedule.length;
  const endTime = room.currentBreakoutEndTime || Date.now() + 30000;

  const [timeLeft, setTimeLeft] = useState(30);
  const [isIntermission, setIsIntermission] = useState(false);
  const [intermissionCountdown, setIntermissionCountdown] = useState(3);

  // Find partner for the current round
  const partnerId = useMemo(() => {
    if (!currentPlayer || !schedule[currentRoundIndex]) return null;
    const pairs = schedule[currentRoundIndex];
    const match = pairs.find(
      (pair) => pair.player1Id === currentPlayer.id || pair.player2Id === currentPlayer.id
    );
    if (!match) return null;
    return match.player1Id === currentPlayer.id ? match.player2Id : match.player1Id;
  }, [currentPlayer, schedule, currentRoundIndex]);

  const partner = useMemo(() => {
    if (!partnerId) return null;
    return players.find((p) => p.id === partnerId) || null;
  }, [partnerId, players]);

  // WebRTC Audio Connection
  const { isConnected, localVolume, remoteVolume, callError } = useWebRTCBreakout({
    myId: currentPlayer?.id || null,
    partnerId: partnerId,
    isActive: !isIntermission && Boolean(partnerId),
  });

  // Countdown timer synchronizer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeLeft(diff);

      if (diff === 0 && !isIntermission) {
        setIsIntermission(true);
        setIntermissionCountdown(3);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [endTime, isIntermission]);

  // Intermission 3-second countdown and automatic advance (Host only)
  useEffect(() => {
    if (!isIntermission) return;

    const interval = setInterval(() => {
      setIntermissionCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isHost) {
            if (currentRoundIndex + 1 < totalRounds) {
              onAdvanceRound(currentRoundIndex + 1);
            } else {
              onFinishBreakouts();
            }
          }
          setIsIntermission(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isIntermission, isHost, currentRoundIndex, totalRounds, onAdvanceRound, onFinishBreakouts]);

  const currentTopic = SPEED_TALK_TOPICS[currentRoundIndex % SPEED_TALK_TOPICS.length];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
          Round 1: Real-Time Breakouts ("Speed Talk")
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Round {currentRoundIndex + 1} of {totalRounds}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          Listen closely to your partner's voice, pitch, and cadence. You'll need to recognize them later!
        </p>
      </div>

      <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Timer Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Clock className="h-4 w-4 text-amber-400" />
            <span>{isIntermission ? 'Intermission' : 'Speed Talk Timer'}</span>
          </div>
          <span
            className={`font-mono text-2xl font-black ${
              isIntermission
                ? 'text-rose-400 animate-pulse'
                : timeLeft <= 5
                ? 'text-rose-400 animate-pulse'
                : 'text-amber-400'
            }`}
          >
            {isIntermission ? `Next Round in ${intermissionCountdown}s` : `00:${timeLeft.toString().padStart(2, '0')}`}
          </span>
        </div>

        {/* Intermission Screen */}
        {isIntermission ? (
          <div className="py-12 text-center animate-fadeIn">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4 animate-bounce">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Switching Partners!</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {currentRoundIndex + 1 < totalRounds
                ? 'Rotating to your next 1-on-1 voice breakout...'
                : 'All breakout rounds complete! Preparing blind audio guessing...'}
            </p>
          </div>
        ) : partner ? (
          /* Active Call View */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80">
              {/* You */}
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl font-bold text-slate-200 mb-2 relative">
                  {currentPlayer?.name.charAt(0).toUpperCase()}
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[9px] text-white">
                    <Mic className="h-3 w-3" />
                  </span>
                </div>
                <span className="text-xs font-bold text-white">{currentPlayer?.name} (You)</span>
                <span className="text-[10px] text-slate-400">Microphone Active</span>
                <div className="mt-2">
                  <AudioVisualizer volume={localVolume} isActive={localVolume > 5} variant="recording" barCount={10} />
                </div>
              </div>

              {/* Call Status Badge */}
              <div className="flex flex-col items-center">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center mb-1 shadow-lg ${
                    isConnected
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  <PhoneCall className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-slate-300">
                  {isConnected ? 'Connected' : 'Connecting Peer...'}
                </span>
              </div>

              {/* Partner */}
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-xl font-bold text-white mb-2 shadow-lg shadow-cyan-950/50">
                  {partner.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white">{partner.name}</span>
                <span className="text-[10px] text-cyan-400 font-semibold">Talking to Partner</span>
                <div className="mt-2">
                  <AudioVisualizer volume={remoteVolume} isActive={remoteVolume > 5} variant="playing" barCount={10} />
                </div>
              </div>
            </div>

            {callError && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-center">
                {callError}
              </div>
            )}

            {/* Topic Prompt Card */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-center gap-1.5 mb-1">
                <Sparkles className="h-3 w-3" /> Quick Topic Starter
              </span>
              <p className="text-sm font-semibold text-slate-200 italic">
                "{currentTopic}"
              </p>
            </div>
          </div>
        ) : (
          /* BYE / Solo Break View (for odd player count) */
          <div className="py-12 text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-800 text-slate-300 flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Solo Intermission</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You have a bye for this round. Relax, take a sip of water, and get ready for the next breakout!
            </p>
          </div>
        )}

        {/* Host Advance Override */}
        {isHost && (
          <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={() => {
                if (currentRoundIndex + 1 < totalRounds) {
                  onAdvanceRound(currentRoundIndex + 1);
                } else {
                  onFinishBreakouts();
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
            >
              Skip to {currentRoundIndex + 1 < totalRounds ? 'Next Round' : 'Blind Guessing'} &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
