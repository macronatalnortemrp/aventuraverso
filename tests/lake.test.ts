import { describe, expect, test } from 'vitest';
import { BIG, EDGE, FALLS, H, LAKE, LIGHT_ISLE, PALM_ISLE, REEF, SURF, WY, isDeep, worldOut } from '../src/world/terrain';
import { LIGHTHOUSE, LIGHT_STEPS, LIGHT_STEP_R } from '../src/world/lakeLayout';
import { ISLAND } from '../src/world/islandLayout';

describe('Lago Grande', () => {
  test('é bem maior que a enseada da ilha suspensa e se liga a ela pela água', () => {
    expect(BIG.rx * 2).toBeGreaterThan(LAKE.r * 6);
    // da enseada até o meio do Lago Grande, só água funda
    for (let x = LAKE.x - 6; x > BIG.x; x -= 1) expect(isDeep(x, LAKE.z), `x = ${x}`).toBe(true);
  });
  test('a ilha suspensa do Dia 1 continua sobre a água da enseada', () => {
    expect(H(ISLAND.x, ISLAND.z)).toBeLessThan(SURF);
  });
  test('as ilhas ficam acima da água, cercadas de lago', () => {
    for (const i of [PALM_ISLE, LIGHT_ISLE]) {
      expect(H(i.x, i.z)).toBeGreaterThan(WY + 1);
      for (let a = 0; a < 6.28; a += 0.5) expect(isDeep(i.x + Math.cos(a) * (i.r + 5), i.z + Math.sin(a) * (i.r + 5))).toBe(true);
    }
  });
  test('o recife é raso o bastante para mergulhar até os corais', () => {
    expect(H(REEF.x, REEF.z)).toBeGreaterThan(-2.9);
    expect(H(REEF.x, REEF.z)).toBeLessThan(WY - 1.5);
  });
  test('a cachoeira cai de um paredão alto na margem oeste', () => {
    expect(H(FALLS.x - 3, FALLS.z)).toBeGreaterThan(8);
    expect(H(FALLS.x + 5, FALLS.z)).toBeLessThan(WY);
  });
  test('o mundo cresceu para oeste e o acampamento continua igual', () => {
    expect(worldOut(-100, 4)).toBeLessThan(0);
    expect(worldOut(EDGE + 2, 0)).toBeGreaterThan(0);
    expect(worldOut(-140, 4)).toBeGreaterThan(0);
    expect(Math.abs(H(0, 1))).toBeLessThan(0.05);
  });
  test('os degraus do farol sobem até o mirante, com pulos que a criança alcança', () => {
    for (let i = 1; i < LIGHT_STEPS.length; i++) {
      const [a0, k0] = LIGHT_STEPS[i - 1],
        [a1, k1] = LIGHT_STEPS[i];
      expect(k1 - k0).toBeLessThan(1.2);
      expect(LIGHT_STEP_R * Math.abs(a1 - a0)).toBeLessThan(2.6);
    }
    expect(LIGHTHOUSE.h + 0.3 - LIGHT_STEPS[LIGHT_STEPS.length - 1][1]).toBeLessThan(1.3);
  });
});
