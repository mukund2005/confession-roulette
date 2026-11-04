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
