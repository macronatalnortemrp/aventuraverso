/**
 * Trilha do jogo (docs/superpowers/specs/2026-11-21-trilha-sonora-design.md).
 * Toca os MP3 gerados da partitura (public/audio/music, FluidR3_GM) em loop sem emenda; troca de música
 * com fade cruzado; vinhetas por cima abaixando o loop; volume por momento (fala, leitura).
 * Se o arquivo faltar ou falhar, toca a mesma partitura sintetizada. Sempre opcional.
 */
import { CueId, NoteEvent, Score, renderCue } from './musicScore';
import { MusicContext, musicLevel } from './musicLevel';
import { pauseAudio, sharedAudio } from './audioContext';

type AC = AudioContext;
interface Entry {
  file: string;
  seconds: number;
  loop: boolean;
  loopStart: number;
}

const BASE = `${import.meta.env?.BASE_URL ?? '/'}`;
const VOL = 0.55;
const FADE = 1.2;
const midiHz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Uma voz tocando (arquivo ou síntese), com seu próprio ganho para o fade. */
interface Voice {
  id: CueId;
  gain: GainNode;
  stop(at: number): void;
}

export class Music {
  private ctx: AC | null = null;
  private master: GainNode | null = null;
  private loopBus: GainNode | null = null;
  private manifest: Record<string, Entry> | null = null;
  private score: Score | null = null;
  private buffers = new Map<CueId, Promise<AudioBuffer | null>>();
  private current: Voice | null = null;
  private wanted: CueId | null = null;
  private stings = 0;
  private context: MusicContext = 'normal';
  private enabled = true;
  private wind: { src: AudioBufferSourceNode; g: GainNode } | null = null;
  private token = 0;
  private loading: CueId | null = null;

  constructor() {
    if (typeof fetch === 'undefined') return;
    fetch(BASE + 'audio/music/manifest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => (this.manifest = m?.cues ?? null))
      .catch(() => {
        /* sem arquivos: síntese */
      });
    fetch(BASE + 'data/music/theme.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => (this.score = s))
      .catch(() => {
        /* sem partitura: só os arquivos */
      });
  }

  private ac(): AC | null {
    if (this.ctx) return this.ctx;
    try {
      const c = sharedAudio();
      if (!c) return null;
      this.master = c.createGain();
      this.master.gain.value = this.enabled ? VOL : 0;
      this.master.connect(c.destination);
      this.loopBus = c.createGain();
      this.loopBus.gain.value = 1;
      this.loopBus.connect(this.master);
      this.ctx = c;
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /* ---------- controle ---------- */

  setEnabled(on: boolean) {
    this.enabled = on;
    const c = this.ctx;
    if (c && this.master) ramp(this.master.gain, on ? VOL : 0, c, 0.3);
    if (!on) {
      this.token++; // cancela vinhetas e trocas pendentes
      this.loading = null;
      this.current?.stop(c ? c.currentTime + 0.35 : 0);
      this.current = null;
      this.stopWind(0.3);
    } else if (this.wanted) {
      const w = this.wanted;
      this.wanted = null;
      this.play(w);
    }
  }

  /** Aba escondida: suspende o áudio; volta junto com o jogo. */
  pause(on: boolean) {
    pauseAudio(on);
  }

  /** Momento do jogo: normal, alguém falando, leitura/pergunta. */
  setContext(ctx: MusicContext) {
    this.context = ctx;
    this.level(0.5);
  }

  /** Compatível com a abertura: abaixa sob a narração. */
  duck(on: boolean) {
    this.setContext(on ? 'speech' : 'normal');
  }

  private level(sec: number) {
    const c = this.ctx;
    if (c && this.loopBus) ramp(this.loopBus.gain, musicLevel(this.context, this.stings > 0), c, sec);
  }

  /** Troca a música de fundo (fade cruzado). Repetir a mesma não reinicia. */
  play(id: CueId) {
    this.wanted = id;
    if (!this.enabled) return;
    const c = this.ac();
    if (!c) return;
    if (this.current?.id === id || this.loading === id) return; // já toca ou está carregando
    if (c.state === 'suspended') void c.resume().catch(() => {});
    const my = ++this.token;
    this.loading = id;
    const old = this.current;
    this.current = null;
    old?.stop(c.currentTime + FADE);
    if (id === 'misterio') this.startWind(c);
    else this.stopWind(FADE);
    void this.voice(id, false).then((v) => {
      if (my === this.token) this.loading = null;
      if (!v) return;
      if (my !== this.token || this.wanted !== id) return v.stop(c.currentTime + 0.05);
      this.current = v;
    });
  }

  /** Vinheta curta por cima (faísca, vitória, esperança); o fundo abaixa enquanto ela toca. */
  sting(id: CueId) {
    if (!this.enabled) return;
    const c = this.ac();
    if (!c) return;
    if (c.state === 'suspended') void c.resume().catch(() => {});
    const my = this.token;
    void this.voice(id, true).then((v) => {
      if (!v) return;
      if (my !== this.token) return v.stop(c.currentTime);
      this.stings++;
      this.level(0.25);
      const len = this.manifest?.[id]?.seconds ?? (this.score ? renderCue(this.score, id).seconds : 3);
      setTimeout(() => {
        this.stings = Math.max(0, this.stings - 1);
        this.level(1.2);
      }, len * 1000);
    });
  }

  stop(sec = 1.2) {
    this.wanted = null;
    this.token++;
    this.loading = null;
    const c = this.ctx;
    this.current?.stop(c ? c.currentTime + sec : 0);
    this.current = null;
    this.stopWind(sec);
  }

  /* ---------- vozes ---------- */

  /** Cria e inicia uma voz para a cue: arquivo gravado ou, sem ele, síntese da partitura. */
  private async voice(id: CueId, sting: boolean): Promise<Voice | null> {
    const c = this.ctx!;
    const buf = await this.load(id);
    const gain = c.createGain();
    gain.connect(sting ? this.master! : this.loopBus!);
    const t = c.currentTime + 0.03;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(1, t + (sting ? 0.02 : FADE));
    if (buf) {
      const e = this.manifest![id],
        s = c.createBufferSource(),
        on = onset(buf);
      s.buffer = buf;
      if (e.loop) {
        s.loop = true;
        s.loopStart = on + e.loopStart;
        s.loopEnd = on + 2 * e.loopStart;
      }
      s.connect(gain);
      s.start(t);
      return { id, gain, stop: (at) => fadeOut(gain, s, c, at) };
    }
    if (!this.score) return null;
    return this.synth(id, gain, t);
  }

  private load(id: CueId): Promise<AudioBuffer | null> {
    let p = this.buffers.get(id);
    if (p) return p;
    const e = this.manifest?.[id];
    const c = this.ctx;
    if (!e || !c) return Promise.resolve(null);
    p = fetch(BASE + 'audio/music/' + e.file)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('sem arquivo'))))
      .then((b) => new Promise<AudioBuffer>((res, rej) => c.decodeAudioData(b, res, rej)))
      .catch(() => null);
    this.buffers.set(id, p);
    return p;
  }

  /** Pré-carrega uma cue provável (sem tocar). */
  preload(id: CueId) {
    if (this.ctx) void this.load(id);
  }

  /** Síntese reserva: a mesma partitura com osciladores, repetindo a passagem nos loops. */
  private synth(id: CueId, gain: GainNode, t0: number): Voice {
    const c = this.ctx!,
      r = renderCue(this.score!, id);
    let pass = 0,
      stopped = false;
    const nodes: AudioScheduledSourceNode[] = [];
    const schedule = () => {
      if (stopped) return;
      const base = t0 + pass * r.seconds;
      for (const e of r.events) nodes.push(...playNote(c, gain, e, base));
      pass++;
      if (r.loop) timer = window.setTimeout(schedule, Math.max(0, (base + r.seconds - c.currentTime - 1) * 1000));
    };
    let timer = 0;
    schedule();
    return {
      id,
      gain,
      stop: (at) => {
        stopped = true;
        clearTimeout(timer);
        ramp(gain.gain, 0.0001, c, Math.max(0.05, at - c.currentTime));
        setTimeout(() => nodes.forEach((n) => n.stop()), Math.max(0, (at - c.currentTime) * 1000 + 100));
      },
    };
  }

  /* ---------- vento do mistério (sintetizado) ---------- */

  private startWind(c: AC) {
    if (this.wind) return;
    const len = c.sampleRate * 2,
      b = c.createBuffer(1, len, c.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain(),
      lfo = c.createOscillator(),
      lg = c.createGain();
    s.buffer = b;
    s.loop = true;
    f.type = 'bandpass';
    f.frequency.value = 500;
    f.Q.value = 0.8;
    lfo.frequency.value = 0.23;
    lg.gain.value = 300;
    lfo.connect(lg);
    lg.connect(f.frequency);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.linearRampToValueAtTime(0.35, c.currentTime + 1.2);
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
    ramp(w.g.gain, 0.0001, c, sec);
    w.src.stop(c.currentTime + sec + 0.1);
  }
}

/* ---------- utilidades ---------- */

function ramp(p: AudioParam, v: number, c: AC, sec: number) {
  const t = c.currentTime;
  p.cancelScheduledValues(t);
  p.setValueAtTime(Math.max(0.0001, p.value), t);
  p.linearRampToValueAtTime(Math.max(0.0001, v), t + Math.max(0.01, sec));
}

function fadeOut(g: GainNode, s: AudioBufferSourceNode, c: AC, at: number) {
  const sec = Math.max(0.03, at - c.currentTime);
  ramp(g.gain, 0.0001, c, sec);
  try {
    s.stop(c.currentTime + sec + 0.05);
  } catch {
    /* já parou */
  }
}

/** Primeiro som do arquivo (o MP3 pode trazer um silêncio no começo): alinha o trecho do loop. */
function onset(b: AudioBuffer) {
  const d = b.getChannelData(0),
    max = Math.min(d.length, Math.floor(b.sampleRate * 0.25));
  for (let i = 0; i < max; i++) if (Math.abs(d[i]) > 0.003) return Math.max(0, i - 8) / b.sampleRate;
  return 0;
}

/** Uma nota da síntese reserva, com timbre aproximado por parte. */
function playNote(c: AC, out: GainNode, e: NoteEvent, base: number): AudioScheduledSourceNode[] {
  const t = base + e.t,
    v = (e.vel / 127) * 0.22;
  if (t < c.currentTime - 0.05) return [];
  const g = c.createGain();
  g.connect(out);
  if (e.part === 'kick' || e.part === 'clap' || e.part === 'hat') {
    if (e.part === 'kick') {
      const o = c.createOscillator();
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.15);
      g.gain.setValueAtTime(v * 2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.22);
      return [o];
    }
    const len = Math.floor(c.sampleRate * 0.1),
      b = c.createBuffer(1, len, c.sampleRate),
      x = b.getChannelData(0);
    for (let i = 0; i < len; i++) x[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(),
      f = c.createBiquadFilter();
    s.buffer = b;
    f.type = e.part === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = e.part === 'hat' ? 7000 : 1300;
    g.gain.setValueAtTime(v * (e.part === 'hat' ? 0.5 : 1.2), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    s.connect(f);
    f.connect(g);
    s.start(t);
    return [s];
  }
  const o = c.createOscillator();
  o.type = e.part === 'bass' ? 'triangle' : e.part === 'chords' ? 'sine' : 'triangle';
  o.frequency.value = midiHz(e.midi);
  const end = t + Math.max(0.1, e.d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(e.part === 'chords' ? v * 0.5 : v, t + (e.d > 1.5 ? 0.3 : 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  o.connect(g);
  o.start(t);
  o.stop(end + 0.05);
  return [o];
}
