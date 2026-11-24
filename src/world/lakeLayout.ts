/*
 * Lugares fixos do Lago Grande (dados puros, sem Three.js: testados em tests/lake.test.ts e tests/day02.test.ts).
 * O cais da Capitã Marina fica na margem nordeste do Lago Grande, no fim da Trilha da Praia.
 */
import { LIGHT_ISLE, PALM_ISLE } from './terrain';

/** cais: da terra (x0, a leste) até a ponta sobre a água (x1, a oeste), na linha z */
export const PIER = { x0: -30.6, x1: -40.4, z: -10, w: 2.1 };
/** altura do piso do cais */
export const PIER_TOP = 0.13;
/** onde o barco fica amarrado: ao sul do cais, com a proa para oeste */
export const BOAT_DOCK = { x: -37, z: -7.2, ry: -Math.PI / 2 };
/** onde a Capitã Marina espera, no começo do cais */
export const MARINA_SPOT = { x: -31.4, z: -11.7 };
/** onde a criança desce (na ponta do cais) */
export const PIER_TIP = { x: -38.4, z: -10 };

export interface Landing {
  id: 'pier' | 'palm' | 'light';
  name: string;
  /** onde o barco para */
  boat: { x: number; z: number; ry: number };
  /** onde a criança pisa */
  land: { x: number; z: number };
}

/** lugares onde dá para descer do barco */
export const LANDINGS: Landing[] = [
  { id: 'pier', name: 'cais', boat: BOAT_DOCK, land: PIER_TIP },
  { id: 'palm', name: 'Ilha das Palmeiras', boat: { x: PALM_ISLE.x, z: PALM_ISLE.z + 10.6, ry: Math.PI / 2 }, land: { x: PALM_ISLE.x, z: PALM_ISLE.z + 5.4 } },
  { id: 'light', name: 'Ilha do Farol', boat: { x: LIGHT_ISLE.x + 9.2, z: LIGHT_ISLE.z + 1, ry: 0 }, land: { x: LIGHT_ISLE.x + 4.4, z: LIGHT_ISLE.z + 1 } },
];

/** o barco perto deste ponto mostra o botão de descer */
export const LANDING_NEAR = 4.5;

/** Farol: torre listrada no meio da ilha, com degraus em volta para subir pulando */
export const LIGHTHOUSE = { x: LIGHT_ISLE.x - 0.6, z: LIGHT_ISLE.z - 0.4, r: 1.5, h: 9 };
/** degraus em espiral em volta do farol: [ângulo, altura do piso acima do chão] */
export const LIGHT_STEPS: [number, number][] = Array.from({ length: 9 }, (_, i) => [0.4 + i * 0.78, 0.9 + i * 0.95]);
/** distância dos degraus até o centro do farol */
export const LIGHT_STEP_R = 3.0;
