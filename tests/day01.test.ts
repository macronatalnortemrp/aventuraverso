import { describe, expect, test } from 'vitest';
import { Day01, acceptChallenge, newDay01, complete, foundSpark, hungInvite, isNight, migrateDay01, STEPS } from '../src/game/day01/state';

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
  test('o Dia 1 inteiro é no escuro: a luz só volta com o "Haja luz" do Globo', () => {
    let d: Day01 = { ...newDay01(), step: 'letThereBeLight' };
    for (const step of ['letThereBeLight', 'dayNight'] as const) {
      expect(isNight(d)).toBe(true);
      d = complete(d, step);
    }
    d = hungInvite(hungInvite(hungInvite(d, 0), 1), 2);
    expect(d.step).toBe('globe');
    expect(isNight(d)).toBe(true);
    expect(isNight(complete(d, 'globe'))).toBe(false);
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
    expect(migrateDay01({ step: 'voar', sparks: [0, 0, 9, 'x'], invites: null })).toEqual({ step: 'lantern', sparks: [0], invites: [], realMission: false, challenge: null });
  });
  test('Caminho da Luz: um desafio por vez; concluir pendura o convite e libera o próximo', () => {
    let d: Day01 = { ...newDay01(), step: 'invites' };
    d = acceptChallenge(d, 2);
    expect(d.challenge).toBe(2);
    expect(acceptChallenge(d, 0)).toBe(d); // outro acampante espera
    d = hungInvite(d, 2);
    expect(d).toMatchObject({ invites: [2], challenge: null });
    expect(acceptChallenge(d, 2)).toBe(d); // o mesmo acampante não repete
    d = hungInvite(acceptChallenge(d, 0), 0);
    d = hungInvite(acceptChallenge(d, 1), 1);
    expect(d.step).toBe('globe');
    expect(migrateDay01({ step: 'invites', invites: [1], challenge: 1 }).challenge).toBeNull();
    expect(migrateDay01({ step: 'invites', invites: [1], challenge: 0 }).challenge).toBe(0);
  });
});
