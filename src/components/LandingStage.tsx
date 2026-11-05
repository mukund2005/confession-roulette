import React, { useState } from 'react';
import { AlertCircle, HelpCircle, Flame, Users, Sparkles, Plus, Compass } from 'lucide-react';
import { audioTheme } from '../utils/audioTheme';
import { CAMPER_AVATARS, getCamperAvatar } from '../utils/avatars';
import { gameService } from '../services/gameService';
import { HowToPlayModal } from './HowToPlayModal';
import { LobbyBrowserModal } from './LobbyBrowserModal';

interface LandingStageProps {
  onQuickMatch: (playerName: string, avatarIndex?: number) => Promise<void>;
  onCreateRoom: (hostName: string, avatarIndex?: number) => Promise<void>;
  onJoinRoom: (roomCode: string, playerName: string, avatarIndex?: number) => Promise<void>;
  avatarIndex: number;
  setAvatarIndex: (index: number) => void;
  isLoading: boolean;
  error: string | null;
}

export const LandingStage: React.FC<LandingStageProps> = ({
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
  avatarIndex,
  setAvatarIndex,
  isLoading,
  error,
}) => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [activeModal, setActiveModal] = useState<'none' | 'host' | 'join' | 'browse' | 'howToPlay'>('none');
  const [isLocating, setIsLocating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-clean inactive rooms & detect join query param from URL
  React.useEffect(() => {
    gameService.cleanInactiveRooms().catch(() => {});

    try {
      const params = new URLSearchParams(window.location.search);
      const joinParam = params.get('join');
      if (joinParam) {
        setRoomCode(joinParam.toUpperCase());
        setActiveModal('join');
      }
    } catch {
      // ignore
    }
  }, []);

  const selectedAvatar = getCamperAvatar(avatarIndex);

  const getEffectiveName = () => {
    return name.trim() || `${selectedAvatar.name}_${Math.floor(Math.random() * 899 + 100)}`;
  };

  const handleQuickPlay = async () => {
    audioTheme.playClickSound();
    audioTheme.startBonfireAmbience();
    setFormError(null);
    const effectiveName = getEffectiveName();
    setIsLocating(true);
    try {
      await onQuickMatch(effectiveName, avatarIndex);
    } catch (err: any) {
      setIsLocating(false);
      setFormError(err.message || 'Could not locate bonfire. Try hosting one!');
    }
  };

  const handleHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    audioTheme.playClickSound();
    audioTheme.startBonfireAmbience();
    setFormError(null);
    const effectiveName = name.trim() || `${selectedAvatar.name}_Host`;
    try {
      await onCreateRoom(effectiveName, avatarIndex);
      setActiveModal('none');
    } catch (err: any) {
      setFormError(err.message || 'Failed to host bonfire.');
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    audioTheme.playClickSound();
    audioTheme.startBonfireAmbience();
    setFormError(null);
    const effectiveName = name.trim() || `${selectedAvatar.name}_Camper`;
    const trimmedCode = roomCode.trim().toUpperCase();
    if (!trimmedCode) {
      setFormError('Please enter the 4-letter bonfire code.');
      return;
    }
    try {
      await onJoinRoom(trimmedCode, effectiveName, avatarIndex);
      setActiveModal('none');
    } catch (err: any) {
      setFormError(err.message || 'Failed to join bonfire.');
    }
  };

  const handleBrowserJoin = async (targetCode: string) => {
    const effectiveName = getEffectiveName();
    await onJoinRoom(targetCode, effectiveName, avatarIndex);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center bg-black text-white px-4 py-8 overflow-hidden select-none font-serif">
      {/* Starry Night Sky Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Full Moon */}
        <div className="absolute top-10 right-12 sm:right-24 h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-[#e2e8f0] shadow-[0_0_40px_rgba(255,255,255,0.4)]" />

        {/* Twinkling Stars */}
        <span className="absolute top-12 left-16 text-white text-base animate-pulse">★</span>
        <span className="absolute top-28 left-36 text-white text-xs opacity-75 animate-pulse" style={{ animationDelay: '1s' }}>★</span>
        <span className="absolute top-44 left-20 text-white text-sm opacity-90 animate-pulse" style={{ animationDelay: '1.5s' }}>★</span>
        <span className="absolute top-24 left-[38%] text-white text-xs opacity-80 animate-pulse" style={{ animationDelay: '2s' }}>★</span>
        <span className="absolute top-16 left-[58%] text-white text-sm opacity-90 animate-pulse" style={{ animationDelay: '0.8s' }}>★</span>
        <span className="absolute top-36 left-[68%] text-white text-base opacity-85 animate-pulse" style={{ animationDelay: '1.2s' }}>★</span>
        <span className="absolute top-64 left-24 text-white text-sm opacity-80 animate-pulse" style={{ animationDelay: '0.5s' }}>★</span>
        <span className="absolute top-72 right-40 text-white text-xs opacity-70 animate-pulse" style={{ animationDelay: '1.7s' }}>★</span>
        <span className="absolute top-48 right-16 text-white text-base opacity-90 animate-pulse" style={{ animationDelay: '2.3s' }}>★</span>
        <span className="absolute top-84 right-28 text-white text-sm opacity-75 animate-pulse" style={{ animationDelay: '0.9s' }}>★</span>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-xl w-full">
        {/* Title: Rupiko */}
        <h1 className="text-5xl sm:text-7xl font-serif tracking-normal text-white mb-4 drop-shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
          Rupiko
        </h1>

        {/* Campfire Illustration */}
        <div className="mb-4 relative group">
          <div className="absolute -inset-4 rounded-full bg-amber-500/20 blur-2xl pointer-events-none animate-pulse" />
          <img
            src="/campfire.png"
            alt="Campfire Bonfire"
            className="w-36 h-36 sm:w-44 sm:h-44 object-contain drop-shadow-[0_10px_35px_rgba(249,115,22,0.55)] transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Tagline */}
        <p className="text-xs sm:text-sm text-white/90 font-serif tracking-wide mb-5 max-w-md">
          A cozy, anonymous bonfire for secrets, voice confessions, and high stakes.
        </p>

        {/* Camper Avatar Selector */}
        <div className="w-full max-w-sm mb-4">
          <span className="text-[11px] font-sans uppercase tracking-widest text-amber-400 font-bold block mb-2">
            Choose Your Camper
          </span>
          <div className="flex items-center justify-center gap-2 p-2 rounded-2xl bg-[#121214] border border-white/15 shadow-inner">
            {CAMPER_AVATARS.map((av) => {
              const isSelected = av.id === avatarIndex;
              return (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    audioTheme.playClickSound();
                    setAvatarIndex(av.id);
                  }}
                  className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center text-lg sm:text-xl transition-all ${
                    isSelected
                      ? `${av.bgColor} border-2 border-amber-400 scale-110 shadow-[0_0_12px_rgba(251,191,36,0.5)]`
                      : 'bg-black/50 border border-white/10 hover:border-white/30 hover:scale-105'
                  }`}
                  title={av.name}
                >
                  {av.emoji}
                </button>
              );
            })}
          </div>
        </div>

        {/* Display Name Input */}
        <div className="w-full max-w-xs mb-5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Name (default: ${selectedAvatar.name})`}
            maxLength={18}
            className="w-full px-4 py-2.5 bg-black/70 border border-white/20 rounded-xl text-white placeholder-white/40 text-center font-serif text-sm focus:outline-none focus:border-amber-400/80 transition-all shadow-inner"
          />
        </div>

        {(formError || error) && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 max-w-sm font-sans animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{formError || error}</span>
          </div>
        )}

        {/* State: Locating Bonfire (Matchmaking Screen) */}
        {isLocating || isLoading ? (
          <div className="flex flex-col items-center py-6 animate-pulse">
            <div className="h-10 w-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
            <h2 className="text-xl sm:text-2xl font-serif uppercase tracking-widest text-white mb-2">
              CONNECTING TO BONFIRE...
            </h2>
            <p className="text-xs text-white/60 tracking-wider font-sans">
              Locating an open circle of campers from the internet (max 6)
            </p>
          </div>
        ) : (
          /* Matchmaking & Lobby Controls */
          <div className="w-full max-w-md flex flex-col items-center gap-3.5">
            {/* Primary Action: Quick Play (FIFO Auto-Matchmaking) */}
            <button
              type="button"
              onClick={handleQuickPlay}
              className="w-full max-w-xs py-3.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-white hover:to-amber-300 text-black font-serif text-sm font-bold tracking-widest uppercase rounded-2xl shadow-[0_4px_25px_rgba(251,191,36,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Flame className="h-4 w-4 fill-current" />
              <span>Quick Play (Join Bonfire)</span>
            </button>

            {/* Sub-Actions: Host Room / Browse Lobbies / Join with Code */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-sm font-sans">
              <button
                type="button"
                onClick={() => {
                  audioTheme.playClickSound();
                  setActiveModal('host');
                }}
                className="py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-serif text-xs font-semibold tracking-wider uppercase rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5 text-amber-400" />
                <span>Host Room</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioTheme.playClickSound();
                  setActiveModal('browse');
                }}
                className="py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-serif text-xs font-semibold tracking-wider uppercase rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Compass className="h-3.5 w-3.5 text-amber-400" />
                <span>Browse</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioTheme.playClickSound();
                  setActiveModal('join');
                }}
                className="col-span-2 sm:col-span-1 py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-serif text-xs font-semibold tracking-wider uppercase rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Users className="h-3.5 w-3.5 text-amber-400" />
                <span>Enter Code</span>
              </button>
            </div>

            {/* How to Play Guide Button */}
            <button
              type="button"
              onClick={() => {
                audioTheme.playClickSound();
                setActiveModal('howToPlay');
              }}
              className="mt-2 text-xs text-amber-300/80 hover:text-amber-200 font-serif tracking-wider uppercase flex items-center gap-1.5 transition-all px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 active:scale-95 shadow-sm"
            >
              <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
              <span>How To Play & Game Rules</span>
            </button>
          </div>
        )}
      </div>

      {/* Host Room Modal */}
      {activeModal === 'host' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <Sparkles className="h-6 w-6 fill-current" />
            </div>
            <h3 className="text-xl font-serif text-white font-bold mb-1">Host A New Bonfire</h3>
            <p className="text-xs text-white/60 mb-5 font-sans">
              Creates a public 6-player room where you have exclusive authority to light the fire.
            </p>
            <form onSubmit={handleHostSubmit} className="space-y-4 font-sans">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Host Name (e.g. ${selectedAvatar.name})`}
                maxLength={18}
                className="w-full px-4 py-2.5 bg-black border border-white/30 rounded-xl text-white text-center font-serif text-sm focus:outline-none focus:border-amber-400"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#fbbf24] hover:bg-white text-black font-serif text-xs uppercase tracking-wider rounded-xl font-bold shadow-md transition-all active:scale-95"
                >
                  Create & Host
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-serif text-xs uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join with Code Modal */}
      {activeModal === 'join' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-serif text-white font-bold mb-1">Join with Room Code</h3>
            <p className="text-xs text-white/60 mb-5 font-sans">
              Enter the 4-letter campfire code to take a seat in your friend's circle.
            </p>
            <form onSubmit={handleJoinSubmit} className="space-y-3 font-sans">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Camper Name (e.g. ${selectedAvatar.name})`}
                maxLength={18}
                className="w-full px-4 py-2.5 bg-black border border-white/30 rounded-xl text-white text-center font-serif text-sm focus:outline-none focus:border-amber-400"
              />
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="4-LETTER CODE"
                maxLength={6}
                className="w-full px-4 py-2.5 bg-black border border-white/30 rounded-xl text-white text-center font-mono font-black tracking-widest text-lg focus:outline-none focus:border-amber-400 text-amber-300"
                required
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#e2e8f0] hover:bg-white text-black font-serif text-xs uppercase tracking-wider rounded-xl font-bold shadow-md transition-all active:scale-95"
                >
                  Enter Bonfire
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-serif text-xs uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Public Lobby Browser Modal (Among Us Style) */}
      <LobbyBrowserModal
        isOpen={activeModal === 'browse'}
        onClose={() => setActiveModal('none')}
        onJoinRoom={handleBrowserJoin}
        onHostNewRoom={() => setActiveModal('host')}
      />

      {/* How to Play Modal */}
      <HowToPlayModal
        isOpen={activeModal === 'howToPlay'}
        onClose={() => setActiveModal('none')}
      />
    </div>
  );
};
