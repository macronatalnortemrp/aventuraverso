import { clamp, lerp, sm } from '../engine/math';

/** Lago, Colina do Globo, nível da água e limite do acampamento (unidades = metros). */
export const LAKE = { x: -27, z: 6, r: 10 };
export const HILL = { x: 0, z: -31 };
/** altura da superfície da água */
export const WY = -0.32;
/** abaixo desta altura do fundo o personagem nada */
export const SURF = -1.25;
/** raio do acampamento */
export const EDGE = 40;

/** Trilhas de terra: [x1, z1, x2, z2] */
export const PATHS: [number, number, number, number][] = [
  [0, 40, 0, 6],
  [0, -5, 0, -26],
  [-5, 3, -16, 6],
  [5, 3, 18, 7],
  [6, -7, 21, -19],
];

export function segD(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax,
    dz = bz - az,
    t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

/** distância até a trilha mais próxima */
export function pathD(x: number, z: number) {
  let d = 1e9;
  for (const p of PATHS) d = Math.min(d, segD(x, z, ...p));
  return d;
}

/** Altura do terreno: ondulação suave, clareira plana, colina, bacia do lago e borda elevada. */
export function H(x: number, z: number) {
  let n =
    0.32 * Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17) +
    0.22 * Math.sin(x * 0.07 - z * 0.11 + 0.5) +
    0.12 * Math.sin(x * 0.5 + z * 0.43);
  n *= sm(9, 19, Math.hypot(x, z - 1)) * sm(1, 3.5, pathD(x, z));
  let h = n + 3.3 * (1 - sm(8, 14, Math.hypot(x - HILL.x, z - HILL.z)));
  const dl = Math.hypot(x - LAKE.x, (z - LAKE.z) * 1.12);
  h = lerp(h, -3.1, 1 - sm(LAKE.r - 4.5, LAKE.r + 1.2, dl));
  h += sm(EDGE - 2, EDGE + 10, Math.hypot(x, z)) * 6;
  return h;
}

/** água funda o bastante para nadar */
export const isDeep = (x: number, z: number) => H(x, z) < SURF;
