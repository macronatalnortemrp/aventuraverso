/*
 * Lugares fixos dos Dias 3 a 7 (dados puros, testados em tests/days.test.ts).
 */
import { H, REEF } from '../../world/terrain';
import { OBSERVATORY } from '../../world/campLayout';
import { LIGHTHOUSE } from '../../world/lakeLayout';
import { PALM_ISLE } from '../../world/terrain';

export interface Spot {
  x: number;
  z: number;
  ry?: number;
}
export interface P3 {
  x: number;
  y: number;
  z: number;
}

/* ---------- Dia 3: Horta da Dona Flora (entre o lago pequeno e o portão) ---------- */
export const HORTA = { x: -15, z: 16 };
/** canteiros (centro) */
export const BEDS: Spot[] = [
  { x: -18, z: 15 },
  { x: -15, z: 15 },
  { x: -12, z: 15 },
];
export const BASKET: Spot = { x: -15.5, z: 19 };
export const WELL: Spot = { x: -20.5, z: 18.5 };
export const FLORA_SPOT: Spot = { x: -12, z: 19.6, ry: Math.PI * 0.85 };
/** pedaço de luz que aparece sobre o canteiro regado */
export const bedLight = (i: number, bob = 0): P3 => ({ x: BEDS[i].x, y: H(BEDS[i].x, BEDS[i].z) + 1.6 + bob, z: BEDS[i].z + 1.9 });

/* ---------- Dia 4: Observatório e degraus de luz ---------- */
export const ESTRELINO_SPOT: Spot = { x: 19.5, z: -19.5, ry: -2.2 };
/** escuro do céu sem os luminares (0 dia, 1 noite total) */
export const DIM = 0.62;
/** terraço do Observatório (world/camp.ts: plataforma a 5,22 acima do chão) */
export const OBS_TOP = H(OBSERVATORY.x, OBSERVATORY.z) + 5.22;
/** metade do terraço */
export const OBS_HALF = 2.1;
/** degraus de luz: [dx, dz] a partir do centro do Observatório e altura acima do terraço */
export const STAR_STEPS: { dx: number; dz: number; up: number }[][] = [
  [{ dx: 0, dz: 3.6, up: 1.5 }, { dx: 0, dz: 6.4, up: 4.3 }],
  [{ dx: 0, dz: -3.6, up: 1.5 }, { dx: 0, dz: -6.4, up: 4.3 }],
  [{ dx: 3.6, dz: 0, up: 1.5 }, { dx: 6.4, dz: 0, up: 4.3 }],
];
export const STEP_W = 1.9;
/** a estrela fica acima do último degrau */
export const STAR_ABOVE = 1.6;
export function starSpot(i: number, bob = 0): P3 {
  const last = STAR_STEPS[i][STAR_STEPS[i].length - 1];
  return { x: OBSERVATORY.x + last.dx, y: OBS_TOP + last.up + STAR_ABOVE + bob, z: OBSERVATORY.z + last.dz };
}

/* ---------- Dia 5: recife e praia ---------- */
/** a Capitã Marina espera na praia do recife (o cais fica vazio neste dia) */
export const MARINA_BEACH: Spot = { x: -30.5, z: 22, ry: -Math.PI / 2 };
/** pedaços de luz no fundo do recife: [dx, dz] a partir do centro */
export const DIVE_SPOTS: [number, number][] = [
  [-2.5, 0],
  [2.5, -5],
  [5, 2.5],
];
/** acima do fundo */
export const DIVE_LIFT = 0.6;
export function diveSpot(i: number): P3 {
  const [dx, dz] = DIVE_SPOTS[i],
    x = REEF.x + dx,
    z = REEF.z + dz;
  return { x, y: H(x, z) + DIVE_LIFT, z };
}
/** poleiros do safári das aves */
export const PERCHES: Spot[] = [
  { x: -27, z: 26 },
  { x: -31, z: 30 },
  { x: -22, z: 20 },
  { x: -25, z: 31 },
];

/* ---------- Dia 6: cercados do Tio Zé Bichos ---------- */
export const ZE_SPOT: Spot = { x: -18, z: -14.5, ry: 0.4 };
export interface Animal {
  id: string;
  /** cercado */
  pen: Spot;
  /** onde ele passeia antes de ser levado */
  home: Spot;
}
export const ANIMALS: Animal[] = [
  { id: 'sheep', pen: { x: -14, z: -17 }, home: { x: -10.5, z: -11 } },
  { id: 'cow', pen: { x: -19, z: -23.5 }, home: { x: -22, z: -6.5 } },
  { id: 'goat', pen: { x: -24, z: -17.5 }, home: { x: -8.5, z: -14 } },
];
/** raio do cercado (o animal entra e fica) */
export const PEN_R = 2;
/** Mesa da Família (world/camp.ts) */
export const TABLE = { x: -9, z: 8 };

/* ---------- Dia 7: trilha da semana ---------- */
/** onde a Diretora Cecília fica no acampamento (main.ts) */
export const SOL_SPOT: Spot = { x: 6.5, z: 5.5 };
export function trailSpots(): P3[] {
  const lhTop = H(LIGHTHOUSE.x, LIGHTHOUSE.z) + LIGHTHOUSE.h + 0.3;
  const b = bedLight(1);
  const d = diveSpot(1);
  return [
    { x: LIGHTHOUSE.x + 1.55, y: lhTop + 1.1, z: LIGHTHOUSE.z + 1.55 }, // o farol do lago
    { x: OBSERVATORY.x - 1, y: OBS_TOP + 1.1, z: OBSERVATORY.z - 1 }, // alto do Observatório
    d, // fundo do recife
    { x: b.x, y: b.y - 0.1, z: b.z }, // horta
    { x: PALM_ISLE.x + 1.5, y: H(PALM_ISLE.x + 1.5, PALM_ISLE.z) + 1.4, z: PALM_ISLE.z }, // ilha das palmeiras
  ];
}
