// Soft synthesized sounds (no audio files). Off until the visitor turns them on.
export class Sound {
  constructor() { this.on = false; this.ctx = null; }
  toggle() {
    this.on = !this.on;
    if (this.on && !this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = 0.55;
      this.out.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx) this.ctx[this.on ? 'resume' : 'suspend']();
    return this.on;
  }
  _noise(t, dur, type, f0, f1, q, gain) {
    const c = this.ctx, src = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise;
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(this.out);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  // a part sliding: airy whoosh and a soft wooden knock
  move() {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    this._noise(t, 0.5, 'bandpass', 500, 1600, 0.8, 0.12);
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(190, t + 0.38);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.5);
    g.gain.setValueAtTime(0.0001, t + 0.38);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.39);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.56);
    o.connect(g); g.connect(this.out); o.start(t + 0.37); o.stop(t + 0.6);
  }
  // a sheet of card turning over: a soft airy swish with a dry flutter, then a light tap as it lands
  paper(strength = 1) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, g = Math.min(1, Math.max(0.3, strength));
    this._noise(t, 0.42, 'bandpass', 900, 3200, 0.7, 0.09 * g);
    this._noise(t + 0.05, 0.3, 'highpass', 3500, 6000, 0.6, 0.035 * g);
    for (let i = 0; i < 5; i++) this._noise(t + 0.04 + i * 0.045 + Math.random() * 0.02, 0.025, 'bandpass', 1400 + Math.random() * 1600, 1800, 3, 0.05 * g);
    this._noise(t + 0.4, 0.08, 'lowpass', 900, 400, 0.7, 0.07 * g);
  }
  // paper tearing along a perforation: short dry rips, a burst per bit of progress
  tear(amount = 0.03) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime, g = Math.min(1, 0.4 + amount * 12);
    for (let i = 0; i < 3; i++) this._noise(t + i * 0.018 + Math.random() * 0.01, 0.035, 'bandpass', 2200 + Math.random() * 2200, 1400, 2.5, 0.07 * g);
    this._noise(t, 0.09, 'highpass', 3000, 5000, 0.7, 0.02 * g);
  }
  // a rubber stamp: a soft thud with a papery slap
  stamp() {
    if (!this.on || !this.ctx) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.2);
    this._noise(t, 0.08, 'bandpass', 1200, 700, 0.8, 0.06);
  }
  // one letter burning: a short crackle and hiss
  burn() {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.45, 'highpass', 2500, 5000, 0.5, 0.05);
    for (let i = 0; i < 4; i++) this._noise(t + Math.random() * 0.3, 0.03, 'bandpass', 1800 + Math.random() * 2500, 2000, 4, 0.12);
  }
}
