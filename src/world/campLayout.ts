/*
 * Lugares fixos do acampamento usados também pelos dias (dados puros, sem three.js, testáveis no Node).
 */

export const OBSERVATORY = { x: 24, z: -22 };
/** Degraus do observatório: [dx, dz, altura] */
export const OBS_STEPS: [number, number, number][] = [
  [-6, 3, 1],
  [-6, 1, 2],
  [-6, -1, 3],
  [-3.4, 0, 4],
];

/** Mastro da bandeira do Clube. */
export const FLAG = { x: 9, z: 8 };

/** Tenda da classe i (0 a 3) na Clareira. */
export function tentSpot(i: number) {
  const a = -0.95 + i * 0.633;
  return { x: Math.sin(a) * 12.5, z: 2 - Math.cos(a) * 12.5, a };
}
