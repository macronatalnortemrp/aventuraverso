import * as THREE from 'three';
import { DayMission, DayContent, Bible, ClubTexts } from './base';
import { ANIMALS, PEN_R, Spot, TABLE, ZE_SPOT } from './layout';
import type { MissionDeps } from '../day01/mission';
import { stepIndex } from './state';
import { Interactable } from '../../world/interactables';
import { Batch, staticMaterial } from '../../world/batch';
import { plate } from '../../world/textures';
import { makeZe } from '../../world/builders/npcs';
import { animate as animateRig } from '../../world/builders/kid';
import { H } from '../../world/terrain';
import { REDUCED_MOTION } from '../../engine/gfx';
import { sfx } from '../../engine/audio';
import { angLerp } from '../../engine/math';

/*
 * Dia 6, Animais e Pessoas (Gn 1:24-31). Os cercados do Tio Zé Bichos estão vazios.
 * Desafio de habilidade: chamar cada animal no campo e levá-lo, andando junto, até o cercado dele.
 * Cada animal no lugar certo acende um pedaço de luz. Desafio do Pedrito: arrumar a Mesa da Família com
 * o que Deus deu para alimento (Gn 1:29) e, depois, a Diretora Cecília lembra que cada criança é especial (Gn 1:27).
 * No Globo, só a Voz e a luz (as pessoas não aparecem dentro do Globo).
 */

type Rigish = { root: THREE.Group; legs: THREE.Object3D[]; head: THREE.Object3D };

/** animal de blocos: corpo, cabeça e quatro pernas (as pernas balançam ao andar) */
function makeAnimal(id: string): Rigish {
  const root = new THREE.Group();
  const M = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const look: Record<string, { body: number; head: number; leg: number; w: number; h: number; l: number }> = {
    sheep: { body: 0xf6f2ea, head: 0x3a2a22, leg: 0x3a2a22, w: 0.8, h: 0.7, l: 1.1 },
    cow: { body: 0xf4efe6, head: 0xf4efe6, leg: 0x6b4426, w: 0.95, h: 0.85, l: 1.6 },
    goat: { body: 0xd9c09a, head: 0xd9c09a, leg: 0x8a6a4a, w: 0.6, h: 0.6, l: 0.95 },
  };
  const o = look[id];
  const body = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, o.l), M(o.body));
  body.position.y = 0.55 + o.h / 2;
  body.castShadow = true;
  root.add(body);
  const head = new THREE.Group();
  head.position.set(0, 0.75 + o.h * 0.6, o.l / 2 + 0.15);
  const hm = new THREE.Mesh(new THREE.BoxGeometry(o.w * 0.6, o.h * 0.6, 0.5), M(o.head));
  head.add(hm);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.03), M(0x111111));
    eye.position.set(s * o.w * 0.18, 0.06, 0.26);
    head.add(eye);
  }
  if (id === 'cow') {
    for (const [x, y, z, w, d] of [[0.2, 0.2, -0.3, 0.5, 0.5], [-0.3, 0.1, 0.35, 0.4, 0.4]]) {
      const spot = new THREE.Mesh(new THREE.BoxGeometry(0.02 + o.w, w * 0.6, d), M(0x5a3820));
      spot.position.set(0, body.position.y + y, z + x * 0);
      root.add(spot);
    }
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.12), M(0xf0a8a8));
    nose.position.set(0, -0.1, 0.28);
    head.add(nose);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), M(0xf2e6c8));
      horn.position.set(s * 0.22, 0.3, 0);
      head.add(horn);
    }
  }
  if (id === 'goat') {
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.08), M(0xf2ead8));
    beard.position.set(0, -0.26, 0.2);
    head.add(beard);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.07), M(0x8a7a6a));
      horn.position.set(s * 0.1, 0.28, -0.08);
      horn.rotation.x = -0.4;
      head.add(horn);
    }
  }
  if (id === 'sheep') {
    const wool = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.3), M(0xf6f2ea));
    wool.position.set(0, 0.24, -0.06);
    head.add(wool);
  }
  root.add(head);
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const g = new THREE.Group();
    g.position.set((x * o.w) / 2.8, 0.58, (z * o.l) / 2.8);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.16), M(o.leg));
    leg.position.y = -0.29;
    g.add(leg);
    root.add(g);
    legs.push(g);
  }
  return { root, legs, head };
}

export class Day06Mission extends DayMission {
  readonly pieces = 3;
  protected touchPieces = false;
  private animals: (Rigish & { x: number; z: number; ph: number; wander: number; tx: number; tz: number })[] = [];
  private animalInter: Interactable[] = [];
  private following = -1;
  private warned = -1;
  private food: THREE.Group;

  constructor(d: MissionDeps, content: DayContent, bible: Bible, club: ClubTexts) {
    super(d, 'day06', 6, content, bible, club, makeZe, ZE_SPOT);
    const { scene, camp } = d,
      B = new Batch();
    const names = (content.skill as unknown as { pens: string[] }).pens ?? [];
    ANIMALS.forEach((a, i) => {
      // cercado redondo de cerca baixa, com a portinha aberta virada para o campo
      const { x, z } = a.pen;
      const n = 12;
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2;
        if (k === 3) continue; // portinha
        const px = x + Math.cos(ang) * (PEN_R + 0.3),
          pz = z + Math.sin(ang) * (PEN_R + 0.3),
          y = H(px, pz);
        B.box(0.16, 0.9, 0.16, 0x8a5a34, px, y + 0.45, pz);
        const nx = x + Math.cos(ang + Math.PI / n) * (PEN_R + 0.3),
          nz = z + Math.sin(ang + Math.PI / n) * (PEN_R + 0.3);
        if (k !== 2) B.box(1.2, 0.1, 0.08, 0xc9a46c, nx, H(nx, nz) + 0.7, nz, { ry: -(ang + Math.PI / n) + Math.PI / 2 });
      }
      B.box(1.3, 0.1, 1.3, 0xd9c08a, x, H(x, z) + 0.05, z); // palha
      B.box(0.9, 0.35, 0.5, 0x6b4426, x + 0.9, H(x, z) + 0.2, z - 1, { r: 0.05 }); // cocho
      if (names[i]) plate(names[i], 1.4, 0.36, '#8a5a34', '#fff6dc', x + Math.cos(0.8) * (PEN_R + 0.5), H(x, z) + 1.25, z + Math.sin(0.8) * (PEN_R + 0.5), 0.8 + Math.PI / 2, { border: '#D7A64D' });
      const r = makeAnimal(a.id);
      r.root.visible = false;
      scene.add(r.root);
      this.animals.push({ ...r, x: a.home.x, z: a.home.z, ph: 0, wander: 0, tx: a.home.x, tz: a.home.z });
      this.animalInter.push(camp.inter.add({ id: 'd6-animal' + i, x: a.home.x, z: a.home.z, w: 1.6, h: 1.8, name: names[i] ?? 'Animal', label: 'Chamar', who: 'Tico', text: '', off: true }));
    });
    B.mesh(scene, staticMaterial());
    // comida na Mesa da Família (aparece quando o Pedrito arruma a mesa)
    this.food = new THREE.Group();
    {
      const y = H(TABLE.x, TABLE.z) + 1.02;
      const add = (w: number, h: number, dd: number, c: number, x: number, z: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
        m.position.set(TABLE.x + x, y + h / 2, TABLE.z + z);
        this.food.add(m);
      };
      add(1, 0.14, 0.7, 0xc9a46c, -1, 0);
      add(1, 0.14, 0.7, 0xc9a46c, 1, 0);
      for (const [x, z, c] of [[-1.25, -0.15, 0x6bbf4e], [-0.95, 0.15, 0xf07a10], [-0.7, -0.1, 0xf0c020], [0.75, -0.1, 0xd0302a], [1.05, 0.15, 0xf08a10], [1.25, -0.15, 0xa8c63a]] as [number, number, number][])
        add(0.22, 0.22, 0.22, c, x, z);
      this.food.visible = false;
      scene.add(this.food);
    }
    this.init();
  }

  /* ---------- o que fica ---------- */

  private inPen(i: number) {
    return this.done || this.state.got.includes(i);
  }

  protected applyLasting() {
    const si = stepIndex(this.state.step);
    this.animals.forEach((a, i) => {
      const shown = this.inPen(i) || (this.active && si === stepIndex('skill'));
      a.root.visible = shown;
      if (this.inPen(i) && i !== this.following) {
        const p = ANIMALS[i].pen;
        if (Math.hypot(a.x - p.x, a.z - p.z) > PEN_R) Object.assign(a, { x: p.x, z: p.z, tx: p.x, tz: p.z });
      }
    });
    this.food.visible = this.done || si > stepIndex('pedrito');
    if (this.done) this.d.camp.setGlobeLayer(6, 1);
  }

  protected resetLasting() {
    this.d.camp.setGlobeLayer(6, 0);
    this.animals.forEach((a, i) => Object.assign(a, { x: ANIMALS[i].home.x, z: ANIMALS[i].home.z, tx: ANIMALS[i].home.x, tz: ANIMALS[i].home.z }));
  }

  protected enter() {
    this.d.daylight.set(0, REDUCED_MOTION ? 0 : 1);
    this.d.camp.setGlobe(1);
    this.following = -1;
    this.warned = -1;
    this.animals.forEach((a, i) => {
      if (!this.inPen(i)) Object.assign(a, { x: ANIMALS[i].home.x, z: ANIMALS[i].home.z, tx: ANIMALS[i].home.x, tz: ANIMALS[i].home.z });
    });
    this.d.place(-12, -4, Math.PI * 0.85);
    this.applyLasting();
  }

  protected leave() {
    this.following = -1;
    this.animalInter.forEach((a) => (a.off = true));
    this.applyLasting();
  }

  /* ---------- desafio: levar os animais ---------- */

  protected beginSkill() {
    this.applyLasting();
    this.syncInter();
  }

  private syncInter() {
    const on = this.active && this.state.step === 'skill';
    this.animalInter.forEach((it, i) => {
      it.off = !on || this.inPen(i) || this.following === i;
      const a = this.animals[i];
      it.x = a.x;
      it.z = a.z;
      it.y = H(a.x, a.z);
      it.mesh?.position.set(a.x, it.y + 1, a.z);
    });
  }

  protected skillInteract(o: Interactable) {
    const i = this.animalInter.indexOf(o);
    if (i < 0) return false;
    const sk = this.content.skill as DayContent['skill'] & Record<string, string>;
    this.following = i;
    this.warned = -1;
    sfx('ui');
    this.d.hud.say(sk.follow.replace('{x}', o.name), 5000);
    this.syncInter();
    return true;
  }

  protected pieceSpot() {
    return null;
  }

  protected skillObjective(): Spot | null {
    if (this.following >= 0) return ANIMALS[this.following].pen;
    const i = ANIMALS.findIndex((_, k) => !this.inPen(k));
    if (i < 0) return null;
    const a = this.animals[i];
    return { x: a.x, z: a.z };
  }

  protected afterSkill() {
    this.following = -1;
    this.syncInter();
  }

  protected tick() {
    if (this.state.step !== 'skill') return;
    const f = this.following;
    if (f >= 0) {
      const a = this.animals[f];
      // chegou a um cercado: o certo acende a luz; o errado só avisa
      for (let k = 0; k < ANIMALS.length; k++) {
        const pen = ANIMALS[k].pen;
        if (Math.hypot(a.x - pen.x, a.z - pen.z) > PEN_R) continue;
        if (k === f) {
          this.following = -1;
          Object.assign(a, { tx: pen.x, tz: pen.z });
          this.piece(f, new THREE.Vector3(a.x, H(a.x, a.z) + 1.6, a.z));
          this.syncInter();
          return;
        }
        if (this.warned !== k) {
          this.warned = k;
          this.d.hud.say((this.content.skill as unknown as Record<string, string>).wrongPen, 4500);
        }
      }
    }
    this.syncInter();
  }

  /** os animais andam a cada quadro (também os que já estão no cercado) */
  protected idle(dt: number, t: number) {
    const p = this.d.player;
    this.animals.forEach((a, i) => {
      if (!a.root.visible) return;
      if (i === this.following && this.active) {
        // anda atrás da criança, sem encostar; com a criança dentro do cercado certo, ele entra também
        const pen = ANIMALS[i].pen,
          inside = Math.hypot(p.x - pen.x, p.z - pen.z) < PEN_R + 0.8;
        const bx = inside ? pen.x : p.x - Math.sin(p.face) * 2.2,
          bz = inside ? pen.z : p.z - Math.cos(p.face) * 2.2;
        Object.assign(a, { tx: bx, tz: bz });
        if (Math.hypot(p.x - a.x, p.z - a.z) > 14) Object.assign(a, { x: bx, z: bz }); // ficou muito para trás
      } else {
        a.wander -= dt;
        if (a.wander < 0) {
          const c = this.inPen(i) ? ANIMALS[i].pen : ANIMALS[i].home,
            r = this.inPen(i) ? PEN_R * 0.6 : 2;
          a.tx = c.x + (Math.random() - 0.5) * 2 * r;
          a.tz = c.z + (Math.random() - 0.5) * 2 * r;
          a.wander = 2 + Math.random() * 3;
        }
      }
      const dx = a.tx - a.x,
        dz = a.tz - a.z,
        dd = Math.hypot(dx, dz);
      const walking = dd > 0.25;
      if (walking) {
        const sp = i === this.following ? Math.min(6, dd * 2.2) : 1.1;
        const st = Math.min(dd, sp * dt);
        a.x += (dx / dd) * st;
        a.z += (dz / dd) * st;
        a.root.rotation.y = angLerp(a.root.rotation.y, Math.atan2(dx, dz), 0.15);
      }
      a.ph += dt * (walking ? 10 : 0);
      a.legs.forEach((l, k) => (l.rotation.x = walking ? Math.sin(a.ph + (k % 2 ? 0 : Math.PI)) * 0.5 : 0));
      a.head.rotation.x = walking ? 0 : Math.sin(t * 0.8 + i) * 0.25 + 0.15; // pastando
      a.root.position.set(a.x, H(a.x, a.z), a.z);
    });
  }

  /* ---------- Pedrito: a Mesa da Família e o "sou especial" ---------- */

  protected pedritoSpot(): Spot {
    return { x: TABLE.x + 2.8, z: TABLE.z + 1.6 };
  }

  protected async pedritoChallenge() {
    const st = (this.content.pedrito as unknown as { sort: { title: string; prompt: string; items: { id: string; name: string; group: string }[]; bins: { group: string; label: string; icon: string; other: string }[] } }).sort;
    this.busy = true;
    await this.d.task.sort(st.prompt, st.items, st.bins, st.title);
    sfx('yay');
    this.food.visible = true;
    this.d.fx.puff(TABLE.x, H(TABLE.x, TABLE.z) + 1.4, TABLE.z, { n: 20, color: 0xfff1b0, add: true, sp: 3, up: 2, s: 0.5 });
    const sp = (this.content.pedrito as unknown as { special: { intro: string[]; lines: string[] } }).special;
    // a Diretora Cecília vem até a mesa para o momento "sou especial"
    const sol = this.d.sol.root,
      from = sol.position.clone(),
      ry = sol.rotation.y;
    sol.position.set(TABLE.x + 1.2, H(TABLE.x + 1.2, TABLE.z + 2.6), TABLE.z + 2.6);
    const pp = this.d.player;
    sol.rotation.y = Math.atan2(pp.x - sol.position.x, pp.z - sol.position.z);
    animateRig(this.d.sol, 0.016, { wave: true });
    await this.talk('Diretora Cecília', sp.intro);
    await this.readKeys('Gênesis 1:27', ['Gn 1:27']);
    this.endReview();
    await this.talk('Diretora Cecília', sp.lines);
    sol.position.copy(from);
    sol.rotation.y = ry;
    this.busy = false;
  }

  /* ---------- Globo ---------- */

  protected restore(k: number) {
    this.d.camp.setGlobeLayer(6, k);
  }
}
