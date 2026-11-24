/**
 * Etapas do Dia 2 (docs/DAY_02.md): o Céu e as Águas. Estado puro e serializável, salvo a cada etapa.
 */
export const STEPS = ['mist', 'boat', 'waters', 'vow', 'globe', 'done'] as const;
export type Step = (typeof STEPS)[number];

/** boias de luz no lago (cada uma guarda um pedaço de luz) */
export const BUOY_COUNT = 3;
/** anéis de vento: passar por eles dá um impulso ao barco (opcionais, não contam para avançar) */
export const RING_COUNT = 5;

export interface Day02 {
  step: Step;
  /** pedaços de luz achados nas boias (índices 0..2) */
  buoys: number[];
  /** missão real opcional confirmada por um adulto */
  realMission: boolean;
}

export const newDay02 = (): Day02 => ({ step: 'mist', buoys: [], realMission: false });

export const stepIndex = (s: Step) => STEPS.indexOf(s);

/** Quanto de névoa ainda cobre o acampamento (1 = toda, 0 = céu limpo). Cada boia tira um pouco; o Globo tira o resto. */
export function mistLevel(d: Day02) {
  if (d.step === 'done') return 0;
  if (stepIndex(d.step) > stepIndex('boat')) return 0.35;
  return 1 - d.buoys.length * 0.2;
}

function advance(d: Day02): Day02 {
  return { ...d, step: STEPS[Math.min(stepIndex(d.step) + 1, STEPS.length - 1)] };
}

/** Conclui a etapa atual, se for ela a esperada (ignora toques repetidos). */
export function complete(d: Day02, step: Step): Day02 {
  return d.step === step ? advance(d) : d;
}

/** Pedaço de luz da boia i. Com os três, a etapa do barco termina. */
export function foundBuoy(d: Day02, i: number): Day02 {
  if (d.step !== 'boat' || d.buoys.includes(i) || !Number.isInteger(i) || i < 0 || i >= BUOY_COUNT) return d;
  const n = { ...d, buoys: [...d.buoys, i] };
  return n.buoys.length === BUOY_COUNT ? advance(n) : n;
}

/** Valida um save antigo ou corrompido. */
export function migrateDay02(raw: unknown): Day02 | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = newDay02();
  const r = raw as Partial<Day02>;
  const step = STEPS.includes(r.step as Step) ? (r.step as Step) : d.step;
  const buoys = Array.isArray(r.buoys) ? [...new Set(r.buoys.filter((n) => Number.isInteger(n) && n >= 0 && n < BUOY_COUNT))] : [];
  return { step, buoys: stepIndex(step) > stepIndex('boat') ? [0, 1, 2] : buoys, realMission: r.realMission === true };
}
