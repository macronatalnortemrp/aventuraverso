import * as THREE from 'three';
import { DayMission, DayContent, Bible, ClubTexts } from './base';
import { BASKET, BEDS, FLORA_SPOT, Spot, WELL, bedLight } from './layout';
import type { MissionDeps } from '../day01/mission';
import { stepIndex } from './state';
import { Interactable } from '../../world/interactables';
import { Batch, staticMaterial } from '../../world/batch';
import { plate } from '../../world/textures';
import { makeFlora } from '../../world/builders/npcs';
import { H } from '../../world/terrain';
import { REDUCED_MOTION } from '../../engine/gfx';
import { sfx } from '../../engine/audio';

/*
 * Dia 3, A Terra e as Plantas (Gn 1:9-13). A Horta da Dona Flora está só com terra.
 * Desafio de habilidade: pegar uma semente no cesto, plantar num canteiro, encher o regador no poço e regar.
 * Cada canteiro regado brota e solta um pedaço de luz. O Pedrito monta a Lei e acende o Quadro da Lei.
 */

const LEI_BOARD = 1;

type Hand = 'seed' | 'water' | null;

export class Day03Mission extends DayMission {
  readonly pieces = 3;
  /** 0 terra, 1 com semente, 2 regado (pedaço de luz no alto), 3 pedaço achado */
  private bed = [0, 0, 0];
  private hand: Hand = null;
  private plants: THREE.Group[] = [];
  private seedBag: THREE.Group;
  private can: THREE.Group;
  private beds: Interactable[] = [];
  private basket: Interactable;
  private well: Interactable;
  private grow = [0, 0, 0];

  constructor(d: MissionDeps, content: DayContent, bible: Bible, club: ClubTexts) {
    super(d, 'day03', 3, content, bible, club, makeFlora, FLORA_SPOT);
    const { scene, camp } = d,
      B = new Batch(),
      col = camp.col;
    // canteiros de terra com borda de madeira
    for (const b of BEDS) {
      const y = H(b.x, b.z);
      B.box(2.2, 0.3, 3.2, 0x8a5a34, b.x, y + 0.15, b.z, { r: 0.05 });
      B.box(1.9, 0.12, 2.9, 0x6b4426, b.x, y + 0.32, b.z, { j: 0.08 });
      for (let k = -1; k <= 1; k++) B.box(1.7, 0.06, 0.18, 0x5a3820, b.x, y + 0.39, b.z + k * 0.9);
    }
    // cerca baixa em volta da horta
    for (const [x0, z0, x1, z1] of [[-20, 12.6, -10, 12.6], [-20, 12.6, -20, 17], [-10, 12.6, -10, 17]]) {
      const L = Math.hypot(x1 - x0, z1 - z0),
        n = Math.round(L / 1.2);
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n,
          z = z0 + ((z1 - z0) * i) / n;
        B.box(0.16, 0.8, 0.16, 0xc9a46c, x, H(x, z) + 0.4, z);
      }
      const mx = (x0 + x1) / 2,
        mz = (z0 + z1) / 2;
      B.box(x0 === x1 ? 0.08 : L, 0.1, x0 === x1 ? L : 0.08, 0xc9a46c, mx, H(mx, mz) + 0.62, mz);
    }
    // poço de pedra com telhadinho
    {
      const { x, z } = WELL,
        y = H(x, z);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        B.box(0.6, 0.8, 0.4, i % 2 ? 0xa9a59a : 0x948f84, x + Math.cos(a) * 0.75, y + 0.4, z + Math.sin(a) * 0.75, { ry: -a, r: 0.06 });
      }
      B.box(1.1, 0.06, 1.1, 0x3f8fdc, x, y + 0.55, z);
      for (const s of [-1, 1]) B.box(0.14, 1.8, 0.14, 0x7a5634, x + s * 0.85, y + 0.9, z);
      B.box(2.1, 0.12, 1.3, 0xb83a2a, x, y + 1.85, z, { rz: 0, r: 0.04 });
      B.box(1.7, 0.08, 0.08, 0x5a3820, x, y + 1.45, z);
      col.solid(x, z, 1.8, 1.8, y + 0.8);
    }
    // cesto de sementes
    {
      const { x, z } = BASKET,
        y = H(x, z);
      B.box(0.9, 0.5, 0.7, 0xc9a46c, x, y + 0.25, z, { r: 0.1 });
      B.box(0.75, 0.1, 0.55, 0x7a4a2a, x, y + 0.5, z);
      for (let i = 0; i < 6; i++) B.box(0.1, 0.08, 0.1, 0xe8c56a, x - 0.25 + (i % 3) * 0.25, y + 0.56, z - 0.12 + Math.floor(i / 3) * 0.24);
    }
    B.mesh(scene, staticMaterial());
    plate('Horta da Dona Flora', 2.6, 0.5, '#4f7a3a', '#fff6dc', -15, H(-15, 12.6) + 1.2, 12.5, Math.PI, { border: '#D7A64D' });
    plate('Horta da Dona Flora', 2.6, 0.5, '#4f7a3a', '#fff6dc', -15, H(-15, 12.6) + 1.2, 12.7, 0, { border: '#D7A64D' });

    // plantas que brotam (uma por canteiro): folhas, flores e frutinhas
    const leaf = new THREE.MeshStandardMaterial({ color: 0x5fae3a, roughness: 0.8 }),
      stem = new THREE.MeshStandardMaterial({ color: 0x3f7a2a, roughness: 0.8 }),
      fruit = [0xe0483a, 0xffb02e, 0xf29ab0].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    BEDS.forEach((b, i) => {
      const g = new THREE.Group(),
        y = H(b.x, b.z) + 0.38;
      for (let k = -1; k <= 1; k++)
        for (const dx of [-0.45, 0.45]) {
          const p = new THREE.Group();
          p.position.set(b.x + dx, y, b.z + k * 0.9);
          const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), stem);
          s.position.y = 0.3;
          const l = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), leaf);
          l.position.y = 0.65;
          l.rotation.y = k + dx;
          const f = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), fruit[i]);
          f.position.set(0.15, 0.82, 0.1);
          p.add(s, l, f);
          g.add(p);
        }
      g.scale.setScalar(0.001);
      g.visible = false;
      scene.add(g);
      this.plants.push(g);
    });
    // saquinho de sementes e regador (na mão da criança)
    this.seedBag = new THREE.Group();
    {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.25), new THREE.MeshStandardMaterial({ color: 0xe8c56a, roughness: 0.9 }));
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.18), new THREE.MeshStandardMaterial({ color: 0x5f9a4c }));
      tie.position.y = 0.26;
      this.seedBag.add(bag, tie);
    }
    this.can = new THREE.Group();
    {
      const m = new THREE.MeshStandardMaterial({ color: 0x3fa0d8, roughness: 0.4, metalness: 0.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.34), m);
      const spout = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.08), m);
      spout.position.set(0.4, 0.12, 0);
      spout.rotation.z = 0.5;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.08), m);
      handle.position.y = 0.3;
      this.can.add(body, spout, handle);
    }
    for (const o of [this.seedBag, this.can]) {
      o.visible = false;
      scene.add(o);
    }
    const inter = camp.inter;
    this.beds = BEDS.map((b, i) =>
      inter.add({ id: 'd3-bed' + i, x: b.x, z: b.z, w: 2.4, h: 1.6, name: 'Canteiro', label: 'Ver o canteiro', who: 'Dona Flora', text: 'Um canteiro da horta.', off: true }),
    );
    this.basket = inter.add({ id: 'd3-seeds', x: BASKET.x, z: BASKET.z, w: 1.4, h: 1.4, name: 'Cesto de sementes', label: 'Pegar semente', who: 'Tico', text: 'Sementes da Dona Flora.', off: true });
    this.well = inter.add({ id: 'd3-well', x: WELL.x, z: WELL.z, w: 2, h: 2.4, name: 'Poço', label: 'Encher o regador', who: 'Tico', text: 'Água fresquinha para a horta.', off: true });
    this.init();
  }

  /* ---------- o que fica ---------- */

  protected applyLasting() {
    const s = this.state,
      si = stepIndex(s.step),
      done = this.done;
    this.plants.forEach((p, i) => {
      const on = done || s.got.includes(i);
      p.visible = on;
      p.scale.setScalar(on ? 1 : 0.001);
    });
    const lei = this.club.ideals[this.content.pedrito.ideal ?? 'lei'];
    if (si > stepIndex('pedrito') && lei) this.d.camp.setIdeal(LEI_BOARD, lei.text);
    if (done) this.d.camp.setGlobeLayer(3, 1);
  }

  protected resetLasting() {
    this.d.camp.setIdeal(LEI_BOARD, null);
    this.d.camp.setGlobeLayer(3, 0);
    this.plants.forEach((p) => ((p.visible = false), p.scale.setScalar(0.001)));
  }

  protected enter() {
    const s = this.state;
    this.d.daylight.set(0, REDUCED_MOTION ? 0 : 1);
    this.d.camp.setGlobe(1);
    // a terra ainda está sem flores até a Voz no Globo
    this.d.camp.setFlowers(stepIndex(s.step) > stepIndex('globe'));
    this.bed = BEDS.map((_, i) => (s.got.includes(i) || stepIndex(s.step) > stepIndex('skill') ? 3 : 0));
    this.hand = null;
    this.applyLasting();
    this.d.place(-6, 12, -1.05);
  }

  protected leave() {
    this.d.camp.setFlowers(true);
    this.hand = null;
    this.beds.forEach((b) => (b.off = true));
    this.basket.off = this.well.off = true;
  }

  /* ---------- desafio: plantar e regar ---------- */

  protected beginSkill() {
    this.syncInter();
  }

  private syncInter() {
    const on = this.active && this.state.step === 'skill';
    this.basket.off = !on;
    this.well.off = !on;
    this.beds.forEach((b, i) => {
      b.off = !on || this.bed[i] >= 2;
      b.label = this.bed[i] === 0 ? 'Plantar' : 'Regar';
    });
    this.basket.label = this.hand === 'seed' ? 'Já tenho semente' : 'Pegar semente';
    this.well.label = this.hand === 'water' ? 'O regador está cheio' : 'Encher o regador';
  }

  protected skillInteract(o: Interactable) {
    const sk = this.content.skill as DayContent['skill'] & Record<string, string>;
    if (o === this.basket) {
      if (this.hand !== 'seed') {
        sfx('ui');
        this.hand = 'seed';
        this.carry(this.seedBag);
        this.teach(sk.gotSeed);
      }
      this.syncInter();
      return true;
    }
    if (o === this.well) {
      if (this.hand !== 'water') {
        sfx('splash');
        this.hand = 'water';
        this.carry(this.can);
        this.teach(sk.gotWater);
      }
      this.syncInter();
      return true;
    }
    const i = this.beds.indexOf(o);
    if (i < 0) return false;
    const b = BEDS[i];
    if (this.bed[i] === 0) {
      if (this.hand !== 'seed') this.d.hud.say(sk.needSeed, 4000);
      else {
        sfx('pound');
        this.d.fx.puff(b.x, H(b.x, b.z) + 0.5, b.z, { n: 10, color: 0x8a5a34, sp: 1.6, up: 1.2, s: 0.35 });
        this.bed[i] = 1;
        this.hand = null;
        this.carry(null);
        this.plants[i].visible = true;
        this.grow[i] = 0.18; // brotinho
        this.teach(sk.planted);
      }
    } else if (this.bed[i] === 1) {
      if (this.hand !== 'water') this.d.hud.say(sk.needWater, 4500);
      else {
        sfx('splash');
        this.d.fx.puff(b.x, H(b.x, b.z) + 1.2, b.z, { n: 18, color: 0x9ed8ff, sp: 1.2, up: -1, g: 6, s: 0.25, life: 0.8 });
        this.bed[i] = 2;
        this.hand = null;
        this.carry(null);
        this.grow[i] = 0.6;
        this.teach(sk.watered);
      }
    }
    this.syncInter();
    return true;
  }

  /** o Tico ensina só no primeiro canteiro; nos outros a criança faz sozinha (pedido do piloto, 25/11/2026) */
  private teach(text: string) {
    if (this.state.got.length === 0) this.d.hud.say(text, 4500);
  }

  protected pieceSpot(i: number, t: number) {
    if (this.bed[i] !== 2) return null;
    const v = bedLight(i, Math.sin(t * 2 + i) * 0.15);
    return new THREE.Vector3(v.x, v.y, v.z);
  }

  protected onPiece(i: number) {
    this.bed[i] = 3;
    this.grow[i] = 1;
    this.syncInter();
  }

  protected afterSkill() {
    this.hand = null;
    this.carry(null);
    this.syncInter();
  }

  protected skillObjective(): Spot | null {
    const watered = this.bed.indexOf(2);
    if (watered >= 0) return { x: BEDS[watered].x, z: BEDS[watered].z + 2 };
    const seeded = this.bed.indexOf(1);
    if (this.hand === 'water' && seeded >= 0) return BEDS[seeded];
    if (this.hand === 'seed') return BEDS[Math.max(0, this.bed.indexOf(0))];
    if (seeded >= 0) return WELL;
    return BASKET;
  }

  protected tick(dt: number) {
    // as plantas crescem devagar até o tamanho do momento (brotinho, regada, achada)
    this.plants.forEach((p, i) => {
      if (!p.visible || this.done) return;
      const want = this.bed[i] === 3 ? 1 : this.grow[i];
      const k = Math.min(1, p.scale.x + dt * 0.8);
      p.scale.setScalar(Math.min(want, Math.max(0.001, k)));
    });
  }

  /* ---------- Pedrito: a Lei ---------- */

  protected pedritoSpot(): Spot {
    const b = this.d.camp.idealSpot(LEI_BOARD);
    return { x: b.x + Math.sin(b.ry) * 2.4, z: b.z + Math.cos(b.ry) * 2.4 };
  }

  protected pedritoChallenge() {
    return this.idealWords(LEI_BOARD);
  }

  /* ---------- Globo ---------- */

  protected restore(k: number) {
    this.d.camp.setGlobeLayer(3, k);
    if (k > 0.5) this.d.camp.setFlowers(true);
  }
}
