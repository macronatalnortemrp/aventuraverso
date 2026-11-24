import * as THREE from 'three';
import { DayMission, DayContent, Bible, ClubTexts } from './base';
import { DIM, ESTRELINO_SPOT, OBS_TOP, STAR_STEPS, STEP_W, Spot, starSpot } from './layout';
import type { MissionDeps } from '../day01/mission';
import { stepIndex } from './state';
import { Interactable } from '../../world/interactables';
import { Box } from '../../world/colliders';
import { CLASSES, FLAG, OBSERVATORY, OBS_STEPS, tentSpot } from '../../world/camp';
import { decal } from '../../world/textures';
import { makeEstrelino } from '../../world/builders/npcs';
import { H } from '../../world/terrain';
import { REDUCED_MOTION } from '../../engine/gfx';
import { sfx } from '../../engine/audio';

/*
 * Dia 4, Sol, Lua e Estrelas (Gn 1:14-19). O céu está escuro, sem os luminares.
 * Desafio de habilidade: do alto do Observatório saem três escadas de blocos de luz flutuantes;
 * o último degrau só se alcança com o pulo alto, e lá em cima espera uma estrela (pedaço de luz).
 * Desafio do Pedrito: levar a bandeirinha de cada classe até a tenda da mesma cor e emblema.
 */

export class Day04Mission extends DayMission {
  readonly pieces = 3;
  readonly pedParts = 4;
  private steps: THREE.Mesh[] = [];
  private stepBoxes: Box[] = [];
  private flags: THREE.Group[] = [];
  private flagInter: Interactable[] = [];
  private tentInter: Interactable[] = [];
  private holding = -1;
  private pedResolve: (() => void) | null = null;
  protected pedritoFollows = true;

  constructor(d: MissionDeps, content: DayContent, bible: Bible, club: ClubTexts) {
    super(d, 'day04', 4, content, bible, club, makeEstrelino, ESTRELINO_SPOT);
    const { scene, camp } = d;
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x9fd4ff, emissive: 0x6fb4ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.85, roughness: 0.3 });
    for (const chain of STAR_STEPS)
      for (const s of chain) {
        const top = OBS_TOP + s.up,
          x = OBSERVATORY.x + s.dx,
          z = OBSERVATORY.z + s.dz;
        const m = new THREE.Mesh(new THREE.BoxGeometry(STEP_W, 0.4, STEP_W), stepMat);
        m.position.set(x, top - 0.2, z);
        m.visible = false;
        scene.add(m);
        this.steps.push(m);
        this.stepBoxes.push({ x0: x - STEP_W / 2, x1: x + STEP_W / 2, z0: z - STEP_W / 2, z1: z + STEP_W / 2, top, bottom: top - 0.4 });
      }
    // bandeirinhas das classes: cor da tenda e o emblema oficial dos dois lados
    CLASSES.forEach((k, i) => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x7a5634 }));
      pole.position.y = 0.8;
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.03), new THREE.MeshStandardMaterial({ color: k.c, roughness: 0.7 }));
      cloth.position.set(0.4, 1.3, 0);
      g.add(pole, cloth);
      decal(k.k, 0.42, 0.4, 1.3, 0.025, 0, g);
      decal(k.k, 0.42, 0.4, 1.3, -0.025, Math.PI, g);
      scene.add(g);
      this.flags.push(g);
      const h = this.flagHome(i);
      this.flagInter.push(camp.inter.add({ id: 'd4-flag' + i, x: h.x, z: h.z, w: 1, h: 2, name: 'Bandeirinha dos ' + k.n, label: 'Pegar a bandeirinha', who: 'Tico', text: '', off: true }));
      const t = this.tentFlagSpot(i);
      this.tentInter.push(camp.inter.add({ id: 'd4-tent' + i, x: t.x, z: t.z, w: 1.6, h: 2.4, name: 'Tenda dos ' + k.n, label: 'Fincar a bandeirinha', who: 'Tico', text: '', off: true }));
    });
    this.init();
  }

  /** onde cada bandeirinha espera: no caixote ao lado do mastro do Clube */
  private flagHome(i: number) {
    return { x: FLAG.x + 1.6, z: FLAG.z + 1.2 + i * 0.9 };
  }
  /** onde a bandeirinha fica fincada: ao lado da placa da tenda */
  private tentFlagSpot(i: number) {
    const { a, x, z } = tentSpot(i),
      ry = -a,
      sx = x + Math.sin(ry) * 3.4,
      sz = z + Math.cos(ry) * 3.4;
    return { x: sx + Math.cos(ry) * 1.5, z: sz - Math.sin(ry) * 1.5 };
  }

  private placeFlags() {
    const s = this.state;
    this.flags.forEach((f, i) => {
      if (i === this.holding) return;
      const planted = this.done || s.ped.includes(i);
      const at = planted ? this.tentFlagSpot(i) : this.flagHome(i);
      f.position.set(at.x, H(at.x, at.z), at.z);
      f.rotation.set(0, planted ? -tentSpot(i).a : Math.PI / 2, 0);
      // fora do desafio, só ficam as fincadas
      f.visible = planted || (this.active && s.step === 'pedrito' && this.pedStarted);
    });
  }

  /* ---------- o que fica ---------- */

  protected applyLasting() {
    this.placeFlags();
    if (this.done) this.d.camp.setGlobeLayer(4, 1);
  }

  protected resetLasting() {
    this.d.camp.setGlobeLayer(4, 0);
  }

  protected enter() {
    const si = stepIndex(this.state.step);
    this.d.daylight.set(si <= stepIndex('globe') ? DIM : 0, REDUCED_MOTION ? 0 : 1.5);
    this.d.camp.setGlobe(1);
    this.holding = -1;
    this.d.place(10, -10, Math.atan2(OBSERVATORY.x - 10, OBSERVATORY.z + 10));
    this.applyLasting();
  }

  protected leave() {
    this.d.daylight.set(0, REDUCED_MOTION ? 0 : 1.2);
    this.showSteps(false);
    this.holding = -1;
    this.flagInter.forEach((f) => (f.off = true));
    this.tentInter.forEach((f) => (f.off = true));
    this.pedResolve = null;
    this.placeFlags();
  }

  /* ---------- desafio: escadas de luz ---------- */

  private showSteps(on: boolean) {
    const col = this.d.camp.col;
    this.steps.forEach((m) => (m.visible = on));
    for (const b of this.stepBoxes) {
      const i = col.boxes.indexOf(b);
      if (on && i < 0) col.boxes.push(b);
      if (!on && i >= 0) col.boxes.splice(i, 1);
    }
  }

  protected beginSkill() {
    this.showSteps(true);
  }

  protected afterSkill() {
    this.showSteps(false);
  }

  protected pieceSpot(i: number, t: number) {
    const v = starSpot(i, Math.sin(t * 2 + i) * 0.12);
    return new THREE.Vector3(v.x, v.y, v.z);
  }

  protected onPiece(i: number) {
    // a estrela sobe e brilha no céu escuro
    const at = this.pieceSpot(i, 0);
    this.d.fx.puff(at.x, at.y + 2, at.z, { n: 20, color: 0xfff1b0, add: true, sp: 4, up: 6, s: 0.6, life: 1.2 });
  }

  protected skillObjective(): Spot | null {
    const p = this.d.player;
    if (p.y < OBS_TOP - 0.5) {
      const [dx, dz] = OBS_STEPS[0];
      return { x: OBSERVATORY.x + dx, z: OBSERVATORY.z + dz };
    }
    const i = [0, 1, 2].find((k) => !this.state.got.includes(k));
    if (i === undefined) return null;
    const last = STAR_STEPS[i][STAR_STEPS[i].length - 1];
    return { x: OBSERVATORY.x + last.dx, z: OBSERVATORY.z + last.dz };
  }

  /* ---------- Pedrito: as bandeirinhas das classes ---------- */

  protected pedritoSpot(): Spot {
    return { x: FLAG.x + 1, z: FLAG.z - 1.6 };
  }

  protected pedritoChallenge() {
    this.syncFlags();
    this.placeFlags();
    return new Promise<void>((res) => (this.pedResolve = res));
  }

  private syncFlags() {
    const on = this.active && this.state.step === 'pedrito' && this.pedStarted;
    this.flagInter.forEach((f, i) => (f.off = !on || this.state.ped.includes(i) || this.holding === i));
    this.tentInter.forEach((f, i) => (f.off = !on || this.holding < 0 || this.state.ped.includes(i)));
  }

  protected pedritoInteract(o: Interactable) {
    const p = this.content.pedrito as DayContent['pedrito'] & Record<string, string>;
    const fi = this.flagInter.indexOf(o);
    if (fi >= 0) {
      if (this.holding >= 0) this.flags[this.holding].visible = true;
      this.holding = fi;
      this.carry(this.flags[fi]);
      sfx('ui');
      this.d.hud.say(p.got.replace('{x}', CLASSES[fi].n), 5000);
      this.placeFlags();
      this.syncFlags();
      return true;
    }
    const ti = this.tentInter.indexOf(o);
    if (ti < 0 || this.holding < 0) return false;
    if (ti !== this.holding) {
      sfx('ui');
      this.d.hud.say(p.wrong, 5000);
      return true;
    }
    const f = this.flags[ti];
    this.carried = null; // sem esconder: ela fica fincada
    this.holding = -1;
    sfx('coin');
    const at = this.tentFlagSpot(ti);
    this.d.fx.puff(at.x, H(at.x, at.z) + 1.3, at.z, { n: 14, color: CLASSES[ti].c, sp: 2.5, up: 2, s: 0.4 });
    this.pedDone(ti);
    f.visible = true;
    this.placeFlags();
    this.syncFlags();
    const left = this.pedParts - this.state.ped.length;
    if (left > 0) this.d.hud.say(p.left.replace('{x}', String(left)), 4500);
    else {
      const r = this.pedResolve;
      this.pedResolve = null;
      r?.();
    }
    return true;
  }

  protected pedritoObjective(): Spot | null {
    if (this.holding >= 0) return this.tentFlagSpot(this.holding);
    const i = [0, 1, 2, 3].find((k) => !this.state.ped.includes(k));
    return i === undefined ? null : this.flagHome(i);
  }

  /* ---------- Globo ---------- */

  protected restore(k: number) {
    this.d.camp.setGlobeLayer(4, k);
    this.d.daylight.set(DIM * (1 - k));
  }
}
