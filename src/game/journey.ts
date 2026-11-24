import { Day01 } from './day01/state';
import { Day02 } from './day02/state';
import { DayState } from './days/state';

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
  { n: 2, title: 'O Céu e as Águas', ready: true },
  { n: 3, title: 'A Terra e as Plantas', ready: true },
  { n: 4, title: 'Sol, Lua e Estrelas', ready: true },
  { n: 5, title: 'Peixes e Aves', ready: true },
  { n: 6, title: 'Animais e Pessoas', ready: true },
  { n: 7, title: 'O Descanso', ready: true },
];

/** done: concluído · playing: começado · next: pode começar · soon: liberado, mas ainda em construção · locked: termine o anterior */
export type DayStatus = 'done' | 'playing' | 'next' | 'soon' | 'locked';

export interface JourneyEntry extends EdenDay {
  status: DayStatus;
}

export interface Progress {
  day01: Day01 | null;
  day02?: Day02 | null;
  day03?: DayState | null;
  day04?: DayState | null;
  day05?: DayState | null;
  day06?: DayState | null;
  day07?: DayState | null;
}

const later = (p: Progress, n: number) => (n >= 3 && n <= 7 ? p[`day0${n}` as 'day03'] : undefined);

export function dayDone(p: Progress, n: number) {
  if (n === 1) return p.day01?.step === 'done';
  if (n === 2) return p.day02?.step === 'done';
  return later(p, n)?.step === 'done';
}

function dayStarted(p: Progress, n: number) {
  if (n === 1) return !!p.day01 && p.day01.step !== 'lantern' && p.day01.step !== 'done';
  if (n === 2) return !!p.day02 && p.day02.step !== 'mist' && p.day02.step !== 'done';
  const d = later(p, n);
  return !!d && d.step !== 'start' && d.step !== 'done';
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
