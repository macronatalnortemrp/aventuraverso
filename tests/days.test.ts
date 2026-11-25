import { describe, expect, test } from 'vitest';
import { COUNTS, DAY_KEYS, DayState, STEPS, complete, foundPiece, migrateDay, newDay, pedPart } from '../src/game/days/state';
import { ANIMALS, BEDS, BASKET, DIVE_SPOTS, ESTRELINO_SPOT, FLORA_SPOT, MARINA_BEACH, OBS_TOP, PEN_R, PERCHES, STAR_STEPS, STEP_W, WELL, ZE_SPOT, diveSpot, starSpot, trailSpots } from '../src/game/days/layout';
import { FLAG, tentSpot } from '../src/world/campLayout';
import { H, WY } from '../src/world/terrain';
import { STEP_UP } from '../src/world/colliders';
import { MOVE } from '../src/game/player';
import { migrate } from '../src/persistence/save';
import { SPEAKERS } from '../src/engine/voiceText';

import d3 from '../public/data/days/day03.json';
import d4 from '../public/data/days/day04.json';
import d5 from '../public/data/days/day05.json';
import d6 from '../public/data/days/day06.json';
import d7 from '../public/data/days/day07.json';
import bibleData from '../public/data/content/bible-acf2007.json';
import clubData from '../public/data/content/club-texts.json';

const bible: { verses: Record<string, string> } = bibleData;
const club: { ideals: Record<string, { text: string }> } = clubData;
type Content = {
  npc: { who: string };
  readings: Record<string, { ref: string; keys: string[] }>;
  questions: Record<string, { options: string[]; answer: number }>;
  pedrito: { ideal?: string; [k: string]: unknown };
  globe: { voice: string };
  skill: { left: string[] };
};
const DAYS: Record<string, Content> = { day03: d3, day04: d4, day05: d5, day06: d6, day07: d7 };
const N: Record<string, number> = { day03: 3, day04: 4, day05: 5, day06: 6, day07: 7 };

/** altura que um pulo alcança (v² / 2g) */
const reach = (v: number) => (v * v) / (2 * MOVE.gravityUp);

describe('Dias 3 a 7: etapas', () => {
  test('todos seguem o mesmo molde de 4 etapas', () => {
    expect(STEPS).toEqual(['start', 'skill', 'pedrito', 'globe', 'done']);
    expect(DAY_KEYS).toEqual(['day03', 'day04', 'day05', 'day06', 'day07']);
  });
  test('os pedaços de luz só contam no desafio e, com todos, a etapa termina', () => {
    let d = foundPiece(newDay(), 0, 3);
    expect(d.got).toEqual([]); // ainda antes de falar com o personagem
    d = complete(newDay(), 'start');
    d = foundPiece(foundPiece(foundPiece(d, 1, 3), 1, 3), 9, 3);
    expect(d.got).toEqual([1]);
    d = foundPiece(foundPiece(d, 0, 3), 2, 3);
    expect(d.step).toBe('pedrito');
  });
  test('partes do Pedrito não avançam sozinhas (a conversa final conclui)', () => {
    let d: DayState = { ...newDay(), step: 'pedrito' };
    for (const i of [0, 1, 2, 3, 3]) d = pedPart(d, i, 4);
    expect(d.ped).toEqual([0, 1, 2, 3]);
    expect(d.step).toBe('pedrito');
    expect(complete(d, 'pedrito').step).toBe('globe');
  });
  test('save antigo ou estranho vira um estado válido', () => {
    expect(migrateDay(null, 3, 0)).toBeNull();
    expect(migrateDay({ step: 'xyz', got: [1, 1, 'a', 7] }, 3, 0)).toEqual({ step: 'start', got: [1], ped: [], realMission: false });
    expect(migrateDay({ step: 'globe', got: [] }, 3, 4)).toMatchObject({ got: [0, 1, 2], ped: [0, 1, 2, 3] });
    const s = migrate({ v: 5, day03: { step: 'skill', got: [2] }, day07: { step: 'done' } });
    expect(s.day03).toMatchObject({ step: 'skill', got: [2] });
    expect(s.day04).toBeNull();
    expect(s.day07?.got).toHaveLength(COUNTS.day07.pieces);
  });
});

describe('Dias 3 a 7: conteúdo conferido', () => {
  for (const [key, c] of Object.entries(DAYS)) {
    test(`${key}: leituras só da Bíblia conferida (ACF)`, () => {
      for (const r of Object.values(c.readings)) for (const k of r.keys) expect(bible.verses[k], k).toBeTruthy();
    });
    test(`${key}: a Voz no Globo é um trecho exato do dia`, () => {
      const frag = c.globe.voice.replace(/[.!]$/, '');
      const verses = Object.values(bible.verses);
      // a primeira letra pode virar maiúscula (começo da fala); o resto é igual ao versículo
      const found = verses.some((v) => v.includes(frag) || v.includes(frag[0].toLowerCase() + frag.slice(1)));
      expect(found, frag).toBe(true);
    });
    test(`${key}: perguntas com a resposta certa entre as opções`, () => {
      for (const q of Object.values(c.questions)) expect(q.answer).toBeLessThan(q.options.length);
    });
    test(`${key}: o personagem do dia tem voz própria e a contagem de "faltam" cobre os pedaços`, () => {
      expect(SPEAKERS[c.npc.who], c.npc.who).toBeTruthy();
      expect(c.skill.left.length).toBeGreaterThanOrEqual(COUNTS[key as keyof typeof COUNTS].pieces - 1);
      expect(N[key]).toBeGreaterThan(2);
    });
  }
  test('os ideais dos quadros vêm do arquivo do Clube (Lei no Dia 3, Voto à Bíblia no Dia 7)', () => {
    expect(d3.pedrito.ideal).toBe('lei');
    expect(d7.pedrito.ideal).toBe('votoBiblia');
    expect(club.ideals.lei.text).toBeTruthy();
    expect(club.ideals.votoBiblia.text).toBeTruthy();
    // o resumo do Dia 3 repete a Lei exatamente
    expect(d3.creation.recap.items.some((i) => i.creation === club.ideals.lei.text)).toBe(true);
    expect(club.ideals.votoBiblia.text.startsWith(d7.creation.recap.items[1].creation.replace(/\.$/, ''))).toBe(true);
  });
  test('Hino: a letra exata enviada pela coordenação, verso por verso', () => {
    expect(club.ideals.hino.text.split('\n')).toEqual([
      'Somos Aventureiros alegres',
      'Que confiam no amigo Jesus.',
      'Aprendemos que sempre devemos',
      'Ser pra todos um brilho da Luz.',
      'Descobrimos em tudo a beleza,',
      'E o amor de um Deus criador.',
      'E amando a Cristo faremos',
      'Maravilhas ao nosso redor.',
    ]);
    const recap = d7.creation.recap.items.find((i) => i.game.includes('Hino'));
    expect(club.ideals.hino.text.split('\n')).toContain(recap!.creation); // verso exato
  });
  test('Dia 7: o sábado como memorial da criação, com Gênesis 2:2-3', () => {
    expect(d7.globe.voice).toBe('E abençoou Deus o dia sétimo, e o santificou.');
    expect(bible.verses['Gn 2:3'].startsWith('E abençoou Deus o dia sétimo, e o santificou')).toBe(true);
    const talk = d7.sabbath.lines.join(' ');
    expect(talk).toContain('memorial da criação');
    expect(talk).toContain('descansou no sétimo dia');
    expect(talk).toMatch(/escolheu esse dia, abençoou e santificou/);
  });
  test('Dia 6: o Globo não mostra pessoas (só a Voz e a luz) e a mesa segue Gênesis 1:29', () => {
    expect(d6.readings.r2.keys).toEqual(['Gn 1:29']);
    const groups = new Set(d6.pedrito.sort.items.map((i) => i.group));
    expect([...groups].sort()).toEqual(['herb', 'tree']);
  });
});

describe('Dias 3 a 7: lugares', () => {
  const land = (x: number, z: number) => H(x, z) > WY + 0.1;
  test('personagens, horta, poço e cercados ficam em terra firme', () => {
    for (const s of [FLORA_SPOT, ESTRELINO_SPOT, MARINA_BEACH, ZE_SPOT, BASKET, WELL, ...BEDS, ...PERCHES]) expect(land(s.x, s.z), `${s.x},${s.z}`).toBe(true);
    for (const a of ANIMALS) {
      expect(land(a.pen.x, a.pen.z)).toBe(true);
      expect(land(a.home.x, a.home.z)).toBe(true);
      expect(Math.hypot(a.home.x - a.pen.x, a.home.z - a.pen.z)).toBeGreaterThan(PEN_R + 3); // precisa levar
    }
  });
  test('Dia 4: o primeiro degrau sai com pulo normal; o último só com o pulo alto', () => {
    for (const chain of STAR_STEPS) {
      expect(chain[0].up).toBeLessThan(reach(MOVE.jump) - 0.2);
      const rise = chain[1].up - chain[0].up;
      expect(rise).toBeGreaterThan(reach(MOVE.jump) + STEP_UP); // nem subindo o degrauzinho
      expect(rise).toBeLessThan(reach(MOVE.highJump) - 0.2);
      // vão entre os degraus: dá para atravessar no ar
      const gap = Math.hypot(chain[1].dx - chain[0].dx, chain[1].dz - chain[0].dz) - STEP_W;
      expect(gap).toBeGreaterThan(0.3);
      expect(gap).toBeLessThan(1.6);
    }
    for (let i = 0; i < 3; i++) expect(starSpot(i).y).toBeGreaterThan(OBS_TOP + 4);
  });
  test('Dia 4: as bandeirinhas ficam perto do mastro e cada tenda tem a sua', () => {
    for (let i = 0; i < 4; i++) {
      const t = tentSpot(i);
      expect(Math.hypot(t.x - FLAG.x, t.z - FLAG.z)).toBeGreaterThan(5);
    }
  });
  test('Dia 5: os pedaços de luz estão no fundo do recife, abaixo do nado e acima do limite do mergulho', () => {
    for (let i = 0; i < DIVE_SPOTS.length; i++) {
      const v = diveSpot(i);
      expect(v.y).toBeLessThan(MOVE.swimY - 0.4); // precisa mergulhar
      expect(v.y).toBeGreaterThan(MOVE.floorDive + 0.3);
    }
  });
  test('Dia 7: a trilha passa por cinco lugares diferentes da semana', () => {
    const t = trailSpots();
    expect(t).toHaveLength(COUNTS.day07.pieces);
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) expect(Math.hypot(t[i].x - t[j].x, t[i].z - t[j].z)).toBeGreaterThan(8);
  });
});
