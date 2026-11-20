import { Day01 } from './day01/state';

/**
 * Jornada do Éden: os sete dias do Mundo 1. A criança pode jogar quantos dias quiser, quando quiser;
 * o ritmo sugerido é um por dia, mas nada é bloqueado por relógio.
 */
export interface EdenDay {
  n: number;
  title: string;
  /** já existe no jogo */
  ready: boolean;
}

export const EDEN_DAYS: EdenDay[] = [
  { n: 1, title: 'A Luz no Acampamento', ready: true },
  { n: 2, title: 'Dia 2', ready: false },
  { n: 3, title: 'Dia 3', ready: false },
  { n: 4, title: 'Dia 4', ready: false },
  { n: 5, title: 'Dia 5', ready: false },
  { n: 6, title: 'Dia 6', ready: false },
  { n: 7, title: 'Dia 7', ready: false },
];

/** done: concluído · playing: começado · next: pode começar · soon: liberado, mas ainda em construção · locked: termine o anterior */
export type DayStatus = 'done' | 'playing' | 'next' | 'soon' | 'locked';

export interface JourneyEntry extends EdenDay {
  status: DayStatus;
}

export interface Progress {
  day01: Day01 | null;
}

export function dayDone(p: Progress, n: number) {
  return n === 1 ? p.day01?.step === 'done' : false;
}

function dayStarted(p: Progress, n: number) {
  return n === 1 ? !!p.day01 && p.day01.step !== 'lantern' && p.day01.step !== 'done' : false;
}

export function journey(p: Progress, days = EDEN_DAYS): JourneyEntry[] {
  return days.map((d, i) => {
    const prevDone = i === 0 || dayDone(p, days[i - 1].n);
    let status: DayStatus;
    if (dayDone(p, d.n)) status = 'done';
    else if (!prevDone) status = 'locked';
    else if (!d.ready) status = 'soon';
    else status = dayStarted(p, d.n) ? 'playing' : 'next';
    return { ...d, status };
  });
}

/** Quantos dias concluídos e se o portal do próximo mundo abre (todos os sete). */
export function worldProgress(p: Progress, days = EDEN_DAYS) {
  const done = days.filter((d) => dayDone(p, d.n)).length;
  return { done, total: days.length, nextWorldOpen: done === days.length };
}
