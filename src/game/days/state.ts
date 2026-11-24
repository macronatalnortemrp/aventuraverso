/**
 * Estado dos Dias 3 a 7 (docs/DAYS_03_07.md): todos seguem o mesmo molde de etapas.
 * Puro e serializável, salvo a cada etapa.
 */
export const STEPS = ['start', 'skill', 'pedrito', 'globe', 'done'] as const;
export type Step = (typeof STEPS)[number];

export type DayKey = 'day03' | 'day04' | 'day05' | 'day06' | 'day07';
export const DAY_KEYS: DayKey[] = ['day03', 'day04', 'day05', 'day06', 'day07'];
export const dayKey = (n: number) => `day0${n}` as DayKey;

export interface DayState {
  step: Step;
  /** pedaços de luz achados no desafio de habilidade */
  got: number[];
  /** partes do desafio do Pedrito já feitas (bandeirinhas, aves...) */
  ped: number[];
  /** missão real opcional confirmada por um adulto */
  realMission: boolean;
}

export const newDay = (): DayState => ({ step: 'start', got: [], ped: [], realMission: false });
export const stepIndex = (s: Step) => STEPS.indexOf(s);

function advance(d: DayState): DayState {
  return { ...d, step: STEPS[Math.min(stepIndex(d.step) + 1, STEPS.length - 1)] };
}

/** Conclui a etapa atual, se for ela a esperada (ignora toques repetidos). */
export function complete(d: DayState, step: Step): DayState {
  return d.step === step ? advance(d) : d;
}

/** Pedaço de luz i do desafio de habilidade. Com todos (count), a etapa termina. */
export function foundPiece(d: DayState, i: number, count: number): DayState {
  if (d.step !== 'skill' || d.got.includes(i) || !Number.isInteger(i) || i < 0 || i >= count) return d;
  const n = { ...d, got: [...d.got, i] };
  return n.got.length === count ? advance(n) : n;
}

/** Parte i do desafio do Pedrito. Não avança sozinho: a missão conclui a etapa depois da conversa. */
export function pedPart(d: DayState, i: number, count: number): DayState {
  if (d.step !== 'pedrito' || d.ped.includes(i) || !Number.isInteger(i) || i < 0 || i >= count) return d;
  return { ...d, ped: [...d.ped, i] };
}

const ints = (a: unknown, max: number) => (Array.isArray(a) ? [...new Set(a.filter((n) => Number.isInteger(n) && n >= 0 && n < max))] : []);

/** Valida um save antigo ou corrompido. */
export function migrateDay(raw: unknown, count: number, pedCount: number): DayState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<DayState>;
  const step = STEPS.includes(r.step as Step) ? (r.step as Step) : 'start';
  const past = (s: Step) => stepIndex(step) > stepIndex(s);
  return {
    step,
    got: past('skill') ? Array.from({ length: count }, (_, i) => i) : ints(r.got, count),
    ped: past('pedrito') ? Array.from({ length: pedCount }, (_, i) => i) : ints(r.ped, pedCount),
    realMission: r.realMission === true,
  };
}

/** quantas peças e partes do Pedrito cada dia tem (o save e os testes usam o mesmo número) */
export const COUNTS: Record<DayKey, { pieces: number; ped: number }> = {
  day03: { pieces: 3, ped: 0 },
  day04: { pieces: 3, ped: 4 },
  day05: { pieces: 3, ped: 4 },
  day06: { pieces: 3, ped: 0 },
  day07: { pieces: 5, ped: 0 },
};
