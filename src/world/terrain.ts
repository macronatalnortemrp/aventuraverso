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

/** Elipse: centro e raios (metros). */
export interface Ell {
  x: number;
  z: number;
  rx: number;
  rz: number;
}
/** Lago Grande, a oeste do acampamento: a enseada da ilha suspensa (LAKE) se abre para ele. */
export const BIG: Ell = { x: -70, z: 4, rx: 40, rz: 37 };
/** limite do mundo em volta do Lago Grande: praia e mata na margem */
export const SHORE: Ell = { x: -70, z: 4, rx: 49, rz: 46 };
/** ilhas do Lago Grande: r = raio do topo, h = altura do topo */
export const PALM_ISLE = { x: -62, z: -15, r: 6.5, h: 1.1 };
export const LIGHT_ISLE = { x: -92, z: 16, r: 5.5, h: 1.6 };
export const ISLES = [PALM_ISLE, LIGHT_ISLE];
/** recife de coral: fundo raso e água clara, para ver do barco e mergulhar */
export const REEF = { x: -50, z: 20, r: 8 };
/** paredão da cachoeira, na margem oeste */
export const FALLS = { x: -112, z: 2 };

/** distância aproximada (m) até a borda da elipse: negativa dentro */
export function ellD(x: number, z: number, e: Ell) {
  return (Math.hypot((x - e.x) / e.rx, (z - e.z) / e.rz) - 1) * Math.min(e.rx, e.rz);
}

/** distância (m) para fora da área de jogo (acampamento + margem do Lago Grande): negativa dentro */
export function worldOut(x: number, z: number) {
  return Math.min(Math.hypot(x, z) - EDGE, ellD(x, z, SHORE));
}

/** Trilhas de terra: [x1, z1, x2, z2] */
export const PATHS: [number, number, number, number][] = [
  [0, 40, 0, 6],
  [0, -5, 0, -26],
  [-5, 3, -16, 6],
  [5, 3, 18, 7],
  [6, -7, 21, -19],
  [-12, -1, -30, -11],
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
  // Lago Grande: fundo que desce longe da margem e sobe no recife
  const inBig = -ellD(x, z, BIG);
  if (inBig > -2) {
    let floor = lerp(-3.1, -4.4, sm(6, 18, inBig));
    const dr = Math.hypot(x - REEF.x, z - REEF.z);
    floor = lerp(floor, -2.35 + 0.18 * Math.sin(x * 0.8) * Math.cos(z * 0.7), 1 - sm(REEF.r - 2, REEF.r + 5, dr));
    h = lerp(h, floor, sm(-1.5, 6, inBig));
  }
  // ilhas: topo baixo de grama e praia em volta
  for (const i of ISLES) {
    const di = Math.hypot(x - i.x, z - i.z);
    if (di > i.r + 4) continue;
    const top = i.h + 0.7 * (1 - sm(0, i.r - 1, di));
    h = lerp(h, top, 1 - sm(i.r - 1.5, i.r + 3.5, di));
  }
  h += sm(-2, 10, worldOut(x, z)) * 6;
  // paredão da cachoeira, a oeste
  const cz = Math.abs(z - FALLS.z);
  if (x < FALLS.x + 4 && cz < 34) h += 9 * sm(FALLS.x + 3, FALLS.x - 2, x) * (1 - sm(16, 32, cz));
  return h;
}

/** água funda o bastante para nadar */
export const isDeep = (x: number, z: number) => H(x, z) < SURF;
