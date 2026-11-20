/**
 * Tempos da ajuda de orientação (docs/JOGABILIDADE_REFERENCIA.md, seção 3.5).
 * Valores iniciais, a calibrar no piloto.
 */
export const GUIDANCE = {
  /** brilho mais forte e fala do Tico */
  level1: 45,
  /** bússola e trilha de faíscas */
  level2: 90,
  /** Tico oferece levar até o portal */
  level3: 150,
  /** "Agora não" adia por este tempo */
  snooze: 120,
  /** chegar este tanto mais perto do objetivo conta como progresso (m) */
  progressStep: 2,
  /** perto assim do objetivo, a ajuda some (m) */
  arrived: 6,
};

/** Fôlego debaixo d'água (segundos) e tempo para recarregar na superfície. */
export const BREATH = { seconds: 20, refill: 2.5 };
