import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Check, HelpCircle, ArrowRight, Trophy } from 'lucide-react';
import type { Player, Room } from '../types/game';
import { AudioVisualizer } from './AudioVisualizer';
import { audioTheme } from '../utils/audioTheme';

interface GuessingStageProps {
  room: Room;
  players: Player[];
  currentPlayer: Player | null;
  isHost: boolean;
  onSubmitGuess: (targetPlayerId: string, guessedPlayerId: string, voiceLabel: string) => Promise<void>;
  onAdvanceVoice: (nextIndex: number) => Promise<void>;
  onFinishGuessing: () => Promise<void>;
}

export const GuessingStage: React.FC<GuessingStageProps> = ({
  room,
  players,
  currentPlayer,
  isHost,
  onSubmitGuess,
  onAdvanceVoice,
  onFinishGuessing,
}) => {
  const queue = room.anonymousAudioQueue || [];
  const currentIndex = room.currentGuessIndex || 0;
  const currentVoice = queue[currentIndex];
  const totalVoices = queue.length;

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [hasVotedForCurrent, setHasVotedForCurrent] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset local voting and audio state when voice changes
  useEffect(() => {
    setSelectedPlayerId(null);
    setHasVotedForCurrent(false);
    setIsPlaying(false);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [currentIndex]);

  const togglePlayAudio = () => {
    audioTheme.playClickSound();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Play simulated audio if needed
          if ('speechSynthesis' in window) {
            const synth = window.speechSynthesis;
            const utter = new SpeechSynthesisUtterance(
              "Here is an anonymous confession: I once pretended to be busy just to eat pizza in bed alone."
            );
            utter.onend = () => setIsPlaying(false);
            synth.speak(utter);
            setIsPlaying(true);
          }
        });
    }
  };

  const handleVote = async (guessedId: string) => {
    if (!currentVoice || hasVotedForCurrent || isSubmitting) return;
    audioTheme.playClickSound();
    setSelectedPlayerId(guessedId);
    setIsSubmitting(true);
    try {
      await onSubmitGuess(currentVoice.targetPlayerId, guessedId, currentVoice.label);
      setHasVotedForCurrent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentVoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <h2 className="text-xl font-bold text-white">Preparing Blind Audio Clips...</h2>
      </div>
    );
  }

  const isLastVoice = currentIndex + 1 >= totalVoices;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-xs font-semibold tracking-wider text-purple-400 uppercase bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
          Round 1: Blind Audio Guessing
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Who Is {currentVoice.label}?
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          Voice {currentIndex + 1} of {totalVoices}. Listen carefully and pick who recorded this
          confession. The player with the fewest guesses wins immunity!
        </p>
      </div>

      <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={currentVoice.audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />

        {/* Voice Audio Card */}
        <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center text-2xl font-black mb-3 shadow-lg shadow-purple-950/50">
            <HelpCircle className="h-8 w-8" />
          </div>

          <h2 className="text-xl font-black text-white">{currentVoice.label}</h2>
          <span className="text-xs text-purple-400 font-semibold mb-4">Mystery Confession Clip</span>

          <div className="mb-4">
            <AudioVisualizer isActive={isPlaying} variant={isPlaying ? 'playing' : 'idle'} barCount={14} />
          </div>

          <button
            onClick={togglePlayAudio}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-950/40 active:scale-95"
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Pause Voice</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current ml-0.5" />
                <span>Listen to {currentVoice.label}</span>
              </>
            )}
          </button>
        </div>

        {/* Voting Options */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase text-slate-300">
              Select The Speaker
            </span>
            <span className="text-[11px] text-slate-400">
              {hasVotedForCurrent ? 'Vote Submitted' : 'Self-voting disabled'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {players.map((p) => {
              const isSelf = p.id === currentPlayer?.id;
              const isSelected = selectedPlayerId === p.id;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => !isSelf && !hasVotedForCurrent && handleVote(p.id)}
                  disabled={isSelf || hasVotedForCurrent || isSubmitting}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                    isSelf
                      ? 'bg-slate-950/40 border-slate-800/40 text-slate-500 cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'bg-purple-500/20 border-purple-500/60 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'bg-slate-950/70 border-slate-800 hover:border-purple-500/30 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected
                          ? 'bg-purple-500 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold block">{p.name}</span>
                      {isSelf && <span className="text-[10px] text-slate-500">You (disabled)</span>}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-purple-500 text-white flex items-center justify-center">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Host Advance Buttons */}
        {isHost && (
          <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">
              Host Controls
            </span>

            {isLastVoice ? (
              <button
                onClick={onFinishGuessing}
                className="flex items-center gap-1.5 px-5 py-3 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg transition-all"
              >
                <Trophy className="h-4 w-4 fill-current" />
                <span>Calculate Scores & Crown Winner 1</span>
              </button>
            ) : (
              <button
                onClick={() => onAdvanceVoice(currentIndex + 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                <span>Next Voice ({currentIndex + 2}/{totalVoices})</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
