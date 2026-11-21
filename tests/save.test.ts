import { describe, expect, test } from 'vitest';
import { cleanNick, createSave, migrate, NICK_MAX, SAVE_KEY, SAVE_VERSION } from '../src/persistence/save';

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
  test('save da versão 1 ganha os campos novos sem perder moedas', () => {
    const d = migrate({ v: 1, avatar: 2, controls: true, sound: false, coins: [3, 5] });
    expect(d).toMatchObject({ v: SAVE_VERSION, avatar: 2, coins: [3, 5], day01: null, badges: [], feedback: {} });
  });
  test('feedback guarda só carinha, até dois ícones e a vontade de continuar', () => {
    const d = migrate({ feedback: { day01: { mood: 'great', liked: ['tico', 'globo', 'perguntas'], wantsNext: true, nome: 'X' }, hack: {} } });
    expect(d.feedback).toEqual({ day01: { mood: 'great', liked: ['tico', 'globo'], wantsNext: true } });
  });
  test('apelido é limpo e limitado; save da versão 2 começa sem apelido e sem abertura vista', () => {
    expect(migrate({ v: 2, avatar: 1 })).toMatchObject({ nick: '', introSeen: false });
    expect(migrate({ nick: '  Ana   Júlia <b>!! ' }).nick).toBe('Ana Júlia b');
    expect(cleanNick('Maria-Eduarda dos Santos').length).toBeLessThanOrEqual(NICK_MAX);
    expect(cleanNick(42)).toBe('');
    expect(migrate({ introSeen: true }).introSeen).toBe(true);
  });
  test('save da versão 3 começa com a música ligada; a escolha é guardada', () => {
    expect(migrate({ v: 3, avatar: 1, nick: 'Lulu' })).toMatchObject({ v: SAVE_VERSION, music: true, nick: 'Lulu' });
    expect(migrate({ music: false }).music).toBe(false);
    expect(migrate({ music: 'não' }).music).toBe(true);
  });
  test('sem armazenamento disponível o jogo segue', () => {
    const save = createSave(null);
    save.update({ sound: false });
    expect(save.data.sound).toBe(false);
  });
});
