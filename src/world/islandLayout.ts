/*
 * Desenho fixo da ilha suspensa do Caminho da Luz (dados puros, sem Three.js: testados em tests/island.test.ts).
 * O mesmo percurso nos três desafios.
 */

import { H } from './terrain';

/**
 * Centro da ilha: sobre o lago (a área do acampamento sem árvores, tendas nem murais num raio de ~11).
 * A partida fica em terra firme, a leste; o percurso sobe pelo norte e chega ao topo pelo oeste.
 * Quem cai das plataformas cai na água: sem punição.
 */
export const ISLAND = { x: -23, z: 6 };
/** meia largura do topo */
export const TOP_HALF_W = 4.6;
/** ângulo da partida: o último salto chega ao topo exatamente pelo oeste */
const START_A = Math.PI - 8 * 0.45;
/** subida por salto (o pulo alcança ~2) */
const RISE = 0.95;

export interface Step {
  x: number;
  z: number;
  /** largura e profundidade */
  w: number;
  d: number;
  /** altura do piso */
  y: number;
}

/**
 * Percurso: plataforma de partida no chão (sobe sem pular), oito mini ilhas subindo ~0,95 por salto,
 * vãos de 1,1 a 1,8 (o pulo alcança ~2 de altura e ~4,5 de distância), duas maiores para descansar.
 */
export const STEPS: Step[] = (() => {
  const s: Step[] = [];
  const at = (a: number, r: number) => ({ x: ISLAND.x + Math.cos(a) * r, z: ISLAND.z + Math.sin(a) * r });
  const p0 = at(START_A, 10);
  // degrau baixo sobre o chão: sobe andando
  const y0 = H(p0.x, p0.z) + 0.3;
  s.push({ ...p0, w: 3.4, d: 3.4, y: y0 });
  for (let i = 1; i <= 8; i++) {
    const big = i === 4 || i === 8;
    s.push({ ...at(START_A + i * 0.45, 8.3), w: big ? 3 : 2.4, d: big ? 3 : 2.4, y: y0 + i * RISE });
  }
  return s;
})();

/** altura do piso do topo */
export const TOP_Y = STEPS[STEPS.length - 1].y + RISE;

/** Coordenadas locais do puzzle (u, v) para o mundo: v aponta para leste; quem chega ao topo vem do oeste (v = -4,6). */
export const toWorld = (u: number, v: number) => ({ x: ISLAND.x + v, z: ISLAND.z - u });

/** onde o percurso chega ao topo: a passagem na borda oeste fica alinhada com a última mini ilha */
export const ARRIVAL_Z = STEPS[STEPS.length - 1].z;
