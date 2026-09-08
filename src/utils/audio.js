/**
 * Web Audio Synthesizer for Real-Time Basketball Events
 * Provides rich acoustic feedback for scoring plays (Swish, 3PT chime, Foul whistle)
 */

class CourtAudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  toggleAudio() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  play(type) {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      if (type === 'swish') {
        // Subtle crisp swoosh for made field goals
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'three') {
        // Vibrant double chime for 3-pointer
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'foul') {
        // Sharp whistle pulse
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.18);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch {
      // Audio context might be restricted before first click
    }
  }
}

export const courtAudio = new CourtAudioSystem();
