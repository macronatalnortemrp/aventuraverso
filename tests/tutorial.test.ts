import { describe, expect, test } from 'vitest';
import { tutorialSteps } from '../src/ui/tutorial';
import { splitSentences } from '../src/engine/voiceText';

describe('tutorial', () => {
  test('mostra os botões de cima e os movimentos, no celular e no computador', () => {
    for (const touch of [true, false]) {
      const s = tutorialSteps(touch);
      const targets = s.map((x) => x.target).filter(Boolean);
      expect(targets).toEqual(touch ? ['bh', 'bs', 'bm', 'bc', 'bq'] : ['bh', 'bs', 'bm', 'bq']);
      for (const t of ['Andar e olhar', 'Pular', 'Nadar e mergulhar', 'Conversar e usar']) expect(s.some((x) => x.title === t)).toBe(true);
    }
  });
  test('o computador fala de teclas e o celular de toques', () => {
    const keys = tutorialSteps(false).map((x) => x.text).join(' ');
    const touch = tutorialSteps(true).map((x) => x.text).join(' ');
    expect(keys).toMatch(/setas/);
    expect(keys).not.toMatch(/joystick/i);
    expect(touch).toMatch(/Toque no chão/);
  });
  test('toda frase pode ganhar voz gravada (começa com maiúscula e termina com pontuação)', () => {
    for (const touch of [true, false])
      for (const s of tutorialSteps(touch))
        for (const f of splitSentences(s.text)) {
          expect(f).toMatch(/^[\p{Lu}]/u);
          expect(f).toMatch(/[.!?]$/);
        }
  });
});
