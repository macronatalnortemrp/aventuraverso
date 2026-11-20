import { GUIDANCE } from '../config/guidance';

export interface GuideState {
  /** segundos sem progresso */
  t: number;
  /** nível de ajuda já mostrado (0 a 3) */
  lvl: number;
  /** menor distância ao objetivo já alcançada */
  best: number;
  /** segundos restantes de adiamento ("Agora não") */
  snooze: number;
}

export const newGuide = (): GuideState => ({ t: 0, lvl: 0, best: 1e9, snooze: 0 });

/** Algo aconteceu (moeda, conversa, etapa): o contador volta a zero. */
export function guideProgress(g: GuideState) {
  g.t = 0;
}

export function guideReset(g: GuideState) {
  g.t = 0;
  g.lvl = 0;
  g.best = 1e9;
}

/** A criança respondeu "Agora não". */
export function guideSnooze(g: GuideState) {
  g.t = 0;
  g.lvl = Math.min(g.lvl, 2);
  g.snooze = GUIDANCE.snooze;
}

/**
 * Avança o relógio da ajuda. Devolve os níveis alcançados neste passo
 * e se o jogador chegou ao objetivo (a ajuda deve sumir).
 */
export function guideStep(g: GuideState, dt: number, dist: number): { levels: number[]; arrived: boolean } {
  const levels: number[] = [];
  if (dist < g.best - GUIDANCE.progressStep) {
    g.best = dist;
    g.t = 0;
  }
  if (g.snooze > 0) g.snooze -= dt;
  else {
    g.t += dt;
    const marks = [GUIDANCE.level1, GUIDANCE.level2, GUIDANCE.level3];
    marks.forEach((m, i) => {
      if (g.t > m && g.lvl < i + 1) {
        g.lvl = i + 1;
        levels.push(i + 1);
      }
    });
  }
  const arrived = dist < GUIDANCE.arrived && g.lvl > 0;
  if (arrived) g.lvl = 0;
  return { levels, arrived };
}
