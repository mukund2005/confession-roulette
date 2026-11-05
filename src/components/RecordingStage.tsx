import React, { useState } from 'react';
import { Mic, Square, RotateCcw, Check, Lock, Play, Pause, Sparkles, AlertCircle, ArrowRight, Shuffle } from 'lucide-react';
import type { Player } from '../types/game';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioVisualizer } from './AudioVisualizer';
import { audioTheme } from '../utils/audioTheme';

interface RecordingStageProps {
  players: Player[];
  currentPlayer: Player | null;
  isHost: boolean;
  allRecorded: boolean;
  onSubmitAudio: (audioBlob: Blob) => Promise<void>;
  onProceedToMinigame: () => Promise<void>;
}

const PROMPT_SUGGESTIONS = [
  "What is the most ridiculous lie you've ever told that someone believed?",
  "What's a petty secret you haven't told anyone here?",
  "The most embarrassing thing that happened to you in public?",
  "A guilty pleasure song, show, or obsession you hide?",
  "Something you pretend to like just to avoid conflict?",
  "The weirdest reason you unmatched someone or stopped texting?",
  "A culinary crime you commit when nobody is watching?",
];

export const RecordingStage: React.FC<RecordingStageProps> = ({
  players,
  currentPlayer,
  isHost,
  allRecorded,
  onSubmitAudio,
  onProceedToMinigame,
}) => {
  const {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    error: recorderError,
    volume,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder(30);

  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(
    PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)]
  );

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const onProceedRef = React.useRef(onProceedToMinigame);
  onProceedRef.current = onProceedToMinigame;
  const autoBreakoutTriggered = React.useRef(false);

  // Automatically start Speed Talk Breakouts immediately when all players have sealed their confessions
  React.useEffect(() => {
    if (allRecorded && !autoBreakoutTriggered.current) {
      autoBreakoutTriggered.current = true;
      audioTheme.playClickSound();
      onProceedRef.current();
    }
  }, [allRecorded]);

  const handleShufflePrompt = () => {
    let nextPrompt = selectedPrompt;
    while (nextPrompt === selectedPrompt) {
      nextPrompt = PROMPT_SUGGESTIONS[Math.floor(Math.random() * PROMPT_SUGGESTIONS.length)];
    }
    setSelectedPrompt(nextPrompt);
  };

  const togglePreview = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlayingPreview(false);
  };

  const handleUploadAndLock = async () => {
    if (!audioBlob) return;
    setIsSubmitting(true);
    try {
      await onSubmitAudio(audioBlob);
    } finally {
      setIsSubmitting(false);
    }
  };

  const recordedCount = players.filter((p) => p.hasRecorded).length;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto">
      {/* Stage Header */}
      <div className="text-center mb-6">
        <span className="text-xs font-semibold tracking-wider text-rose-400 uppercase bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
          Stage 2: Voice Confession
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
          Speak Your Truth
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md mx-auto">
          Record 15–30 seconds. Your voice is encrypted until the duel decides who remains immune.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full max-w-4xl">
        {/* Left Column: Recording Box */}
        <div className="md:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col items-center shadow-xl backdrop-blur-md">
          {/* Confession Prompt Card */}
          <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 mb-6 text-center relative group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Confession Inspiration
              </span>
              <button
                type="button"
                onClick={handleShufflePrompt}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                title="Get another prompt"
              >
                <Shuffle className="h-3 w-3" /> Shuffle
              </button>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-200 italic">
              "{selectedPrompt}"
            </p>
          </div>

          {recorderError && (
            <div className="w-full mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{recorderError}</span>
            </div>
          )}

          {currentPlayer?.hasRecorded ? (
            /* Already recorded state */
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-20 w-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                <Lock className="h-9 w-9" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Confession Sealed & Encrypted</h2>
              <p className="text-xs text-slate-400 max-w-xs mb-6">
                Your audio has been uploaded. Pray you win the reflex duel to keep it safe.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <Check className="h-3.5 w-3.5" />
                <span>Ready for Round 1</span>
              </div>
            </div>
          ) : (
            /* Recording Interface */
            <div className="flex flex-col items-center w-full">
              {/* Visualizer */}
              <div className="mb-4 w-full flex justify-center">
                <AudioVisualizer
                  volume={volume}
                  isActive={isRecording || isPlayingPreview}
                  variant={isRecording ? 'recording' : isPlayingPreview ? 'playing' : 'idle'}
                />
              </div>

              {/* Timer */}
              <div className="text-center mb-6">
                <span className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-white">
                  00:{recordingTime.toString().padStart(2, '0')}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  {isRecording ? 'Recording (Max 30s)...' : audioBlob ? 'Recorded' : 'Up to 30 seconds'}
                </span>
              </div>

              {/* Action Buttons */}
              {!audioBlob ? (
                /* Start/Stop Recording button */
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`h-24 w-24 rounded-full flex flex-col items-center justify-center transition-all shadow-xl select-none ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/60 ring-8 ring-rose-500/20 animate-pulse'
                      : 'bg-gradient-to-tr from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-rose-950/50 hover:scale-105 active:scale-95'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <Square className="h-8 w-8 fill-current" />
                      <span className="text-[10px] font-bold uppercase mt-1">Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-8 w-8" />
                      <span className="text-[10px] font-bold uppercase mt-1">Record</span>
                    </>
                  )}
                </button>
              ) : (
                /* Preview and Submit Controls */
                <div className="flex flex-col items-center w-full gap-4">
                  {audioUrl && (
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={handleAudioEnded}
                      className="hidden"
                    />
                  )}

                  <div className="flex items-center gap-3 w-full justify-center">
                    <button
                      type="button"
                      onClick={togglePreview}
                      className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all"
                    >
                      {isPlayingPreview ? (
                        <>
                          <Pause className="h-4 w-4" />
                          <span>Pause Preview</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-current" />
                          <span>Listen Back</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={resetRecording}
                      className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-medium border border-slate-800 hover:border-rose-500/20 transition-all"
                      title="Discard and re-record"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Re-record</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleUploadAndLock}
                    disabled={isSubmitting}
                    className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        Encrypting & Uploading...
                      </span>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        <span>Lock In Confession</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Room Readiness Status */}
        <div className="md:col-span-5 flex flex-col justify-between bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">Player Status</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {recordedCount} / {players.length} Done
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-300"
                style={{
                  width: `${players.length ? (recordedCount / players.length) * 100 : 0}%`,
                }}
              />
            </div>

            {/* Players List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {players.map((p) => {
                const isMe = p.id === currentPlayer?.id;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-slate-200">
                        {p.name} {isMe && '(You)'}
                      </span>
                    </div>

                    {p.hasRecorded ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> Sealed
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-400/80 animate-pulse">
                        Recording...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Automatic Speed Talk Transition Status */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            {allRecorded ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center animate-pulse">
                <div className="text-sm font-bold text-amber-300 flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  <span>All {players.length} Confessions Sealed!</span>
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Starting Balloon Popping Frenzy now...
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-xs text-slate-400">
                  Waiting for all campers to finish recording ({recordedCount} / {players.length})...
                </p>
                {(isHost || (currentPlayer?.hasRecorded && recordedCount >= 2)) && (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        audioTheme.playClickSound();
                        onProceedToMinigame();
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all inline-flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95"
                    >
                      <span>Enter Balloon Frenzy Now ({recordedCount}/{players.length} Sealed)</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
