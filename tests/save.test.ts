import { describe, expect, test } from 'vitest';
import { createSave, migrate, SAVE_KEY, SAVE_VERSION } from '../src/persistence/save';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe('progresso local', () => {
  test('começa com valores padrão e grava com versão', () => {
    const s = mem();
    const save = createSave(s);
    expect(save.data.avatar).toBe(0);
    save.update({ avatar: 4, coins: [1, 2] });
    const raw = JSON.parse(s.m.get(SAVE_KEY)!);
    expect(raw.v).toBe(SAVE_VERSION);
    expect(createSave(s).data.coins).toEqual([1, 2]);
  });
  test('save corrompido não quebra o jogo', () => {
    const s = mem();
    s.setItem(SAVE_KEY, '{quebrado');
    expect(createSave(s).data.sound).toBe(true);
  });
  test('valores inválidos são descartados na migração', () => {
    const d = migrate({ avatar: 99, controls: 'sim', coins: [1, -3, 'x', 2.5, 4] });
    expect(d).toMatchObject({ avatar: 0, controls: false, coins: [1, 4] });
  });
  test('sem armazenamento disponível o jogo segue', () => {
    const save = createSave(null);
    save.update({ sound: false });
    expect(save.data.sound).toBe(false);
  });
});
