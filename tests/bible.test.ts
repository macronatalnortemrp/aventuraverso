import { describe, expect, test } from 'vitest';
import bible from '../public/data/content/bible-acf2007.json';
import day01 from '../public/data/days/day01.json';

/* O texto bíblico vem de arquivo, nunca escrito à mão: aqui só se confere a forma do arquivo. */
const verses: Record<string, string> = bible.verses;

describe('texto bíblico (ACF 2007)', () => {
  test('tem os 34 versículos de Gn 1:1 a 2:3, com a fonte registrada', () => {
    const keys = [...Array.from({ length: 31 }, (_, i) => `Gn 1:${i + 1}`), 'Gn 2:1', 'Gn 2:2', 'Gn 2:3'];
    expect(Object.keys(verses)).toEqual(keys);
    for (const k of keys) expect(verses[k].trim().length).toBeGreaterThan(10);
    expect(bible.translation).toMatch(/Corrigida Fiel/);
    expect(bible.source).toMatch(/sha256 [0-9a-f]{64}/);
  });
  test('toda leitura do Dia 1 encontra os seus versículos', () => {
    for (const r of Object.values<{ keys: string[] }>(day01.readings)) for (const k of r.keys) expect(verses[k]).toBeTruthy();
  });
});
