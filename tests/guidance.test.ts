import { describe, expect, test } from 'vitest';
import { newGuide, guideStep, guideProgress, guideSnooze } from '../src/game/guidance';
import { GUIDANCE } from '../src/config/guidance';

const run = (g: ReturnType<typeof newGuide>, seconds: number, dist = 50) => {
  const got: number[] = [];
  for (let i = 0; i < seconds * 10; i++) got.push(...guideStep(g, 0.1, dist).levels);
  return got;
};

describe('ajuda de orientação', () => {
  test('sobe os três níveis com o tempo parado (critério: 3 minutos sem avançar)', () => {
    const g = newGuide();
    expect(run(g, 3 * 60)).toEqual([1, 2, 3]);
  });
  test('cada nível aparece no tempo configurado', () => {
    const g = newGuide();
    run(g, 1);
    expect(run(g, GUIDANCE.level1 - 2)).toEqual([]);
    expect(run(g, 3)).toEqual([1]);
  });
  test('progresso zera o contador', () => {
    const g = newGuide();
    run(g, 40);
    guideProgress(g);
    expect(run(g, 40)).toEqual([]);
  });
  test('chegar mais perto do objetivo conta como progresso', () => {
    const g = newGuide();
    let d = 100;
    for (let i = 0; i < 2000; i++) {
      d -= 0.05;
      expect(guideStep(g, 0.1, d).levels).toEqual([]);
    }
  });
  test('"Agora não" adia a oferta de levar ao portal', () => {
    const g = newGuide();
    run(g, GUIDANCE.level3 + 1);
    guideSnooze(g);
    expect(run(g, GUIDANCE.snooze - 1)).toEqual([]);
    expect(run(g, GUIDANCE.level3 + 2)).toEqual([3]);
  });
  test('perto do portal a ajuda some', () => {
    const g = newGuide();
    run(g, GUIDANCE.level2 + 1);
    expect(guideStep(g, 0.1, 3).arrived).toBe(true);
    expect(g.lvl).toBe(0);
  });
});
