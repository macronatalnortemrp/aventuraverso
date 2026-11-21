import { describe, expect, test } from 'vitest';
import { Mirror, reflect, trace, turn, STEP_DEG } from '../src/game/light/beam';
import { PUZZLES } from '../src/game/light/puzzles';

/** Todas as combinações: cada suporte vazio ou com espelho em múltiplos de 15°. */
function* combos(n: number): Generator<Mirror[]> {
  const opts = [null, ...Array.from({ length: 180 / STEP_DEG }, (_, i) => i * STEP_DEG)];
  const idx = new Array(n).fill(0);
  for (;;) {
    yield idx.flatMap((k, s) => (opts[k] === null ? [] : [{ support: s, angle: opts[k] as number }]));
    let i = 0;
    while (i < n && ++idx[i] === opts.length) idx[i++] = 0;
    if (i === n) return;
  }
}

describe('Caminho da Luz: feixe', () => {
  test('reflexão geométrica: ângulo de incidência igual ao de reflexão', () => {
    const r = reflect({ u: 1, v: 0 }, { u: -Math.SQRT1_2, v: Math.SQRT1_2 });
    expect(r.u).toBeCloseTo(0);
    expect(r.v).toBeCloseTo(1);
  });
  test('girar o espelho anda de 15 em 15 graus e volta ao começo', () => {
    expect(turn(165, 1)).toBe(0);
    expect(turn(0, -1)).toBe(165);
  });
  test('sem espelhos, a luz não chega ao cristal', () => {
    for (const p of PUZZLES) expect(trace(p, []).lit).toBe(false);
  });

  PUZZLES.forEach((p, k) => {
    test(`desafio ${k + 1}: a solução acende o cristal passando por todos os espelhos`, () => {
      const t = trace(p, p.solution.map((angle, support) => ({ support, angle })));
      expect(t.lit).toBe(true);
      expect(t.hits).toEqual(p.supports.map((_, i) => i));
    });
    test(`desafio ${k + 1}: só dá para resolver usando os ${p.supports.length} espelhos`, () => {
      let solutions = 0;
      for (const ms of combos(p.supports.length)) {
        const t = trace(p, ms);
        if (!t.lit) continue;
        solutions++;
        expect(ms.length).toBe(p.supports.length);
        expect(new Set(t.hits).size).toBe(p.supports.length);
      }
      expect(solutions).toBeGreaterThan(0);
    });
  });

  test('o feixe para na pedra', () => {
    const p = PUZZLES[1];
    // espelho 1 virado direto para a diagonal do cristal: a pedra do meio segura a luz
    const t = trace(p, [{ support: 0, angle: 60 }]);
    expect(t.lit).toBe(false);
    expect(Math.hypot(t.points.at(-1)!.u - p.receiver.u, t.points.at(-1)!.v - p.receiver.v)).toBeGreaterThan(1);
  });
});
