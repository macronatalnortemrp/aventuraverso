/**
 * Tempos da ajuda de orientação (docs/JOGABILIDADE_REFERENCIA.md, seção 3.5).
 * A coluna de luz fica sempre sobre o objetivo; a trilha, a bússola e a oferta de levar só vêm quando a
 * criança toca na bússola (decisão de 23/11/2026). Com o tempo parado, estes níveis só fazem a bússola pulsar
 * e o Tico acenar. Encurtados no piloto (21/11/2026): uma criança de 5 anos se perdeu esperando a ajuda.
 */
export const GUIDANCE = {
  /** a bússola começa a pulsar e o Tico acena */
  level1: 20,
  /** (sem efeito na tela; mantido para o relógio da ajuda) */
  level2: 40,
  /** (idem) */
  level3: 90,
  /** "Agora não" adia por este tempo */
  snooze: 120,
  /** chegar este tanto mais perto do objetivo conta como progresso (m) */
  progressStep: 2,
  /** perto assim do objetivo, a ajuda some (m) */
  arrived: 6,
};

/** Fôlego debaixo d'água (segundos), tempo para recarregar na superfície e fora d'água. */
export const BREATH = { seconds: 20, refill: 2.5, refillLand: 0.8 };
