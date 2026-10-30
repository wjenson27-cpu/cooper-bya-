export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.music = null;
    this.sfx = null;
    this.muted = false;
    this.playing = false;
    this.scheduler = null;
    this.step = 0;
    this.nextNoteTime = 0;
  }

  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!this.ctx) {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.34;
        this.master.connect(this.ctx.destination);
        this.music = this.ctx.createGain();
        this.music.gain.value = 0.42;
        this.music.connect(this.master);
        this.sfx = this.ctx.createGain();
        this.sfx.gain.value = 0.95;
        this.sfx.connect(this.master);
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch (err) {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(muted ? 0 : 0.34, this.ctx.currentTime);
    }
  }

  tone(freq, dur, type, gain, when, dest) {
    if (!this.ctx || !dest) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(Math.max(0.0001, gain), when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.04, dur));
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + dur + 0.03);
  }

  noise(when, dur, gain, freq) {
    if (!this.ctx) return;
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq || 900;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfx);
    src.start(when);
  }

  bark() {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(480, 0.08, "sine", 0.34, t, this.sfx);
    this.tone(320, 0.11, "triangle", 0.28, t + 0.09, this.sfx);
    this.tone(220, 0.1, "sine", 0.16, t + 0.16, this.sfx);
    this.noise(t, 0.07, 0.12, 1400);
  }

  squeak() {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(1680, 0.06, "sine", 0.16, t, this.sfx);
    this.tone(2140, 0.07, "sine", 0.12, t + 0.05, this.sfx);
  }

  dig() {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(130, 0.12, "sine", 0.4, t, this.sfx);
    this.tone(78, 0.16, "triangle", 0.28, t, this.sfx);
    this.noise(t, 0.1, 0.22, 500);
  }

  found() {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [880, 1174.7, 1568].forEach((n, i) => {
      this.tone(n, 0.14, "sine", 0.16, t + i * 0.055, this.sfx);
    });
    this.tone(440, 0.08, "triangle", 0.18, t, this.sfx);
  }

  splash() {
    this.unlock();
    if (!this.ctx) return;
    this.noise(this.ctx.currentTime, 0.09, 0.08, 1800);
  }

  fanfare() {
    this.unlock();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => {
      this.tone(n, 0.28, "triangle", 0.18, t + i * 0.11, this.sfx);
      this.tone(n / 2, 0.3, "sine", 0.06, t + i * 0.11, this.sfx);
    });
  }

  startMusic() {
    this.unlock();
    if (!this.ctx || this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.06;
    this.scheduler = setInterval(() => this.schedule(), 90);
  }

  stopMusic() {
    this.playing = false;
    if (this.scheduler) clearInterval(this.scheduler);
    this.scheduler = null;
  }

  schedule() {
    if (!this.playing || !this.ctx) return;
    const melody = [
      523.25, 659.25, 783.99, 659.25,
      587.33, 698.46, 880, 783.99,
      523.25, 659.25, 880, 698.46,
      783.99, 659.25, 587.33, 523.25,
    ];
    const horizon = this.ctx.currentTime + 0.28;
    while (this.nextNoteTime < horizon) {
      const f = melody[this.step % melody.length];
      this.tone(f, 0.18, "triangle", 0.11, this.nextNoteTime, this.music);
      if (this.step % 4 === 0) {
        this.tone(f / 2, 0.24, "sine", 0.05, this.nextNoteTime, this.music);
      }
      this.nextNoteTime += 0.21;
      this.step += 1;
    }
  }
}
