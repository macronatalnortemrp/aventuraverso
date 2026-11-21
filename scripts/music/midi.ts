/**
 * Escritor de arquivo MIDI (formato 1), sem dependências.
 * Uma trilha de andamento + uma trilha por parte. Partes melódicas em canais 0..8; percussão no canal 9 (GM).
 */
import type { NoteEvent, Part } from '../../src/engine/musicScore.ts';

export const PPQ = 480;
const CHANNEL: Record<Part, number> = { lead: 0, lead2: 1, chords: 2, bass: 3, kick: 9, clap: 9, hat: 9 };

function vlq(n: number): number[] {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
}

function chunk(type: string, data: number[]): number[] {
  const len = data.length;
  return [...[...type].map((c) => c.charCodeAt(0)), (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...data];
}

/** Monta o MIDI: os tempos dos eventos (segundos) viram ticks no andamento `bpm`. */
export function writeMidi(events: NoteEvent[], programs: Partial<Record<Part, number>>, bpm: number, tailSeconds = 0): Uint8Array {
  const tick = (sec: number) => Math.round((sec * bpm * PPQ) / 60);
  const uspq = Math.round(60_000_000 / bpm);
  const tracks: number[][] = [];
  // trilha 0: andamento e fim
  tracks.push(chunk('MTrk', [0, 0xff, 0x51, 3, (uspq >> 16) & 255, (uspq >> 8) & 255, uspq & 255, ...vlq(0), 0xff, 0x2f, 0]));
  const groups = new Map<number, NoteEvent[]>();
  for (const e of events) {
    const ch = CHANNEL[e.part];
    if (!groups.has(ch)) groups.set(ch, []);
    groups.get(ch)!.push(e);
  }
  const end = events.reduce((m, e) => Math.max(m, e.t + e.d), 0) + tailSeconds;
  for (const [ch, list] of [...groups].sort((a, b) => a[0] - b[0])) {
    const msgs: { t: number; on: boolean; bytes: number[] }[] = [];
    for (const e of list) {
      msgs.push({ t: tick(e.t), on: true, bytes: [0x90 | ch, e.midi & 127, Math.max(1, Math.min(127, e.vel))] });
      msgs.push({ t: tick(e.t + e.d), on: false, bytes: [0x80 | ch, e.midi & 127, 0] });
    }
    msgs.sort((a, b) => a.t - b.t || Number(a.on) - Number(b.on)); // desliga antes de ligar no mesmo instante
    const data: number[] = [];
    if (ch !== 9) {
      const part = (Object.keys(CHANNEL) as Part[]).find((p) => CHANNEL[p] === ch)!;
      data.push(0, 0xc0 | ch, (programs[part] ?? 0) & 127);
      data.push(0, 0xb0 | ch, 91, 50); // um pouco de reverberação
    }
    let last = 0;
    for (const m of msgs) {
      data.push(...vlq(m.t - last), ...m.bytes);
      last = m.t;
    }
    data.push(...vlq(Math.max(0, tick(end) - last)), 0xff, 0x2f, 0);
    tracks.push(chunk('MTrk', data));
  }
  const head = chunk('MThd', [0, 1, (tracks.length >> 8) & 255, tracks.length & 255, (PPQ >> 8) & 255, PPQ & 255]);
  return new Uint8Array([...head, ...tracks.flat()]);
}
