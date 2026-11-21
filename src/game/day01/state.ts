/**
 * Etapas do Dia 1 (docs/DAY_01.md). Estado puro e serializável: o jogo salva a cada etapa
 * e retoma de onde a criança parou.
 */
export const STEPS = ['lantern', 'sparks', 'pedrito', 'letThereBeLight', 'dayNight', 'invites', 'globe', 'done'] as const;
export type Step = (typeof STEPS)[number];

export const SPARK_COUNT = 3;
export const INVITE_COUNT = 3;

export interface Day01 {
  step: Step;
  /** faíscas encontradas (índices 0..2: sino, água, grilo) */
  sparks: number[];
  /** convites pendurados (índices dos murais) */
  invites: number[];
  /** missão real opcional confirmada por um adulto */
  realMission: boolean;
  /** Caminho da Luz: acampante (mural) cujo desafio está em andamento, ou null */
  challenge: number | null;
}

export const newDay01 = (): Day01 => ({ step: 'lantern', sparks: [], invites: [], realMission: false, challenge: null });

export const stepIndex = (s: Step) => STEPS.indexOf(s);
export const isNight = (d: Day01) => stepIndex(d.step) < stepIndex('dayNight');

function advance(d: Day01): Day01 {
  return { ...d, step: STEPS[Math.min(stepIndex(d.step) + 1, STEPS.length - 1)] };
}

/** Conclui a etapa atual, se for ela a esperada (ignora toques repetidos). */
export function complete(d: Day01, step: Step): Day01 {
  return d.step === step ? advance(d) : d;
}

export function foundSpark(d: Day01, i: number): Day01 {
  if (d.step !== 'sparks' || d.sparks.includes(i) || i < 0 || i >= SPARK_COUNT) return d;
  const n = { ...d, sparks: [...d.sparks, i] };
  return n.sparks.length === SPARK_COUNT ? advance(n) : n;
}

/** A criança aceitou o desafio do acampante i (um por vez). */
export function acceptChallenge(d: Day01, i: number): Day01 {
  if (d.step !== 'invites' || d.challenge !== null || d.invites.includes(i) || i < 0 || i >= INVITE_COUNT) return d;
  return { ...d, challenge: i };
}

/** Desafio concluído: o acampante aceita o convite, que é pendurado no mural dele. */
export function hungInvite(d: Day01, i: number): Day01 {
  if (d.step !== 'invites' || d.invites.includes(i) || i < 0 || i >= INVITE_COUNT) return d;
  const n = { ...d, invites: [...d.invites, i], challenge: null };
  return n.invites.length === INVITE_COUNT ? advance(n) : n;
}

/** Valida um save antigo ou corrompido. */
export function migrateDay01(raw: unknown): Day01 {
  const d = newDay01();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<Day01>;
  const ints = (a: unknown, max: number) => (Array.isArray(a) ? [...new Set(a.filter((n) => Number.isInteger(n) && n >= 0 && n < max))] : []);
  const step = STEPS.includes(r.step as Step) ? (r.step as Step) : d.step;
  const invites = ints(r.invites, INVITE_COUNT);
  const ch = r.challenge;
  const challenge = step === 'invites' && Number.isInteger(ch) && (ch as number) >= 0 && (ch as number) < INVITE_COUNT && !invites.includes(ch as number) ? (ch as number) : null;
  return { step, sparks: ints(r.sparks, SPARK_COUNT), invites, realMission: r.realMission === true, challenge };
}
