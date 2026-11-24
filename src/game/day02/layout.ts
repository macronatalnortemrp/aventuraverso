/*
 * Lugares fixos do Dia 2 no Lago Grande (dados puros, testados em tests/day02.test.ts).
 * O cais fica na margem nordeste; as três boias levam o barco pelas ilhas e pelo recife.
 */
import { H, WY } from '../../world/terrain';
export type { Landing } from '../../world/lakeLayout';
export { BOAT_DOCK, LANDINGS, LANDING_NEAR, MARINA_SPOT, PIER, PIER_TIP, PIER_TOP } from '../../world/lakeLayout';

/** boias de luz: perto da Ilha das Palmeiras, sobre o recife e perto da Ilha do Farol */
export const BUOYS = [
  { x: -56, z: -1 },
  { x: -54, z: 26 },
  { x: -82, z: 5 },
];

/** anéis de vento (impulso opcional): x, z e a direção (dx, dz) em que o barco passa por eles */
export const RINGS = [
  { x: -46, z: -4.5, dx: -1, dz: 0.3 },
  { x: -57, z: 9, dx: 0, dz: 1 },
  { x: -55.5, z: 17, dx: 0.1, dz: 1 },
  { x: -64, z: 22, dx: -1, dz: -0.5 },
  { x: -74, z: 14, dx: -1, dz: -0.8 },
  { x: -70, z: 2.5, dx: 1, dz: -0.3 },
  { x: -100, z: 4, dx: 0, dz: 1 },
  { x: -90, z: 29, dx: 1, dz: 0 },
];

/** ângulo do anel para ficar de frente para o barco */
export const ringYaw = (r: { dx: number; dz: number }) => Math.atan2(r.dx, r.dz);

/** velocidade do barco (m/s), impulso do anel, raio de colisão e de pegar a boia */
export const BOAT = { speed: 7.4, boost: 1.7, boostT: 1.6, accel: 2.0, radius: 1.4, pick: 2.6, turn: 3.2 };

/** meio comprimento e meia largura do casco do galeão */
export const HULL = { half: 3.1, side: 1.0 };

/** o casco cabe na água aqui, com a proa em ry? (centro, proa, popa e os dois lados precisam ter fundo) */
export function hullInWater(x: number, z: number, ry = 0) {
  const fx = Math.sin(ry),
    fz = Math.cos(ry);
  const pts: [number, number][] = [
    [0, 0],
    [HULL.half, 0],
    [-HULL.half, 0],
    [0, HULL.side],
    [0, -HULL.side],
  ];
  for (const [f, s] of pts) if (H(x + fx * f + fz * s, z + fz * f - fx * s) > WY - 0.45) return false;
  return true;
}
