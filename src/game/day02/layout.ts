/*
 * Lugares fixos do Dia 2 no lago (dados puros, testados em tests/day02.test.ts).
 * A ilha suspensa do Dia 1 ocupa o meio do lago: o barco contorna a ilha pelo canal em forma de C
 * a oeste, passando por baixo das mini ilhas mais altas.
 */
import { H, LAKE, WY } from '../../world/terrain';

/**
 * cais novo da Capitã Marina, na margem norte (longe das mini ilhas baixas, que ficam a leste e ao sul):
 * da terra (z1, mais ao norte) até a ponta sobre a água (z0)
 */
export const PIER = { x: -26.4, z0: -0.9, z1: -4.8, w: 2.1 };
/** onde a Capitã Marina espera, no começo do cais */
export const MARINA_SPOT = { x: -25.4, z: -4.6 };
/** onde o barco fica amarrado, ao lado da ponta do cais, com a proa para oeste */
export const BOAT_DOCK = { x: -28.7, z: -0.5, ry: -Math.PI / 2 };
/** onde a criança desce do barco (na ponta do cais) */
export const PIER_TIP = { x: PIER.x, z: PIER.z0 - 0.9 };

/** boias de luz: a primeira perto do cais, a segunda a oeste, a terceira ao sul, por baixo das mini ilhas */
export const BUOYS = [
  { x: -31.8, z: 0.9 },
  { x: -34.6, z: 6.2 },
  { x: -27.6, z: 13.3 },
];

/** anéis de vento (impulso opcional) ao longo do canal */
export const RINGS = [
  { x: -34.0, z: 3.0 },
  { x: -34.2, z: 9.6 },
  { x: -31.0, z: 12.7 },
  { x: -23.6, z: -0.4 },
];

/** direção do canal no ponto: tangente à volta do lago (para o anel ficar de frente para o barco) */
export const ringYaw = (x: number, z: number) => Math.atan2(x - LAKE.x, z - LAKE.z) + Math.PI / 2;

/** velocidade do barco (m/s), impulso do anel e raio do casco */
export const BOAT = { speed: 6.2, boost: 1.8, boostT: 1.6, accel: 2.4, radius: 1.0, pick: 2.1 };

/** o casco cabe na água aqui? (o centro e quatro pontas a meio metro precisam ter fundo) */
export function hullInWater(x: number, z: number) {
  const r = 0.5;
  for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (H(x + dx, z + dz) > WY - 0.45) return false;
  return true;
}
