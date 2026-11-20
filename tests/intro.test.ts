import { describe, expect, test } from 'vitest';
import intro from '../public/data/intro.json';
import day01 from '../public/data/days/day01.json';

/* Textos da abertura (docs/INTRO_SEQUENCE.md): gênero, apelido e coerência com o Dia 1. */

function strings(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === 'object') return Object.entries(v).filter(([k]) => k !== '_fontes').flatMap(([, x]) => strings(x));
  return [];
}

describe('abertura', () => {
  test('só existe o marcador {apelido}', () => {
    for (const s of strings(intro)) expect(s.replace(/\{apelido\}/g, '')).not.toMatch(/[{}]/);
  });
  test('falas com gênero têm versão de menino e de menina, e diferem só no gênero', () => {
    const g = [intro.q1.line, intro.q1._big];
    for (const x of g) {
      expect(typeof x.m).toBe('string');
      expect(typeof x.f).toBe('string');
      expect(x.m).toMatch(/bem-vindo\b/i);
      expect(x.f).toMatch(/bem-vinda\b/i);
    }
  });
  test('não usa "lema" e a abertura não entrega a lanterna nem fala em "primeira página" para ler', () => {
    const all = strings(intro).join(' ');
    expect(all).not.toMatch(/\blema\b/i);
    expect(all).not.toMatch(/lanterna/i);
    expect(strings(day01.lantern).join(' ')).not.toMatch(/primeira página/i);
  });
  test('a missão do Quadro 6 fecha com o fim do Dia 1 (página recuperada)', () => {
    expect(intro._q6.text).toMatch(/página do primeiro dia/);
    expect(day01.globe.after.join(' ')).toMatch(/primeira página do Livro dos Sete Dias/);
  });
});
