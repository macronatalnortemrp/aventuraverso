/**
 * Progresso local e versionado. Nada sai do aparelho.
 * Se o armazenamento não existir (modo privado, iframe), o jogo segue sem salvar.
 */
export const SAVE_KEY = 'aventuraverso.save';
export const SAVE_VERSION = 1;

export interface SaveData {
  v: number;
  avatar: number;
  controls: boolean;
  sound: boolean;
  coins: number[];
}

export const defaults = (): SaveData => ({ v: SAVE_VERSION, avatar: 0, controls: false, sound: true, coins: [] });

type KV = Pick<Storage, 'getItem' | 'setItem'>;

function safeStorage(): KV | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Migra saves antigos para a versão atual. */
export function migrate(raw: unknown): SaveData {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<SaveData>;
  return {
    v: SAVE_VERSION,
    avatar: Number.isInteger(r.avatar) && (r.avatar as number) >= 0 && (r.avatar as number) < 6 ? (r.avatar as number) : d.avatar,
    controls: typeof r.controls === 'boolean' ? r.controls : d.controls,
    sound: typeof r.sound === 'boolean' ? r.sound : d.sound,
    coins: Array.isArray(r.coins) ? r.coins.filter((n) => Number.isInteger(n) && n >= 0) : [],
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
