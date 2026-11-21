import { Puzzle } from './beam';

/*
 * Os três desafios do Caminho da Luz, no topo da ilha (u, v de -4,6 a 4,6; v negativo = lado da subida).
 * Cada um tem solução com espelhos em múltiplos de 15° e exige exatamente 1, 2 e 3 espelhos
 * (verificado em tests/light.test.ts por busca em todas as combinações).
 */
export const PUZZLES: Puzzle[] = [
  // 1. O primeiro reflexo: fonte → espelho → cristal
  {
    source: { u: -3.8, v: -2.6, dir: 0 },
    supports: [{ u: 2.4, v: -2.6 }],
    blocks: [],
    receiver: { u: 2.4, v: 3.2 },
    solution: [45],
  },
  // 2. Encontre o caminho: uma pedra entre a fonte e o cristal; dois espelhos contornam
  {
    source: { u: -3.8, v: -2.6, dir: 0 },
    supports: [
      { u: 1.8, v: -2.6 },
      { u: 1.8, v: 2.8 },
    ],
    blocks: [
      { u: -3.0, v: 0.2, hu: 1.0, hv: 0.7 },
      { u: -0.6, v: 0.2, hu: 0.7, hv: 0.7 },
    ],
    receiver: { u: -3.4, v: 2.8 },
    solution: [45, 135],
  },
  // 3. O caminho completo: cristal no centro, cercado de pedras; três espelhos
  {
    source: { u: -3.9, v: -3.6, dir: 0 },
    supports: [
      { u: 3.4, v: -3.6 },
      { u: 3.4, v: 3.4 },
      { u: 0, v: 3.4 },
    ],
    blocks: [
      { u: 1.4, v: -1.3, hu: 0.6, hv: 0.6 },
      { u: 1.4, v: 1.3, hu: 0.6, hv: 0.6 },
      { u: -1.5, v: -0.2, hu: 0.6, hv: 1.2 },
      { u: 0, v: -1.7, hu: 0.8, hv: 0.45 },
    ],
    receiver: { u: 0, v: 0 },
    solution: [45, 135, 45],
  },
];
