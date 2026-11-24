import { describe, expect, test } from 'vitest';
import { journey, worldProgress, EDEN_DAYS } from '../src/game/journey';
import { newDay01 } from '../src/game/day01/state';
import { newDay02 } from '../src/game/day02/state';
import { newDay } from '../src/game/days/state';

describe('Jornada do Éden', () => {
  test('no começo, só o Dia 1 está liberado', () => {
    const j = journey({ day01: null });
    expect(j.map((d) => d.status)).toEqual(['next', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked']);
  });
  test('missão começada aparece para continuar', () => {
    expect(journey({ day01: { ...newDay01(), step: 'pedrito' } })[0].status).toBe('playing');
  });
  test('Dia 1 concluído libera o Dia 2, que já está pronto', () => {
    const j = journey({ day01: { ...newDay01(), step: 'done' } });
    expect(j[0].status).toBe('done');
    expect(j[1].status).toBe('next');
    expect(j[2].status).toBe('locked');
  });
  test('Dia 2 começado aparece para continuar; concluído libera o Dia 3, que já está pronto', () => {
    const d1 = { ...newDay01(), step: 'done' as const };
    expect(journey({ day01: d1, day02: { ...newDay02(), step: 'waters' } })[1].status).toBe('playing');
    const j = journey({ day01: d1, day02: { ...newDay02(), step: 'done' } });
    expect(j[1].status).toBe('done');
    expect(j[2].status).toBe('next');
    expect(j[3].status).toBe('locked');
    expect(worldProgress({ day01: d1, day02: { ...newDay02(), step: 'done' } }).done).toBe(2);
  });
  test('dia pronto e liberado pode ser jogado na hora, sem esperar o dia seguinte', () => {
    const days = EDEN_DAYS.map((d) => ({ ...d, ready: d.n <= 2 }));
    expect(journey({ day01: { ...newDay01(), step: 'done' } }, days)[1].status).toBe('next');
  });
  test('o próximo mundo só abre com os sete dias concluídos', () => {
    expect(worldProgress({ day01: { ...newDay01(), step: 'done' } })).toEqual({ done: 1, total: 7, nextWorldOpen: false });
    const done = { ...newDay(), step: 'done' as const };
    const all = { day01: { ...newDay01(), step: 'done' as const }, day02: { ...newDay02(), step: 'done' as const }, day03: done, day04: done, day05: done, day06: done, day07: done };
    expect(worldProgress(all)).toEqual({ done: 7, total: 7, nextWorldOpen: true });
    expect(journey({ ...all, day07: null })[6].status).toBe('next');
  });
  test('os Dias 3 a 7 estão prontos e cada um abre só depois do anterior', () => {
    expect(EDEN_DAYS.every((d) => d.ready)).toBe(true);
    const d1 = { ...newDay01(), step: 'done' as const },
      d2 = { ...newDay02(), step: 'done' as const };
    const j = journey({ day01: d1, day02: d2, day03: { ...newDay(), step: 'skill' } });
    expect(j[2].status).toBe('playing');
    expect(j[3].status).toBe('locked');
    expect(journey({ day01: d1, day02: d2, day03: { ...newDay(), step: 'start' } })[2].status).toBe('next');
  });
});
