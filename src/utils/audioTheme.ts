// Audio Theme Engine: Web Audio API procedural sound synthesizer
// Provides zero-latency, zero-cost bonfire crackle ambience and tactile button clicks without external audio asset dependencies.

class AudioThemeEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambienceActive: boolean = false;
  private crackleInterval: number | null = null;
  private noiseNode: AudioNode | null = null;

  constructor() {
    // AudioContext will be initialized upon first user gesture
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Play crisp wooden tactile click on button press
  playClickSound() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      // Quick pitch drop for a warm wooden pop
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      // Ignore if audio context not permitted yet
    }
  }

  // Play warm chime when camper joins
  playJoinSound() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [440, 554.37, 659.25]; // A major triad
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 0.45);
      });
    } catch (e) {
      // Ignore
    }
  }

  // Procedural Bonfire Crackle & Ambience
  startBonfireAmbience() {
    if (this.ambienceActive || this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.ambienceActive = true;

    // 1. Low warm rumbling fire glow
    try {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        output[i] = (b0 + b1 + b2) * 0.04;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 350;

      const ambienceGain = ctx.createGain();
      ambienceGain.gain.setValueAtTime(0.08, ctx.currentTime);

      whiteNoise.connect(lowpass);
      lowpass.connect(ambienceGain);
      ambienceGain.connect(ctx.destination);

      whiteNoise.start();
      this.noiseNode = whiteNoise;

      // 2. Random micro-burst pops (crackling wood embers)
      this.crackleInterval = window.setInterval(() => {
        if (!this.ambienceActive || this.isMuted) return;
        if (Math.random() > 0.45) {
          this.triggerEmberPop();
        }
      }, 350);
    } catch (e) {
      console.warn('Could not start campfire ambience:', e);
    }
  }

  private triggerEmberPop() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const popOsc = ctx.createOscillator();
      const popGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = Math.random() * 1200 + 800;
      filter.Q.value = 8;

      popOsc.type = 'sine';
      popOsc.frequency.setValueAtTime(Math.random() * 600 + 300, ctx.currentTime);

      const popVol = Math.random() * 0.07 + 0.02;
      popGain.gain.setValueAtTime(popVol, ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);

      popOsc.connect(filter);
      filter.connect(popGain);
      popGain.connect(ctx.destination);

      popOsc.start();
      popOsc.stop(ctx.currentTime + 0.04);
    } catch {
      // ignore
    }
  }

  // Procedural Balloon Pop Synthesizer
  playBalloonPop(type: 'normal' | 'golden' | 'bomb' = 'normal') {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (type === 'bomb') {
        // Bomb explosion: low frequency boom and crunch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        return;
      }

      if (type === 'golden') {
        // Golden balloon pop: crisp pop + sparkling high chime
        const popOsc = ctx.createOscillator();
        const popGain = ctx.createGain();
        popOsc.type = 'sine';
        popOsc.frequency.setValueAtTime(520, now);
        popOsc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        popGain.gain.setValueAtTime(0.3, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        popOsc.connect(popGain);
        popGain.connect(ctx.destination);
        popOsc.start(now);
        popOsc.stop(now + 0.08);

        // Chimes
        [880, 1318.5, 1760].forEach((freq, i) => {
          const chimeOsc = ctx.createOscillator();
          const chimeGain = ctx.createGain();
          chimeOsc.type = 'triangle';
          chimeOsc.frequency.setValueAtTime(freq, now + i * 0.04);
          chimeGain.gain.setValueAtTime(0.15, now + i * 0.04);
          chimeGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.2);
          chimeOsc.connect(chimeGain);
          chimeGain.connect(ctx.destination);
          chimeOsc.start(now + i * 0.04);
          chimeOsc.stop(now + i * 0.04 + 0.22);
        });
        return;
      }

      // Normal balloon pop: tight rubber snap + quick low punch
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.07);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);

      // Noise pop transient
      const bufferSize = Math.floor(ctx.sampleRate * 0.025);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    } catch {
      // ignore
    }
  }

  // Countdown beep for synchronized minigame start
  playCountdownBeep(isGo: boolean = false) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isGo ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
      if (isGo) {
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
      }
      gain.gain.setValueAtTime(isGo ? 0.3 : 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.3 : 0.12));
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + (isGo ? 0.32 : 0.15));
    } catch {
      // ignore
    }
  }

  stopBonfireAmbience() {
    this.ambienceActive = false;
    if (this.crackleInterval) {
      clearInterval(this.crackleInterval);
      this.crackleInterval = null;
    }
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop();
      } catch {}
      this.noiseNode = null;
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBonfireAmbience();
    } else {
      this.startBonfireAmbience();
    }
    return this.isMuted;
  }

  getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const audioTheme = new AudioThemeEngine();
