import { describe, expect, test } from 'vitest';
import { journey, worldProgress, EDEN_DAYS } from '../src/game/journey';
import { newDay01 } from '../src/game/day01/state';

describe('Jornada do Éden', () => {
  test('no começo, só o Dia 1 está liberado', () => {
    const j = journey({ day01: null });
    expect(j.map((d) => d.status)).toEqual(['next', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked']);
  });
  test('missão começada aparece para continuar', () => {
    expect(journey({ day01: { ...newDay01(), step: 'pedrito' } })[0].status).toBe('playing');
  });
  test('Dia 1 concluído libera o Dia 2 (em construção por enquanto)', () => {
    const j = journey({ day01: { ...newDay01(), step: 'done' } });
    expect(j[0].status).toBe('done');
    expect(j[1].status).toBe('soon');
    expect(j[2].status).toBe('locked');
  });
  test('dia pronto e liberado pode ser jogado na hora, sem esperar o dia seguinte', () => {
    const days = EDEN_DAYS.map((d) => ({ ...d, ready: d.n <= 2 }));
    expect(journey({ day01: { ...newDay01(), step: 'done' } }, days)[1].status).toBe('next');
  });
  test('o próximo mundo só abre com os sete dias concluídos', () => {
    expect(worldProgress({ day01: { ...newDay01(), step: 'done' } })).toEqual({ done: 1, total: 7, nextWorldOpen: false });
  });
});
