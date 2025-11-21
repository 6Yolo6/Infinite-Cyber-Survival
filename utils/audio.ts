
// Simple Web Audio API Synthesizer
class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.5;

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.setVolume(0.5);
      }
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx?.currentTime || 0);
    }
    if (this.ctx && this.ctx.state === 'suspended' && val > 0) {
        this.ctx.resume();
    }
  }

  getVolume() {
    return this.volume;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 1) {
    if (!this.ctx || !this.masterGain || this.volume <= 0) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  playShoot(pitch: number = 1.0) {
    this.playTone(440 * pitch, 'square', 0.1, 0, 0.1);
    this.playTone(220 * pitch, 'sawtooth', 0.1, 0.02, 0.1);
  }

  playLaser() {
    this.playTone(880, 'sine', 0.1, 0, 0.1);
    this.playTone(1200, 'triangle', 0.15, 0, 0.05);
  }

  playRocket() {
    this.playTone(100, 'sawtooth', 0.3, 0, 0.2);
    // Noise would be better but requires buffer, simulating with low freq saw
    this.playTone(80, 'square', 0.4, 0.05, 0.2);
  }

  playHit() {
    this.playTone(200, 'square', 0.05, 0, 0.05);
  }

  playExplosion() {
    this.playTone(100, 'sawtooth', 0.3, 0, 0.3);
    this.playTone(60, 'square', 0.4, 0.05, 0.3);
    this.playTone(40, 'sawtooth', 0.5, 0.1, 0.3);
  }

  playPickupXP() {
    this.playTone(660, 'sine', 0.1, 0, 0.1);
    this.playTone(880, 'sine', 0.1, 0.05, 0.1);
  }

  playPickupHealth() {
    this.playTone(440, 'sine', 0.2, 0, 0.15);
    this.playTone(554, 'sine', 0.2, 0.1, 0.15); // C#
  }

  playLevelUp() {
    const now = 0;
    this.playTone(440, 'triangle', 0.3, now, 0.2);
    this.playTone(554, 'triangle', 0.3, now + 0.1, 0.2);
    this.playTone(659, 'triangle', 0.4, now + 0.2, 0.2);
    this.playTone(880, 'triangle', 0.6, now + 0.3, 0.2);
  }
}

export const audioParams = new AudioController();
