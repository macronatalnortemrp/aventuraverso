import { describe, expect, test } from 'vitest';
import { BUOY_COUNT, complete, foundBuoy, migrateDay02, mistLevel, newDay02, STEPS } from '../src/game/day02/state';
import { BOAT, BOAT_DOCK, BUOYS, MARINA_SPOT, PIER, PIER_TIP, RINGS, hullInWater } from '../src/game/day02/layout';
import { H, WY } from '../src/world/terrain';
import { ISLAND, STEPS as ISLE, TOP_HALF_W } from '../src/world/islandLayout';
import { migrate } from '../src/persistence/save';

import day from '../public/data/days/day02.json';
import bibleData from '../public/data/content/bible-acf2007.json';
import clubData from '../public/data/content/club-texts.json';

const bible: { verses: Record<string, string> } = bibleData;
const club: { ideals: Record<string, { text: string }> } = clubData;

/** água funda o bastante para o casco, longe da base da ilha e das mini ilhas baixas */
function navigable(x: number, z: number) {
  if (!hullInWater(x, z)) return false;
  const r = BOAT.radius;
  if (Math.abs(x - ISLAND.x) < TOP_HALF_W + r && Math.abs(z - ISLAND.z) < TOP_HALF_W + r) return false;
  return !ISLE.some((s, i) => (i === 0 || s.y - 1.6 < WY + 2.4) && Math.abs(s.x - x) < s.w / 2 + r && Math.abs(s.z - z) < s.d / 2 + r);
}

describe('Dia 2: etapas', () => {
  test('começa na névoa e segue a ordem do plano', () => {
    expect(STEPS).toEqual(['mist', 'boat', 'waters', 'vow', 'globe', 'done']);
    expect(newDay02().step).toBe('mist');
  });
  test('três boias concluem a etapa do barco; repetidas e fora de ordem não contam', () => {
    let d = complete(newDay02(), 'mist');
    d = foundBuoy(d, 1);
    d = foundBuoy(d, 1);
    d = foundBuoy(d, 7);
    expect(d.buoys).toEqual([1]);
    d = foundBuoy(foundBuoy(d, 0), 2);
    expect(d.step).toBe('waters');
    expect(foundBuoy(newDay02(), 0).buoys).toEqual([]); // ainda na névoa, antes de falar com a Capitã
  });
  test('a névoa diminui a cada boia e some só no fim', () => {
    let d = complete(newDay02(), 'mist');
    const seen = [mistLevel(d)];
    for (let i = 0; i < BUOY_COUNT; i++) seen.push(mistLevel((d = foundBuoy(d, i))));
    expect(seen.every((m, i) => i === 0 || m < seen[i - 1])).toBe(true);
    expect(mistLevel({ ...d, step: 'globe' })).toBeGreaterThan(0);
    expect(mistLevel({ ...d, step: 'done' })).toBe(0);
  });
  test('save antigo ou corrompido', () => {
    expect(migrateDay02(null)).toBeNull();
    expect(migrateDay02({ step: 'xx', buoys: [0, 0, 9] })).toEqual({ step: 'mist', buoys: [0], realMission: false });
    expect(migrateDay02({ step: 'vow' })?.buoys).toEqual([0, 1, 2]);
    expect(migrate({ v: 4, day01: null }).day02).toBeNull();
  });
});

describe('Dia 2: lago', () => {
  test('boias, anéis e a amarra do barco ficam em água navegável', () => {
    for (const p of [...BUOYS, ...RINGS, BOAT_DOCK]) expect(navigable(p.x, p.z), `${p.x}, ${p.z}`).toBe(true);
  });
  test('o cais começa em terra e termina na água, perto do barco', () => {
    expect(H(PIER.x, PIER.z1)).toBeGreaterThan(WY);
    expect(H(PIER.x, PIER.z0)).toBeLessThan(WY);
    expect(H(MARINA_SPOT.x, MARINA_SPOT.z)).toBeGreaterThan(WY);
    expect(Math.hypot(PIER_TIP.x - BOAT_DOCK.x, PIER_TIP.z - BOAT_DOCK.z)).toBeLessThan(4);
  });
  test('dá para ir de barco da amarra até cada boia (busca em grade)', () => {
    const step = 0.5,
      key = (x: number, z: number) => `${Math.round(x / step)},${Math.round(z / step)}`;
    const seen = new Set([key(BOAT_DOCK.x, BOAT_DOCK.z)]);
    const q: [number, number][] = [[BOAT_DOCK.x, BOAT_DOCK.z]];
    while (q.length) {
      const [x, z] = q.shift()!;
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx,
          nz = z + dz,
          k = key(nx, nz);
        if (seen.has(k) || !navigable(nx, nz)) continue;
        seen.add(k);
        q.push([nx, nz]);
      }
    }
    for (const b of BUOYS) {
      const near = [...seen].some((k) => {
        const [i, j] = k.split(',').map(Number);
        return Math.hypot(i * step - b.x, j * step - b.z) < BOAT.pick * 0.8;
      });
      expect(near, `boia ${b.x}, ${b.z}`).toBe(true);
    }
  });
});

describe('Dia 2: conteúdo', () => {
  test('as leituras existem na Bíblia conferida', () => {
    for (const r of Object.values(day.readings)) for (const k of r.keys) expect(bible.verses[k]).toBeTruthy();
  });
  test('a fala da Voz é um trecho exato de Gn 1:6', () => {
    expect(bible.verses['Gn 1:6'].startsWith('E disse Deus: ' + day.globe.voice.replace(/\.$/, ''))).toBe(true);
  });
  test('o Voto vem do texto do Guia, sem reescrever', () => {
    expect(club.ideals[day.vow.ideal].text).toBe('Por amor a Jesus, farei sempre o meu melhor.');
  });
  test('as falas com voz não usam apelido e têm pontuação', () => {
    const lines: string[] = [];
    const walk = (v: unknown, k = '') => {
      if (typeof v === 'string' && !k.startsWith('_') && !['id', 'ref', 'who', 'group', 'icon', 'ideal'].includes(k) && !/^[a-z0-9_-]+$/.test(v)) lines.push(v);
      else if (Array.isArray(v)) v.forEach((x) => walk(x, k));
      else if (v && typeof v === 'object') for (const [kk, x] of Object.entries(v)) walk(x, kk);
    };
    walk(day);
    for (const l of lines) expect(l, l).not.toMatch(/[{}]/);
    for (const l of [...day.start.lines, ...day.marina.hello, ...day.buoys.done, day.globe.voice]) expect(l, l).toMatch(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ].*[.!?]$/);
  });
  test('cada pergunta tem a resposta entre as opções e uma explicação', () => {
    for (const q of Object.values(day.questions)) {
      expect(q.options[q.answer]).toBeTruthy();
      expect(q.explain.length).toBeGreaterThan(10);
    }
  });
  test('separar: todos os itens vão para um dos dois lados', () => {
    const groups = day.sort.bins.map((b: { group: string }) => b.group);
    for (const it of day.sort.items) expect(groups).toContain(it.group);
  });
});
