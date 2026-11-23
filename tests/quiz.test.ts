import { describe, expect, test } from 'vitest';
import { judge, shuffled, wordFits } from '../src/game/quiz';

describe('respostas sem punição', () => {
  const q = { answer: 1 };
  test('acertar é sempre certo, em qualquer tentativa', () => {
    expect(judge(q, 1, 0)).toBe('right');
    expect(judge(q, 1, 2)).toBe('right');
  });
  test('1º erro acolhe, 2º dá pista, 3º mostra a resposta', () => {
    expect(judge(q, 0, 0)).toBe('retry');
    expect(judge(q, 0, 1)).toBe('hint');
    expect(judge(q, 2, 2)).toBe('reveal');
  });
  test('embaralhar mantém a resposta certa apontando para o mesmo texto', () => {
    const base = { options: ['a', 'b', 'c', 'd'], answer: 2 };
    let s = 0.37;
    const rand = () => (s = (s * 9301 + 49297) % 233280 / 233280);
    for (let i = 0; i < 20; i++) {
      const r = shuffled(base, rand);
      expect(r.options[r.answer]).toBe('c');
      expect([...r.options].sort()).toEqual(['a', 'b', 'c', 'd']);
    }
  });
});

describe('montar o versículo', () => {
  const gn13 = ['E', 'disse', 'Deus', 'Haja', 'luz', 'e', 'houve', 'luz'];
  test('qualquer peça "luz" serve nas duas posições', () => {
    expect(wordFits(gn13, 4, 'luz')).toBe('ok');
    expect(wordFits(gn13, 7, 'luz')).toBe('ok');
  });
  test('"E" e "e" valem iguais', () => {
    expect(wordFits(gn13, 0, 'e')).toBe('ok');
    expect(wordFits(gn13, 5, 'E')).toBe('ok');
  });
  test('palavra de mais adiante e palavra de fora', () => {
    expect(wordFits(gn13, 0, 'houve')).toBe('later');
    expect(wordFits(gn13, 0, 'noite')).toBe('out');
  });
});
