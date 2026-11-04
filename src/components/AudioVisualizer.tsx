import React from 'react';

interface AudioVisualizerProps {
  volume?: number; // 0 to 100
  isActive?: boolean;
  barCount?: number;
  variant?: 'recording' | 'playing' | 'idle';
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  volume = 0,
  isActive = false,
  barCount = 18,
  variant = 'idle',
}) => {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className="flex items-center justify-center gap-1.5 h-16 w-full max-w-xs px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-800 backdrop-blur-sm">
      {bars.map((barIndex) => {
        // Calculate variable heights based on volume and sinusoidal wave
        let heightPercent = 15;
        if (isActive) {
          if (variant === 'recording') {
            const spread = Math.sin((barIndex / barCount) * Math.PI);
            heightPercent = Math.max(15, Math.min(100, volume * spread * 1.4 + Math.random() * 15));
          } else if (variant === 'playing') {
            // Animated playback wave
            const offset = (Date.now() / 200 + barIndex * 0.4) % Math.PI;
            heightPercent = 25 + Math.sin(offset) * 55;
          }
        }

        return (
          <div
            key={barIndex}
            className={`w-1.5 rounded-full transition-all duration-100 ease-out ${
              variant === 'recording'
                ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                : variant === 'playing'
                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                : 'bg-slate-700'
            }`}
            style={{
              height: `${heightPercent}%`,
              minHeight: '4px',
            }}
          />
        );
      })}
    </div>
  );
};
