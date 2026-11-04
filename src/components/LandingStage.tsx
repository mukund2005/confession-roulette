import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface LandingStageProps {
  onQuickMatch: (playerName: string) => Promise<void>;
  onCreateRoom: (hostName: string) => Promise<void>;
  onJoinRoom: (roomCode: string, playerName: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const LandingStage: React.FC<LandingStageProps> = ({
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
  isLoading,
  error,
}) => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [activeModal, setActiveModal] = useState<'none' | 'host' | 'join'>('none');
  const [isLocating, setIsLocating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-detect join query param from URL
  React.useEffect(() => {
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

  const handlePlayClick = async () => {
    setFormError(null);
    const trimmed = name.trim() || `Camper_${Math.floor(Math.random() * 899 + 100)}`;
    setIsLocating(true);
    try {
      await onQuickMatch(trimmed);
    } catch (err: any) {
      setIsLocating(false);
      setFormError(err.message || 'Could not locate bonfire. Try hosting one!');
    }
  };

  const handleHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Please enter your name.');
      return;
    }
    try {
      await onCreateRoom(trimmed);
    } catch (err: any) {
      setFormError(err.message || 'Failed to host bonfire.');
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedName = name.trim();
    const trimmedCode = roomCode.trim().toUpperCase();
    if (!trimmedName) {
      setFormError('Please enter your name.');
      return;
    }
    if (!trimmedCode) {
      setFormError('Please enter the bonfire code.');
      return;
    }
    try {
      await onJoinRoom(trimmedCode, trimmedName);
    } catch (err: any) {
      setFormError(err.message || 'Failed to join bonfire.');
    }
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
        <h1 className="text-5xl sm:text-7xl font-serif tracking-normal text-white mb-6">
          Rupiko
        </h1>

        {/* Campfire Illustration */}
        <div className="mb-6 relative group">
          <img
            src="/campfire.png"
            alt="Campfire Bonfire"
            className="w-44 h-44 sm:w-52 sm:h-52 object-contain drop-shadow-[0_10px_35px_rgba(249,115,22,0.45)] transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Tagline */}
        <p className="text-sm sm:text-base text-white/90 font-serif tracking-wide mb-8 max-w-md">
          Amazing space on the internet for amazing confessions.
        </p>

        {/* Display Name Input */}
        <div className="w-full max-w-xs mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name (e.g. Alex)"
            maxLength={20}
            className="w-full px-4 py-2.5 bg-black/60 border border-white/20 rounded-lg text-white placeholder-white/40 text-center font-serif text-sm focus:outline-none focus:border-white transition-colors"
          />
        </div>

        {(formError || error) && (
          <div className="mb-6 p-3 rounded bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 max-w-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{formError || error}</span>
          </div>
        )}

        {/* State: Locating Bonfire (Matchmaking Screen) */}
        {isLocating || isLoading ? (
          <div className="flex flex-col items-center py-6 animate-pulse">
            <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-widest text-white mb-3">
              LOCATING THE BONFIRE...
            </h2>
            <p className="text-xs text-white/60 tracking-wider">
              Gathering 6 campers from the internet to sit around the fire
            </p>
          </div>
        ) : (
          /* Buttons: PLAY / HOST BONFIRE / JOIN BONFIRE */
          <div className="w-full max-w-md flex flex-col items-center gap-6">
            {/* Main PLAY Button */}
            <button
              onClick={handlePlayClick}
              className="w-36 py-3 bg-[#e2e8f0] hover:bg-white text-black font-serif text-sm tracking-widest uppercase rounded shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all"
            >
              PLAY
            </button>

            {/* Sub-buttons: HOST BONFIRE / JOIN BONFIRE */}
            <div className="flex items-center gap-4 sm:gap-8 w-full justify-center">
              <button
                onClick={() => setActiveModal('host')}
                className="px-6 py-2.5 bg-[#d1d5db] hover:bg-[#e2e8f0] text-black font-serif text-xs tracking-wider uppercase rounded shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                HOST BONFIRE
              </button>
              <button
                onClick={() => setActiveModal('join')}
                className="px-6 py-2.5 bg-[#d1d5db] hover:bg-[#e2e8f0] text-black font-serif text-xs tracking-wider uppercase rounded shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                JOIN BONFIRE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Host Modal */}
      {activeModal === 'host' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/20 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center">
            <h3 className="text-xl font-serif text-white mb-2">Host A Private Bonfire</h3>
            <p className="text-xs text-white/60 mb-6">
              Create a campfire room to invite your friends with a code.
            </p>
            <form onSubmit={handleHostSubmit} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Display Name"
                className="w-full px-4 py-2.5 bg-black border border-white/30 rounded text-white text-center font-serif text-sm focus:outline-none focus:border-white"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#e2e8f0] hover:bg-white text-black font-serif text-xs uppercase tracking-wider rounded font-bold"
                >
                  Create Bonfire
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-serif text-xs uppercase rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {activeModal === 'join' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/20 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center">
            <h3 className="text-xl font-serif text-white mb-2">Join A Bonfire</h3>
            <p className="text-xs text-white/60 mb-6">
              Enter the 4-letter campfire code to take a seat around the fire.
            </p>
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Display Name"
                className="w-full px-4 py-2.5 bg-black border border-white/30 rounded text-white text-center font-serif text-sm focus:outline-none focus:border-white"
                required
              />
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="4-LETTER CODE"
                maxLength={6}
                className="w-full px-4 py-2.5 bg-black border border-white/30 rounded text-white text-center font-mono font-bold tracking-widest text-base focus:outline-none focus:border-white"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#e2e8f0] hover:bg-white text-black font-serif text-xs uppercase tracking-wider rounded font-bold"
                >
                  Enter Bonfire
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-serif text-xs uppercase rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
