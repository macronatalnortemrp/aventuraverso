/**
 * Trilha da abertura, composta e tocada por código com Web Audio (sem arquivos, sem licença de terceiros).
 * Temas: alegria (Quadro 1), mistério com vento (Quadro 2), acolhida (Quadros 3 a 5) e esperança (Quadro 6).
 * Sempre opcional: sem som, a abertura funciona igual. A música abaixa sozinha sob a narração.
 */
export type Theme = 'joy' | 'mystery' | 'warm' | 'hope';

type AC = AudioContext;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/* acordes em notas MIDI (Dó maior): C, G, Am, F */
const PROG: number[][] = [
  [60, 64, 67],
  [55, 59, 62],
  [57, 60, 64],
  [53, 57, 60],
];
/* melodia alegre: 2 compassos por acorde, colcheias (null = pausa) */
const JOY_MELODY: (number | null)[] = [
  72, 74, 76, 79, 76, null, 74, 72, 71, 72, 74, null, 79, null, 74, null,
  72, 74, 76, null, 81, 79, 76, 74, 72, null, 77, 76, 74, null, 72, null,
];

export class Music {
  private ctx: AC | null = null;
  private master: GainNode | null = null;
  private theme: Theme | null = null;
  private timer = 0;
  private nextT = 0;
  private stepI = 0;
  private wind: { src: AudioBufferSourceNode; g: GainNode } | null = null;
  private enabled = true;
  private ducked = false;
  private readonly vol = 0.32;

  private ac(): AC | null {
    if (this.ctx) return this.ctx;
    try {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.stop(0.2);
  }

  /** Abaixa a música enquanto alguém fala. */
  duck(on: boolean) {
    this.ducked = on;
    this.level(0.6);
  }

  private level(sec: number) {
    const c = this.ctx,
      m = this.master;
    if (!c || !m) return;
    const v = this.theme ? this.vol * (this.ducked ? 0.45 : 1) * (this.theme === 'mystery' ? 0.8 : 1) : 0;
    m.gain.cancelScheduledValues(c.currentTime);
    m.gain.setValueAtTime(m.gain.value, c.currentTime);
    m.gain.linearRampToValueAtTime(v, c.currentTime + sec);
  }

  play(theme: Theme) {
    if (!this.enabled) return;
    const c = this.ac();
    if (!c) return;
    void c.resume?.();
    if (this.theme === theme) return;
    this.theme = theme;
    this.stepI = 0;
    this.nextT = c.currentTime + 0.05;
    if (theme === 'mystery') {
      this.hold(c);
      this.startWind(c);
    } else this.stopWind(1.5);
    this.level(theme === 'joy' ? 0.05 : 1.2);
    if (!this.timer) this.timer = window.setInterval(() => this.schedule(), 90);
  }

  stop(sec = 1.2) {
    this.theme = null;
    this.level(sec);
    this.stopWind(sec);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = 0;
    }
  }

  /* ---------- instrumentos ---------- */

  private note(c: AC, f: number, t: number, d: number, type: OscillatorType, v: number, attack = 0.01) {
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + d + 0.05);
  }

  private noiseBuf(c: AC, sec: number) {
    const b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate),
      a = b.getChannelData(0);
    for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    return b;
  }

  private hat(c: AC, t: number, v = 0.05) {
    const s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = this.noiseBuf(c, 0.06);
    f.type = 'highpass';
    f.frequency.value = 7000;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f);
    f.connect(g);
    g.connect(this.master!);
    s.start(t);
  }

  private kick(c: AC, t: number) {
    const o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.16);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + 0.22);
  }

  /** nota suspensa quando a alegria é interrompida */
  private hold(c: AC) {
    const t = c.currentTime;
    for (const n of [62, 67, 72]) this.note(c, midi(n), t, 3.5, 'triangle', 0.06, 0.02);
  }

  private startWind(c: AC) {
    if (this.wind) return;
    const s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain(),
      lfo = c.createOscillator(),
      lg = c.createGain();
    s.buffer = this.noiseBuf(c, 2);
    s.loop = true;
    f.type = 'bandpass';
    f.frequency.value = 500;
    f.Q.value = 0.8;
    lfo.frequency.value = 0.23;
    lg.gain.value = 300;
    lfo.connect(lg);
    lg.connect(f.frequency);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(0.5, c.currentTime + 1.2);
    s.connect(f);
    f.connect(g);
    g.connect(this.master!);
    s.start();
    lfo.start();
    this.wind = { src: s, g };
  }

  private stopWind(sec: number) {
    const w = this.wind,
      c = this.ctx;
    if (!w || !c) return;
    this.wind = null;
    w.g.gain.cancelScheduledValues(c.currentTime);
    w.g.gain.setValueAtTime(w.g.gain.value, c.currentTime);
    w.g.gain.linearRampToValueAtTime(0.0001, c.currentTime + sec);
    w.src.stop(c.currentTime + sec + 0.1);
  }

  /* ---------- sequenciador ---------- */

  private schedule() {
    const c = this.ctx;
    if (!c || !this.theme) return;
    while (this.nextT < c.currentTime + 0.25) {
      this.tick(c, this.theme, this.stepI, this.nextT);
      this.nextT += this.stepLen(this.theme);
      this.stepI++;
    }
  }

  private stepLen(th: Theme) {
    return th === 'joy' ? 0.25 : th === 'hope' ? 0.3 : th === 'warm' ? 0.36 : 0.5;
  }

  /** um passo de colcheia */
  private tick(c: AC, th: Theme, i: number, t: number) {
    const bar = Math.floor(i / 8),
      beat = i % 8,
      ch = PROG[Math.floor(bar / (th === 'joy' ? 2 : 1)) % 4];
    if (th === 'joy') {
      if (beat % 2 === 0) this.note(c, midi(ch[0] - 24 + (beat === 4 ? 7 : 0)), t, 0.22, 'triangle', 0.22);
      if (beat === 0 || beat === 4) this.kick(c, t);
      this.hat(c, t, beat % 2 ? 0.03 : 0.05);
      if (beat === 2 || beat === 6) for (const n of ch) this.note(c, midi(n), t, 0.18, 'square', 0.025);
      const m = JOY_MELODY[i % JOY_MELODY.length];
      if (m) this.note(c, midi(m), t, 0.22, 'square', 0.05);
      if (m && beat % 4 === 0) this.note(c, midi(m + 12), t, 0.3, 'sine', 0.03);
    } else if (th === 'mystery') {
      // notas soltas e espaçadas, em menor, sob o vento
      if (i % 8 === 0) this.note(c, midi([57, 53, 55, 52][bar % 4] - 12), t, 3.6, 'sine', 0.12, 0.6);
      if (i % 4 === 2) this.note(c, midi([76, 74, 72, 71, 69][(i / 4) % 5 | 0]), t, 1.6, 'sine', 0.03, 0.1);
    } else if (th === 'warm') {
      if (beat === 0) for (const n of ch) this.note(c, midi(n), t, 2.8, 'sine', 0.05, 0.4);
      if (beat === 0) this.note(c, midi(ch[0] - 24), t, 2.6, 'triangle', 0.12, 0.05);
      const arp = [ch[0], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]];
      if (beat % 2 === 0 || beat === 5) this.note(c, midi(arp[beat % 6] + 12), t, 0.9, 'sine', 0.05);
    } else {
      // esperança: arpejo que sobe e acorde cheio
      if (beat === 0) {
        for (const n of ch) this.note(c, midi(n), t, 2.2, 'triangle', 0.05, 0.08);
        this.note(c, midi(ch[0] - 24), t, 2.2, 'triangle', 0.16);
        this.kick(c, t);
      }
      const arp = [ch[0], ch[1], ch[2], ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24, ch[2] + 12];
      this.note(c, midi(arp[beat]), t, 0.5, 'sine', 0.05);
      if (beat === 4) this.hat(c, t, 0.04);
    }
  }
}
