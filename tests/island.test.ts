import { describe, expect, test } from 'vitest';
import { Colliders } from '../src/world/colliders';
import { H, WY } from '../src/world/terrain';
import { createPlayer, pressA, stepPlayer, PlayerEvents } from '../src/game/player';
import { ARRIVAL_Z, STEPS, ISLAND, TOP_Y, TOP_HALF_W } from '../src/world/islandLayout';

/* O percurso da ilha suspensa precisa caber no pulo atual do personagem (sem pulo alto). */

const noop: PlayerEvents = { splash() {}, land() {}, step() {}, wake() {}, bubble() {}, outOfBreath() {} };

function world() {
  const col = new Colliders();
  STEPS.forEach((s, i) => col.boxes.push({ x0: s.x - s.w / 2, x1: s.x + s.w / 2, z0: s.z - s.d / 2, z1: s.z + s.d / 2, top: s.y, bottom: i === 0 ? -5 : s.y - 1.6 }));
  col.boxes.push({ x0: ISLAND.x - TOP_HALF_W, x1: ISLAND.x + TOP_HALF_W, z0: ISLAND.z - TOP_HALF_W, z1: ISLAND.z + TOP_HALF_W, top: TOP_Y, bottom: TOP_Y - 8 });
  return col;
}

/** Sai do centro de `a`, corre em direção a `b` e pula perto da borda. Devolve onde pousou. */
function hop(a: { x: number; z: number; y: number }, b: { x: number; z: number }, col: Colliders) {
  const P = createPlayer(a.x, a.z);
  P.y = a.y;
  const L = Math.hypot(b.x - a.x, b.z - a.z),
    ix = (b.x - a.x) / L,
    iz = (b.z - a.z) / L;
  let jumped = false;
  for (let t = 0; t < 4; t += 1 / 60) {
    const g = col.groundAt(P.x + ix * 0.5, P.z + iz * 0.5, P.y);
    if (!jumped && P.st === 'ground' && g < P.y - 0.1) {
      pressA(P); // a beirada está logo à frente: pula
      jumped = true;
    }
    // como uma criança: solta o joystick ao chegar perto do centro da plataforma
    const rem = Math.hypot(b.x - P.x, b.z - P.z),
      m = Math.min(1, rem / 1.6);
    stepPlayer(P, (b.x - P.x) / (rem || 1), (b.z - P.z) / (rem || 1), m, 1 / 60, t, col, noop);
    if (jumped && P.st === 'ground') break;
  }
  return P;
}

describe('ilha suspensa: percurso', () => {
  test('a partida é um degrau baixo sobre terra firme: dá para subir andando', () => {
    const g = H(STEPS[0].x, STEPS[0].z);
    expect(g).toBeGreaterThan(WY);
    expect(STEPS[0].y - g).toBeLessThanOrEqual(0.42);
  });
  test('nenhum degrau sobe mais que 1,2 (o pulo alcança ~2)', () => {
    for (let i = 1; i < STEPS.length; i++) expect(STEPS[i].y - STEPS[i - 1].y).toBeLessThanOrEqual(1.2);
    expect(TOP_Y - STEPS[STEPS.length - 1].y).toBeLessThanOrEqual(1.2);
  });
  test('cada salto do percurso, com o pulo normal, pousa na plataforma seguinte e chega ao topo', () => {
    const col = world();
    const path = [...STEPS, { x: ISLAND.x - TOP_HALF_W + 1.5, z: ARRIVAL_Z, y: TOP_Y, w: 2, d: 2 }];
    for (let i = 0; i < path.length - 1; i++) {
      const P = hop(path[i], path[i + 1], col);
      expect(P.st, `salto ${i} → ${i + 1}`).toBe('ground');
      expect(P.y, `salto ${i} → ${i + 1}`).toBeCloseTo(path[i + 1].y, 1);
    }
  });
  test('as mini ilhas não se encostam (há vão para pular)', () => {
    for (let i = 1; i < STEPS.length - 1; i++) {
      const a = STEPS[i],
        b = STEPS[i + 1];
      const gap = Math.max(Math.abs(a.x - b.x) - (a.w + b.w) / 2, Math.abs(a.z - b.z) - (a.d + b.d) / 2);
      expect(gap, `vão ${i} → ${i + 1}`).toBeGreaterThan(0.3);
      expect(gap, `vão ${i} → ${i + 1}`).toBeLessThan(2.6);
    }
  });
});
