import { describe, expect, test } from 'vitest';
import { Day01, newDay01, complete, foundSpark, hungInvite, isNight, migrateDay01, STEPS } from '../src/game/day01/state';

describe('Dia 1: etapas', () => {
  test('começa na lanterna, no escuro', () => {
    const d = newDay01();
    expect(d.step).toBe('lantern');
    expect(isNight(d)).toBe(true);
  });
  test('as três faíscas, em qualquer ordem, levam ao Pedrito', () => {
    let d = complete(newDay01(), 'lantern');
    d = foundSpark(d, 2);
    d = foundSpark(d, 2); // repetida não conta
    d = foundSpark(d, 0);
    expect(d.step).toBe('sparks');
    d = foundSpark(d, 1);
    expect(d.step).toBe('pedrito');
    expect(d.sparks).toEqual([2, 0, 1]);
  });
  test('concluir uma etapa que não é a atual não muda nada', () => {
    const d = newDay01();
    expect(complete(d, 'globe')).toBe(d);
    expect(foundSpark(d, 0)).toBe(d);
  });
  test('o dia amanhece depois de "Haja luz" e da separação dia/noite', () => {
    let d: Day01 = { ...newDay01(), step: 'letThereBeLight' };
    expect(isNight(d)).toBe(true);
    d = complete(d, 'letThereBeLight');
    expect(d.step).toBe('dayNight');
    expect(isNight(d)).toBe(false);
  });
  test('três convites levam ao Globo, e o Globo conclui o dia', () => {
    let d: Day01 = { ...newDay01(), step: 'invites' };
    d = hungInvite(hungInvite(hungInvite(d, 0), 1), 2);
    expect(d.step).toBe('globe');
    expect(complete(d, 'globe').step).toBe('done');
  });
  test('percorrer todas as etapas termina em "done"', () => {
    let d = newDay01();
    for (const s of STEPS) {
      if (s === 'sparks') [0, 1, 2].forEach((i) => (d = foundSpark(d, i)));
      else if (s === 'invites') [0, 1, 2].forEach((i) => (d = hungInvite(d, i)));
      else d = complete(d, s);
    }
    expect(d.step).toBe('done');
  });
  test('save corrompido vira um dia válido', () => {
    expect(migrateDay01({ step: 'voar', sparks: [0, 0, 9, 'x'], invites: null })).toEqual({ step: 'lantern', sparks: [0], invites: [], realMission: false });
  });
});
