import { describe, expect, test } from 'vitest';
import { breathStep, breathColor } from '../src/game/breath';
import { BREATH } from '../src/config/guidance';

describe('fôlego', () => {
  test('dura o tempo configurado debaixo d’água e não fica negativo', () => {
    let b = 1;
    for (let i = 0; i < BREATH.seconds * 10 - 1; i++) b = breathStep(b, 0.1, true);
    expect(b).toBeGreaterThan(0);
    for (let i = 0; i < 50; i++) b = breathStep(b, 0.1, true);
    expect(b).toBe(0);
  });
  test('recarrega na superfície sem passar de 1', () => {
    let b = 0;
    for (let i = 0; i < 100; i++) b = breathStep(b, 0.1, false);
    expect(b).toBe(1);
  });
  test('cor: azul, laranja perto da metade, vermelho depois', () => {
    expect(breathColor(1)).toBe('#3aa0e0');
    expect(breathColor(0.55)).toBe('#f39a2b');
    expect(breathColor(0.3)).toBe('#d92b2b');
  });
});
