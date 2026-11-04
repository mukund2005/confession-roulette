import React, { useState } from 'react';
import { Mic, Zap, Shield, Volume2, ArrowRight, Sparkles, Database, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface LandingStageProps {
  onCreateRoom: (hostName: string) => Promise<void>;
  onJoinRoom: (roomCode: string, playerName: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  onOpenCloudSettings?: () => void;
}

export const LandingStage: React.FC<LandingStageProps> = ({
  onCreateRoom,
  onJoinRoom,
  isLoading,
  error,
  onOpenCloudSettings,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Please enter your display name.');
      return;
    }

    if (mode === 'create') {
      try {
        await onCreateRoom(trimmedName);
      } catch (err: any) {
        setFormError(err.message || 'Failed to create room.');
      }
    } else {
      const trimmedCode = roomCode.trim().toUpperCase();
      if (!trimmedCode || trimmedCode.length < 3) {
        setFormError('Please enter a valid room code.');
        return;
      }
      try {
        await onJoinRoom(trimmedCode, trimmedName);
      } catch (err: any) {
        setFormError(err.message || 'Failed to join room.');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 max-w-4xl mx-auto">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-4 animate-pulse-subtle">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        Synchronized Voice Party Game
      </div>

      {/* Cloud Status Notice */}
      {!isSupabaseConfigured && (
        <div
          onClick={onOpenCloudSettings}
          className="cursor-pointer mb-6 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs max-w-md flex items-center justify-between gap-3 hover:bg-amber-500/15 transition-all shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Local Mode:</strong> To play on <strong>separate phones/devices</strong>, tap
              to connect your Supabase database.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 shrink-0">
            Setup
          </span>
        </div>
      )}

      {/* Main Title */}
      <h1 className="text-4xl sm:text-6xl font-black text-center tracking-tight mb-4 text-white">
        SAFE &{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-400 to-amber-400">
          SOUND
        </span>
      </h1>
      <p className="text-slate-400 text-center max-w-lg mb-8 text-sm sm:text-base">
        Record your deepest confession. Win the reflex mini-game to gain immunity. Fail, and your
        voice will echo through the entire room.
      </p>

      {/* Card Form */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accents */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Tab switch */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              mode === 'create'
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Room
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              mode === 'join'
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Join Room
          </button>
        </div>

        {(formError || error) && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{formError || error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Your Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Confessor X"
              maxLength={20}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-sm"
              required
            />
          </div>

          {mode === 'join' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="4-LETTER CODE"
                maxLength={6}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all uppercase tracking-widest font-mono font-bold text-center text-base"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-rose-900/40 hover:shadow-rose-900/60 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Connecting...
              </span>
            ) : (
              <>
                <span>{mode === 'create' ? 'Host Game Room' : 'Enter Game Room'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Rules Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-12 w-full max-w-3xl">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 text-center flex flex-col items-center">
          <div className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-2">
            <Mic className="h-4 w-4" />
          </div>
          <h2 className="text-xs font-bold text-white mb-1">1. Confess</h2>
          <p className="text-[11px] text-slate-400">Record a 15–30s secret on your mic.</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 text-center flex flex-col items-center">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
            <Zap className="h-4 w-4" />
          </div>
          <h2 className="text-xs font-bold text-white mb-1">2. Reflex Duel</h2>
          <p className="text-[11px] text-slate-400">Fastest reaction tap wins Winner 1.</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 text-center flex flex-col items-center">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
            <Shield className="h-4 w-4" />
          </div>
          <h2 className="text-xs font-bold text-white mb-1">3. Immunity</h2>
          <p className="text-[11px] text-slate-400">Winner 1 is safe; picks a 2nd Winner.</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3.5 text-center flex flex-col items-center">
          <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
            <Volume2 className="h-4 w-4" />
          </div>
          <h2 className="text-xs font-bold text-white mb-1">4. The Reveal</h2>
          <p className="text-[11px] text-slate-400">All unprotected voices are played live.</p>
        </div>
      </div>
    </div>
  );
};
