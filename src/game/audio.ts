/* ============================================================
   Chain Lab — Procedural sound effects (Web Audio, no assets).
   ============================================================ */

interface ToneOpts {
  type?: OscillatorType;
  slide?: number;
  gain?: number;
  attack?: number;
}
interface NoiseOpts {
  ftype?: BiquadFilterType;
  freq?: number;
  gain?: number;
}

export class AudioEngine {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** Lazily create the AudioContext on first user gesture. */
  init(): void {
    if (this.ac) return;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ac = new Ctor();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ac.destination);
    } catch {
      this.ac = null;
    }
    // Some browsers start the context suspended until a gesture resumes it.
    if (this.ac && this.ac.state === 'suspended') void this.ac.resume();
  }

  private now(): number {
    return this.ac ? this.ac.currentTime : 0;
  }

  private tone(freq: number, dur: number, opt: ToneOpts = {}): void {
    if (!this.ac || !this.master || this.muted) return;
    const t = this.now();
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(1, opt.slide), t + dur);
    const peak = opt.gain == null ? 0.3 : opt.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (opt.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, opt: NoiseOpts = {}): void {
    if (!this.ac || !this.master || this.muted) return;
    const t = this.now();
    const n = Math.floor(this.ac.sampleRate * dur);
    const buf = this.ac.createBuffer(1, n, this.ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ac.createBufferSource();
    src.buffer = buf;
    const f = this.ac.createBiquadFilter();
    f.type = opt.ftype || 'lowpass';
    f.frequency.value = opt.freq || 1200;
    const g = this.ac.createGain();
    g.gain.value = opt.gain == null ? 0.3 : opt.gain;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  // --- named cues -------------------------------------------------
  step(): void {
    this.tone(150 + Math.random() * 30, 0.06, { type: 'square', gain: 0.05 });
  }
  grab(): void {
    this.tone(420, 0.08, { type: 'triangle', gain: 0.18, slide: 620 });
  }
  drop(): void {
    this.tone(300, 0.1, { type: 'triangle', gain: 0.2, slide: 180 });
    this.noise(0.06, { freq: 800, gain: 0.08 });
  }
  deny(): void {
    this.tone(180, 0.12, { type: 'sawtooth', gain: 0.12, slide: 120 });
  }
  /** The robot starts the pulse. */
  pulse(): void {
    this.tone(160, 0.18, { type: 'square', gain: 0.22, slide: 90 });
    this.tone(520, 0.22, { type: 'sine', gain: 0.16, slide: 1200 });
  }
  /** A module activates and passes the pulse on. */
  activate(k: number): void {
    this.tone(300 + k * 26, 0.1, { type: 'square', gain: 0.15, slide: 420 + k * 18 });
    this.noise(0.03, { freq: 3200, gain: 0.05 });
  }
  blast(): void {
    this.noise(0.5, { freq: 900, gain: 0.5, ftype: 'lowpass' });
    this.tone(90, 0.45, { type: 'sawtooth', gain: 0.4, slide: 40 });
  }
  phase(): void {
    this.tone(700, 0.3, { type: 'sine', gain: 0.2, slide: 1700 });
  }
  bridge(): void {
    this.tone(330, 0.16, { type: 'triangle', gain: 0.22, slide: 240 });
    this.noise(0.08, { freq: 1500, gain: 0.1 });
  }
  split(): void {
    this.tone(500, 0.12, { type: 'square', gain: 0.2, slide: 760 });
    this.tone(360, 0.12, { type: 'square', gain: 0.16, slide: 240 });
  }
  tick(): void {
    this.tone(880, 0.04, { type: 'sine', gain: 0.07 });
  }
  win(): void {
    [523, 659, 784, 1047].forEach((f, i) => {
      window.setTimeout(() => this.tone(f, 0.5, { type: 'triangle', gain: 0.26 }), i * 110);
    });
  }
  lose(): void {
    this.tone(300, 0.5, { type: 'sawtooth', gain: 0.25, slide: 90 });
  }
  open(): void {
    this.tone(440, 0.5, { type: 'sine', gain: 0.2, slide: 880 });
  }
}
