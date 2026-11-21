/**
 * Partitura da trilha (public/data/music/theme.json) → eventos de nota.
 * Compartilhado pelo gerador de áudio (scripts/music, roda no Node) e pela síntese reserva do jogo.
 * Sem imports: o gerador roda este arquivo direto no Node.
 */

export type CueId = 'festa' | 'misterio' | 'acolhida' | 'esperanca' | 'explorar' | 'escuro' | 'faisca' | 'vitoria';
export const CUES: CueId[] = ['festa', 'misterio', 'acolhida', 'esperanca', 'explorar', 'escuro', 'faisca', 'vitoria'];

export type Part = 'lead' | 'lead2' | 'chords' | 'bass' | 'kick' | 'clap' | 'hat';

interface Voice {
  program: number;
  vel: number;
  octave?: number;
  style?: 'offbeat' | 'pad' | 'arp' | 'bounce' | 'root' | 'long';
  /** só as notas que caem no tempo, longas (variações lentas) */
  sparse?: boolean;
}

export interface CueDef {
  loop: boolean;
  bpm: number;
  /** compassos do tema usados, de 1 a 8, inclusive */
  bars: [number, number];
  transpose: number;
  /** acorde final sustentado (vinhetas) */
  ending?: string;
  /** tempos do acorde final (padrão: um compasso) */
  endingBeats?: number;
  chordOverride?: string[];
  lead?: Voice;
  lead2?: Voice;
  chords?: Voice;
  bass?: Voice;
  drums?: { style: 'party' };
}

export interface Score {
  theme: { beatsPerBar: number; melody: [number | null, number][]; chords: [string, number][] };
  chordNotes: Record<string, number[]>;
  cues: Record<CueId, CueDef>;
}

/** Nota tocada: t e d em segundos a partir do início da passagem. */
export interface NoteEvent {
  t: number;
  d: number;
  midi: number;
  /** 1 a 127 */
  vel: number;
  part: Part;
}

export interface RenderedCue {
  events: NoteEvent[];
  /** duração de uma passagem (loop) ou da vinheta inteira, sem a cauda */
  seconds: number;
  loop: boolean;
  /** instrumento General MIDI de cada parte melódica */
  programs: Partial<Record<Part, number>>;
}

/** notas de percussão General MIDI (canal 10) */
export const DRUM_NOTE: Record<'kick' | 'clap' | 'hat', number> = { kick: 36, clap: 39, hat: 42 };

/** Acorde de cada tempo do tema (um nome por tempo). */
function chordPerBeat(s: Score) {
  const out: string[] = [];
  for (const [name, n] of s.theme.chords) for (let i = 0; i < n; i++) out.push(name);
  return out;
}

export function renderCue(s: Score, id: CueId): RenderedCue {
  const c = s.cues[id],
    bpb = s.theme.beatsPerBar,
    spb = 60 / c.bpm,
    b0 = (c.bars[0] - 1) * bpb,
    b1 = c.bars[1] * bpb,
    beats = b1 - b0,
    perBeat = chordPerBeat(s),
    ev: NoteEvent[] = [],
    tr = c.transpose;
  const chordAt = (beat: number) => {
    if (c.chordOverride) return c.chordOverride[Math.floor(beat / bpb) % c.chordOverride.length];
    return perBeat[b0 + Math.floor(beat)] ?? 'C';
  };
  const notes = (name: string) => s.chordNotes[name] ?? s.chordNotes.C;
  const push = (t: number, d: number, midi: number, vel: number, part: Part) => ev.push({ t: t * spb, d: d * spb, midi: midi + (part === 'kick' || part === 'clap' || part === 'hat' ? 0 : tr), vel, part });

  // melodia (e a segunda voz, uma oitava acima quando pedido)
  let at = 0;
  for (const [m, len] of s.theme.melody) {
    const start = at;
    at += len;
    if (m === null || start < b0 || start >= b1) continue;
    const t = start - b0;
    for (const [part, v] of [['lead', c.lead], ['lead2', c.lead2]] as const) {
      if (!v) continue;
      if (v.sparse && start % 1 !== 0) continue;
      push(t, v.sparse ? Math.max(len, 1.5) : len * 0.95, m + 12 * (v.octave ?? 0), v.vel, part);
    }
  }
  // acordes
  if (c.chords) {
    const v = c.chords,
      o = 12 * (v.octave ?? 0);
    for (let b = 0; b < beats; b += 0.5) {
      const n = notes(chordAt(b)).map((x) => x + o),
        inBar = b % bpb;
      if (v.style === 'offbeat' && b % 1 === 0.5) n.forEach((x) => push(b, 0.4, x, v.vel, 'chords'));
      else if (v.style === 'pad' && inBar === 0) n.forEach((x) => push(b, bpb * 0.98, x, v.vel, 'chords'));
      else if (v.style === 'arp') {
        const arp = [n[0], n[1], n[2], n[0] + 12, n[2], n[1], n[0] + 12, n[2]];
        push(b, 0.9, arp[(inBar * 2) % 8], v.vel, 'chords');
      }
    }
  }
  // baixo
  if (c.bass) {
    const v = c.bass;
    for (let b = 0; b < beats; b += 1) {
      const root = notes(chordAt(b))[0] - 12 + 12 * (v.octave ?? 0),
        inBar = b % bpb;
      if (v.style === 'bounce') push(b, 0.8, root + (inBar % 2 ? 12 : 0), v.vel, 'bass');
      else if (v.style === 'root' && inBar % 2 === 0) push(b, 1.8, root, v.vel, 'bass');
      else if (v.style === 'long' && inBar === 0) push(b, bpb * 0.98, root, v.vel, 'bass');
    }
  }
  // percussão
  if (c.drums) {
    for (let b = 0; b < beats; b += 0.5) {
      const inBar = b % bpb;
      if (inBar === 0 || inBar === 2) push(b, 0.25, DRUM_NOTE.kick, 100, 'kick');
      if (inBar === 1 || inBar === 3) push(b, 0.25, DRUM_NOTE.clap, 90, 'clap');
      push(b, 0.2, DRUM_NOTE.hat, b % 1 ? 45 : 65, 'hat');
    }
  }
  let total = beats;
  // acorde final das vinhetas
  if (c.ending && !c.loop) {
    const n = notes(c.ending);
    const v = c.chords ?? c.lead ?? { vel: 80, program: 0 };
    const eb = c.endingBeats ?? bpb;
    for (const x of [...n.map((y) => y + 12), n[0] + 24]) push(beats, eb * 0.9, x, v.vel, c.chords ? 'chords' : 'lead');
    if (c.bass) push(beats, eb * 0.9, n[0] - 12, c.bass.vel, 'bass');
    if (c.drums) push(beats, 0.5, DRUM_NOTE.kick, 110, 'kick');
    total += eb;
  }
  ev.sort((a, b) => a.t - b.t);
  const programs: Partial<Record<Part, number>> = {};
  for (const p of ['lead', 'lead2', 'chords', 'bass'] as const) if (c[p]) programs[p] = c[p]!.program;
  return { events: ev, seconds: total * spb, loop: c.loop, programs };
}
