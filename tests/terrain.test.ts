import { describe, expect, test } from 'vitest';
import { H, LAKE, HILL, WY, SURF, EDGE, pathD, isDeep } from '../src/world/terrain';

describe('terreno', () => {
  test('a clareira é plana e fica acima da água', () => {
    for (const [x, z] of [[0, 1], [3, 3], [-4, -2]]) {
      expect(Math.abs(H(x, z))).toBeLessThan(0.05);
      expect(H(x, z)).toBeGreaterThan(WY);
    }
  });
  test('o centro do lago é fundo o bastante para nadar', () => {
    expect(H(LAKE.x, LAKE.z)).toBeLessThan(SURF);
    expect(isDeep(LAKE.x, LAKE.z)).toBe(true);
    expect(isDeep(0, 0)).toBe(false);
  });
  test('a Colina do Globo é o ponto mais alto do acampamento', () => {
    expect(H(HILL.x, HILL.z)).toBeGreaterThan(3);
  });
  test('a borda do acampamento sobe', () => {
    expect(H(EDGE + 6, 0)).toBeGreaterThan(H(EDGE - 6, 0) + 1);
  });
  test('a trilha principal liga o portão à clareira', () => {
    expect(pathD(0, 30)).toBeLessThan(0.01);
    expect(pathD(10, 30)).toBeGreaterThan(9);
  });
});
