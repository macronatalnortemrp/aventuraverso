/**
 * Tempos da ajuda de orientação (docs/JOGABILIDADE_REFERENCIA.md, seção 3.5).
 * Na missão, a coluna de luz e a trilha já aparecem desde o começo; estes níveis só reforçam.
 * Encurtados no piloto (21/11/2026): uma criança de 5 anos se perdeu esperando a ajuda.
 */
export const GUIDANCE = {
  /** brilho mais forte e fala do Tico */
  level1: 20,
  /** bússola e trilha de faíscas */
  level2: 40,
  /** Tico oferece levar até o portal */
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
