import { Day01, migrateDay01 } from '../game/day01/state';
import { Day02, migrateDay02 } from '../game/day02/state';
import { COUNTS, DayState, migrateDay } from '../game/days/state';

/**
 * Progresso local e versionado. Nada sai do aparelho.
 * Se o armazenamento não existir (modo privado, iframe), o jogo segue sem salvar.
 */
export const SAVE_KEY = 'aventuraverso.save';
export const SAVE_VERSION = 6;

/** Respostas da criança na tela de feedback do piloto (docs/PILOT_FEEDBACK.md). */
export interface DayFeedback {
  mood: 'great' | 'ok' | 'bad' | null;
  liked: string[];
  wantsNext: boolean | null;
}

export interface SaveData {
  v: number;
  avatar: number;
  controls: boolean;
  sound: boolean;
  coins: number[];
  /** Dia 1 em andamento ou concluído */
  day01: Day01 | null;
  /** Dia 2 em andamento ou concluído */
  day02: Day02 | null;
  /** Dias 3 a 7 (mesmo molde de etapas, docs/DAYS_03_07.md) */
  day03: DayState | null;
  day04: DayState | null;
  day05: DayState | null;
  day06: DayState | null;
  day07: DayState | null;
  /** Distintivos do Acampamento (não oficiais) */
  badges: string[];
  feedback: Record<string, DayFeedback>;
  /** apelido que a criança deu ao personagem (só neste aparelho; vazio = "Aventureiro/Aventureira") */
  nick: string;
  /** já assistiu à abertura narrada */
  introSeen: boolean;
  /** já viu o tutorial dos botões e movimentos (aparece uma vez, antes do Dia 1) */
  tutorialSeen: boolean;
  /** trilha sonora ligada (independente do som das vozes e efeitos) */
  music: boolean;
}

export const NICK_MAX = 14;
/** Só letras, números, espaço, hífen e apóstrofo; sem espaços sobrando; no máximo NICK_MAX caracteres. */
export function cleanNick(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} '\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICK_MAX)
    .trim();
}

export const defaults = (): SaveData => ({ v: SAVE_VERSION, avatar: 0, controls: false, sound: true, coins: [], day01: null, day02: null, day03: null, day04: null, day05: null, day06: null, day07: null, badges: [], feedback: {}, nick: '', introSeen: false, tutorialSeen: false, music: true });

type KV = Pick<Storage, 'getItem' | 'setItem'>;

function safeStorage(): KV | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const MOODS = ['great', 'ok', 'bad'];

/** Migra saves antigos (v1 não tinha dias, distintivos nem feedback; v2 não tinha apelido nem abertura; v3 não tinha a música; v4 não tinha o Dia 2; v5 não tinha os Dias 3 a 7) para a versão atual. */
export function migrate(raw: unknown): SaveData {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<SaveData>;
  const feedback: Record<string, DayFeedback> = {};
  if (r.feedback && typeof r.feedback === 'object') {
    for (const [k, f] of Object.entries(r.feedback)) {
      if (!/^day\d\d$/.test(k) || !f || typeof f !== 'object') continue;
      feedback[k] = {
        mood: MOODS.includes(f.mood as string) ? f.mood : null,
        liked: Array.isArray(f.liked) ? f.liked.filter((x) => typeof x === 'string').slice(0, 2) : [],
        wantsNext: typeof f.wantsNext === 'boolean' ? f.wantsNext : null,
      };
    }
  }
  return {
    v: SAVE_VERSION,
    avatar: Number.isInteger(r.avatar) && (r.avatar as number) >= 0 && (r.avatar as number) < 6 ? (r.avatar as number) : d.avatar,
    controls: typeof r.controls === 'boolean' ? r.controls : d.controls,
    sound: typeof r.sound === 'boolean' ? r.sound : d.sound,
    coins: Array.isArray(r.coins) ? r.coins.filter((n) => Number.isInteger(n) && n >= 0) : [],
    day01: r.day01 ? migrateDay01(r.day01) : null,
    day02: migrateDay02(r.day02),
    day03: migrateDay(r.day03, COUNTS.day03.pieces, COUNTS.day03.ped),
    day04: migrateDay(r.day04, COUNTS.day04.pieces, COUNTS.day04.ped),
    day05: migrateDay(r.day05, COUNTS.day05.pieces, COUNTS.day05.ped),
    day06: migrateDay(r.day06, COUNTS.day06.pieces, COUNTS.day06.ped),
    day07: migrateDay(r.day07, COUNTS.day07.pieces, COUNTS.day07.ped),
    badges: Array.isArray(r.badges) ? [...new Set(r.badges.filter((b) => typeof b === 'string'))] : [],
    feedback,
    nick: cleanNick(r.nick),
    introSeen: typeof r.introSeen === 'boolean' ? r.introSeen : false,
    tutorialSeen: typeof r.tutorialSeen === 'boolean' ? r.tutorialSeen : false,
    music: typeof r.music === 'boolean' ? r.music : true,
  };
}

export function createSave(storage: KV | null = safeStorage()) {
  let data = defaults();
  try {
    const s = storage?.getItem(SAVE_KEY);
    if (s) data = migrate(JSON.parse(s));
  } catch {
    data = defaults();
  }
  const write = () => {
    try {
      storage?.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* sem armazenamento: segue sem salvar */
    }
  };
  return {
    get data(): Readonly<SaveData> {
      return data;
    },
    update(patch: Partial<Omit<SaveData, 'v'>>) {
      data = { ...data, ...patch };
      write();
    },
  };
}
export type Save = ReturnType<typeof createSave>;
