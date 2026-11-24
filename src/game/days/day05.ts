import * as THREE from 'three';
import { DayMission, DayContent, Bible, ClubTexts } from './base';
import { MARINA_BEACH, PERCHES, Spot, diveSpot as dive } from './layout';

const diveSpot = (i: number) => {
  const v = dive(i);
  return new THREE.Vector3(v.x, v.y, v.z);
};
import type { MissionDeps } from '../day01/mission';
import { stepIndex } from './state';
import { Interactable } from '../../world/interactables';
import { makeMarina } from '../../world/builders/marina';
import { WILD } from '../../world/wildlife';
import { H, WY } from '../../world/terrain';
import { REDUCED_MOTION } from '../../engine/gfx';
import { sfx } from '../../engine/audio';

/*
 * Dia 5, Peixes e Aves (Gn 1:20-23). O lago está sem peixes e o céu sem aves.
 * Desafio de habilidade: mergulhar no recife (com o fôlego) e achar três pedaços de luz no fundo.
 * Quando os três aparecem, os peixes voltam. Desafio do Pedrito: safári de binóculo com quatro aves
 * pousadas perto da praia. Na Voz do Globo, as aves voltam a voar no céu.
 */

const BIRD_COLORS: [number, number][] = [
  [0xf2c230, 0x3a3a48], // bem-te-vi: barriga amarela
  [0xe08a3a, 0x8a6a4a], // sabiá-laranjeira
  [0x1b1b1b, 0xff8a1e], // tucano: bico laranja
  [0x2f5fd0, 0xf2c230], // arara-azul
];

export class Day05Mission extends DayMission {
  readonly pieces = 3;
  readonly pedParts = 4;
  protected pedritoFollows = true;
  private birds: THREE.Group[] = [];
  private perchInter: Interactable[] = [];
  private binoculars: THREE.Group;
  private bubbleT = 0;
  private pedResolve: (() => void) | null = null;

  constructor(d: MissionDeps, content: DayContent, bible: Bible, club: ClubTexts) {
    super(d, 'day05', 5, content, bible, club, makeMarina, MARINA_BEACH);
    const { scene, camp } = d;
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5634, roughness: 0.8 });
    PERCHES.forEach((p, i) => {
      const y = H(p.x, p.z);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.18), wood);
      post.position.set(p.x, y + 0.9, p.z);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.1), wood);
      bar.position.set(p.x, y + 1.8, p.z);
      scene.add(post, bar);
      camp.col.circles.push({ x: p.x, z: p.z, r: 0.25, top: y + 1.9 });
      // ave de blocos pousada (cor própria de cada espécie)
      const [body, beak] = BIRD_COLORS[i];
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.46), new THREE.MeshStandardMaterial({ color: body, roughness: 0.6 }));
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.26), b.material);
      h.position.set(0, 0.22, 0.2);
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, i === 2 ? 0.34 : 0.14), new THREE.MeshStandardMaterial({ color: beak }));
      k.position.set(0, 0.2, i === 2 ? 0.48 : 0.38);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.3), b.material);
      tail.position.set(0, 0.02, -0.34);
      g.add(b, h, k, tail);
      g.position.set(p.x, y + 2.02, p.z);
      g.visible = false;
      scene.add(g);
      this.birds.push(g);
      this.perchInter.push(camp.inter.add({ id: 'd5-bird' + i, x: p.x, z: p.z, w: 1.4, h: 2.6, name: 'Ave pousada', label: 'Observar com o binóculo', who: 'Pedrito', text: '', off: true }));
    });
    this.binoculars = new THREE.Group();
    {
      const m = new THREE.MeshStandardMaterial({ color: 0x1f2a3c, roughness: 0.4, metalness: 0.3 });
      for (const s of [-1, 1]) {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.36, 10), m);
        c.rotation.x = Math.PI / 2;
        c.position.x = s * 0.12;
        this.binoculars.add(c);
      }
      this.binoculars.visible = false;
      scene.add(this.binoculars);
    }
    this.init();
  }

  /* ---------- o que fica ---------- */

  protected applyLasting() {
    const si = stepIndex(this.state.step);
    // as aves pousam para o safári e ficam nos poleiros depois do dia
    const on = this.done || (this.active && ((si === stepIndex('pedrito') && this.pedStarted) || si > stepIndex('pedrito')));
    this.birds.forEach((b) => (b.visible = on));
    if (this.done) this.d.camp.setGlobeLayer(5, 1);
  }

  protected resetLasting() {
    this.d.camp.setGlobeLayer(5, 0);
  }

  protected enter() {
    const si = stepIndex(this.state.step);
    this.d.daylight.set(0, REDUCED_MOTION ? 0 : 1);
    this.d.camp.setGlobe(1);
    WILD.water = si > stepIndex('skill');
    WILD.air = si > stepIndex('globe');
    this.d.place(-24, 21, -Math.PI / 2);
    this.applyLasting();
  }

  protected leave() {
    WILD.water = true;
    WILD.air = true;
    this.pedResolve = null;
    this.perchInter.forEach((p) => (p.off = true));
    this.applyLasting();
  }

  /* ---------- desafio: mergulho no recife ---------- */

  protected pieceSpot(i: number, t: number) {
    const v = diveSpot(i);
    v.y += Math.sin(t * 1.6 + i) * 0.1;
    return v;
  }

  protected tick(dt: number) {
    // bolhas sobem de onde estão os pedaços de luz: dá para achar olhando a água
    if (this.state.step !== 'skill') return;
    this.bubbleT -= dt;
    if (this.bubbleT > 0) return;
    this.bubbleT = 0.5;
    for (let i = 0; i < this.pieces; i++) {
      if (this.state.got.includes(i)) continue;
      const v = diveSpot(i);
      this.d.fx.puff(v.x, v.y + 0.3, v.z, { n: 2, color: 0xdff6ff, sp: 0.2, up: 2.2, g: -1.5, s: 0.22, life: 1.4, grow: 0.2 });
      this.d.fx.puff(v.x, WY + 0.05, v.z, { n: 1, color: 0xffffff, sp: 0.6, up: 0.4, g: 2, s: 0.35, life: 0.7 });
    }
  }

  protected skillObjective(): Spot | null {
    const i = [0, 1, 2].find((k) => !this.state.got.includes(k));
    if (i === undefined) return null;
    const v = diveSpot(i);
    return { x: v.x, z: v.z };
  }

  protected afterSkill() {
    WILD.water = true; // os peixes voltaram
    sfx('splash');
  }

  /* ---------- Pedrito: safári das aves ---------- */

  protected pedritoSpot(): Spot {
    return { x: MARINA_BEACH.x + 2.5, z: MARINA_BEACH.z - 2 };
  }

  protected pedritoChallenge() {
    this.carry(this.binoculars);
    this.syncPerches();
    this.applyLasting();
    return new Promise<void>((res) => (this.pedResolve = res));
  }

  private syncPerches() {
    const on = this.active && this.state.step === 'pedrito' && this.pedStarted;
    this.perchInter.forEach((p, i) => (p.off = !on || this.state.ped.includes(i)));
  }

  protected pedritoInteract(o: Interactable) {
    const i = this.perchInter.indexOf(o);
    if (i < 0) return false;
    const birds = (this.content.pedrito as unknown as { birds: { lines: string[] }[] }).birds;
    const b = birds[i];
    this.busy = true;
    sfx('ui');
    const p = this.d.player,
      at = PERCHES[i];
    p.face = Math.atan2(at.x - p.x, at.z - p.z);
    void this.talk('Pedrito', b.lines).then(() => {
      this.busy = false;
      this.pedDone(i);
      this.syncPerches();
      sfx('coin');
      const left = this.pedParts - this.state.ped.length;
      const pd = this.content.pedrito as DayContent['pedrito'] & Record<string, string>;
      if (left > 0) this.d.hud.say(pd.left.replace('{x}', String(left)), 4500);
      else {
        this.carry(null);
        const r = this.pedResolve;
        this.pedResolve = null;
        r?.();
      }
    });
    return true;
  }

  protected pedritoObjective(): Spot | null {
    const i = [0, 1, 2, 3].find((k) => !this.state.ped.includes(k));
    return i === undefined ? null : PERCHES[i];
  }

  protected idle(_dt: number, t: number) {
    // aves pousadas viram a cabeça de vez em quando
    this.birds.forEach((b, i) => {
      if (b.visible) b.rotation.y = Math.sin(t * 0.7 + i * 2) * 0.8;
    });
  }

  /* ---------- Globo ---------- */

  protected restore(k: number) {
    this.d.camp.setGlobeLayer(5, k);
    if (k > 0.3) WILD.air = true;
  }
}
