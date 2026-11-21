import { describe, expect, test } from 'vitest';
import score from '../public/data/music/theme.json';
import manifest from '../public/audio/music/manifest.json';
import { CUES, renderCue, Score } from '../src/engine/musicScore';
import { writeMidi, PPQ } from '../scripts/music/midi';
import { musicLevel } from '../src/engine/musicLevel';

const S = score as unknown as Score;

describe('trilha: partitura', () => {
  test('o tema tem 8 compassos de 4 tempos e os acordes cobrem a melodia inteira', () => {
    const mel = S.theme.melody.reduce((a, [, d]) => a + d, 0);
    const ch = S.theme.chords.reduce((a, [, d]) => a + d, 0);
    expect(mel).toBe(32);
    expect(ch).toBe(32);
    for (const [name] of S.theme.chords) expect(S.chordNotes[name]).toBeDefined();
  });
  test('cada cue gera notas dentro da sua duração', () => {
    for (const id of CUES) {
      const r = renderCue(S, id);
      expect(r.events.length, id).toBeGreaterThan(0);
      for (const e of r.events) {
        expect(e.t, id).toBeGreaterThanOrEqual(0);
        expect(e.t, id).toBeLessThan(r.seconds);
        expect(e.vel).toBeGreaterThan(0);
      }
    }
  });
  test('loops e vinhetas como no design', () => {
    expect(CUES.filter((id) => renderCue(S, id).loop)).toEqual(['festa', 'misterio', 'acolhida', 'explorar', 'escuro']);
    expect(renderCue(S, 'faisca').seconds).toBeLessThanOrEqual(4); // vinheta curta
  });
  test('a vitória toca o tema um tom acima (Ré maior)', () => {
    const lead = (id: 'festa' | 'vitoria') => renderCue(S, id).events.find((e) => e.part === 'lead')!.midi;
    expect(lead('vitoria') - lead('festa')).toBe(2);
  });
  test('manifesto: um arquivo por cue, loops com início do trecho repetido', () => {
    for (const id of CUES) {
      const c = (manifest.cues as Record<string, { file: string; loop: boolean; loopStart: number; seconds: number }>)[id];
      expect(c.file).toBe(`${id}.mp3`);
      expect(c.loop).toBe(renderCue(S, id).loop);
      if (c.loop) expect(c.loopStart).toBeCloseTo(c.seconds, 3);
    }
  });
});

describe('trilha: arquivo MIDI', () => {
  test('cabeçalho formato 1, divisão 480, uma trilha de andamento e uma por canal', () => {
    const b = writeMidi(
      [
        { t: 0, d: 0.5, midi: 60, vel: 100, part: 'lead' },
        { t: 0.5, d: 0.5, midi: 36, vel: 100, part: 'kick' },
      ],
      { lead: 13 },
      120,
    );
    const str = (i: number) => String.fromCharCode(...b.slice(i, i + 4));
    expect(str(0)).toBe('MThd');
    expect((b[8] << 8) | b[9]).toBe(1);
    expect((b[10] << 8) | b[11]).toBe(3);
    expect((b[12] << 8) | b[13]).toBe(PPQ);
    expect(str(14)).toBe('MTrk');
    // nota ligada (0x90) e desligada (0x80) do canal 0, e percussão no canal 9
    const bytes = [...b];
    expect(bytes).toContain(0x90);
    expect(bytes).toContain(0x80);
    expect(bytes).toContain(0x99);
    expect(bytes.indexOf(0xc0)).toBeGreaterThan(0); // troca de instrumento
  });
});

describe('trilha: volume', () => {
  test('normal, sob fala, leitura e com vinheta por cima', () => {
    expect(musicLevel('normal', false)).toBe(1);
    expect(musicLevel('speech', false)).toBeCloseTo(0.4);
    expect(musicLevel('reading', false)).toBeCloseTo(0.15);
    expect(musicLevel('normal', true)).toBeCloseTo(0.3);
    // leitura com vinheta: nunca sobe acima do nível da leitura
    expect(musicLevel('reading', true)).toBeLessThanOrEqual(0.15);
  });
});

import { cueFor } from '../src/game/musicCue';
describe('trilha: música de cada momento', () => {
  test('título, dia e escuro', () => {
    expect(cueFor({ started: false, night: false })).toBe('festa');
    expect(cueFor({ started: true, night: false })).toBe('explorar');
    expect(cueFor({ started: true, night: true })).toBe('escuro');
  });
});
