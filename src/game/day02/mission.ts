import * as THREE from 'three';
import { BUOY_COUNT, Day02, Step, complete, foundBuoy, mistLevel, newDay02, stepIndex } from './state';
import { BOAT, BOAT_DOCK, BUOYS, LANDINGS, LANDING_NEAR, Landing, MARINA_SPOT, PIER, PIER_TIP, PIER_TOP, RINGS, hullInWater, ringYaw } from './layout';
import { GALLEON_DECK, GALLEON_SEATS } from '../../world/builders/galleon';
import type { MissionDeps } from '../day01/mission';
import { Question } from '../quiz';
import { GLOBE } from '../../world/camp';
import { Interactable } from '../../world/interactables';
import { sparkTex } from '../../world/fx';
import { radialTex } from '../../world/textures';
import { Rig, animate } from '../../world/builders/kid';
import { makeMarina } from '../../world/builders/marina';
import { H, WY } from '../../world/terrain';
import { REDUCED_MOTION, TOUCH } from '../../engine/gfx';
import { sfx } from '../../engine/audio';
import { angLerp, lerp } from '../../engine/math';
import { speak } from '../../engine/speech';
import { $ } from '../../ui/hud';

/* Missão 2 do Éden: "O Céu e as Águas" (docs/DAY_02.md). Textos em public/data/days/day02.json. */

interface Said {
  who: string;
}
export interface Day02Content {
  title: string;
  start: Said & { lines: string[]; go: string };
  marina: Said & { hello: string[]; board: string[]; again: string[]; after: string[]; free: string[]; wait: string[]; freeBye: string };
  boat: Said & { controls: string; controlsKeys: string; rings: string; ring: string; leave: string; pedrito: string[] };
  buoys: { left: string[]; done: string[] };
  next: { table: string; hill: string };
  readings: Record<'r1' | 'r2', { ref: string; keys: string[] }>;
  questions: Record<'expanse' | 'skyName', Question>;
  sort: { title: string; prompt: string; bins: { group: string; label: string; icon: string; other: string }[]; items: { id: string; name: string; group: string }[]; done: string[] };
  pedrito: { call: string[]; after: string[] };
  vow: { ideal: string; title: string; distractors: string[]; lit: string };
  globe: { go: string; voice: string; after: string[] };
  rewards: { badge: string; badgeNote: string; lantern: string; stars: number };
  realMission: { text: string; adult: string };
  creation: { recap: { title: string; intro: string; items: { icon: string; game: string; creation: string }[]; close: string } };
}

interface Bible {
  verses: Record<string, string>;
}
export interface ClubTexts {
  ideals: Record<string, { title: string; text: string }>;
}

const url = (p: string) => new URL(p, document.baseURI).toString();

export async function loadDay02() {
  const [content, club] = await Promise.all([
    fetch(url('data/days/day02.json')).then((r) => r.json() as Promise<Day02Content>),
    fetch(url('data/content/club-texts.json'))
      .then((r) => r.json() as Promise<ClubTexts>)
      .catch(() => ({ ideals: {} }) as ClubTexts),
  ]);
  return { content, club };
}

/** o Voto fica no primeiro Quadro dos Ideais */
const VOW_BOARD = 0;
const mistTex = radialTex([
  [0, 'rgba(240,244,248,0.95)'],
  [0.55, 'rgba(225,231,237,0.45)'],
  [1, 'rgba(225,231,237,0)'],
]);

export class Day02Mission {
  active = false;
  busy = false;
  state: Day02;
  /** a criança está no barco (main.ts manda o movimento para drive() em vez da física a pé) */
  riding = false;
  /** passeio livre depois do Dia 2 (sem boias) */
  private free = false;
  private goalText = '';
  private marina: Rig;
  private marinaInter: Interactable;
  private tipInter: Interactable;
  private boardInter: Interactable;
  /** onde o galeão ficou parado quando a criança desceu numa ilha (null: no cais) */
  private parked: Landing | null = null;
  /** perto de qual lugar de descer o barco está agora */
  private near: Landing | null = null;
  private buoys: THREE.Group[] = [];
  private pieces: THREE.Group[] = [];
  private rings: { g: THREE.Group; spin: number; cool: number }[] = [];
  private mist: THREE.Sprite[] = [];
  private boat = { x: BOAT_DOCK.x, z: BOAT_DOCK.z, ry: BOAT_DOCK.ry, vx: 0, vz: 0, boost: 0, bump: 0, wake: 0 };
  private pedFollow = { x: 0, z: 0, y: 0 };
  private pedRides = false;
  private globeOverride = false;
  /** o barco já foi levado para o cais novo */
  private docked = false;

  constructor(
    private d: MissionDeps,
    private content: Day02Content,
    private bible: Bible,
    private club: ClubTexts,
  ) {
    this.state = d.save.data.day02 ?? newDay02();
    const { scene, camp } = d;
    const top = PIER_TOP;
    this.marina = makeMarina();
    this.marina.root.position.set(MARINA_SPOT.x, Math.max(H(MARINA_SPOT.x, MARINA_SPOT.z), top + 0.07), MARINA_SPOT.z);
    this.marina.root.rotation.y = -Math.PI / 2; // olha para o lago
    this.marina.root.visible = false;
    scene.add(this.marina.root);
    const mp = this.marina.root.position;
    this.marinaInter = camp.inter.add({ id: 'marina-npc', npc: 'marina', x: mp.x, z: mp.z, y: mp.y, w: 1.8, h: 3.8, name: 'Capitã Marina', label: 'Conversar', who: 'Capitã Marina', lines: content.marina.wait, off: true });
    this.tipInter = camp.inter.add({ id: 'pier-tip', x: BOAT_DOCK.x, z: BOAT_DOCK.z, y: WY, w: 4.2, h: 4, name: 'Cais', label: content.boat.leave, who: 'Tico', text: '', off: true });
    // galeão parado numa ilha: tocar para subir de novo
    this.boardInter = camp.inter.add({ id: 'boat-board', x: BOAT_DOCK.x, z: BOAT_DOCK.z, y: WY, w: 6, h: 4, name: 'Galeão', label: 'Subir no barco', who: 'Tico', text: '', off: true });

    // boias: corpo vermelho e branco, um pedaço de luz dourado em cima
    const red = new THREE.MeshStandardMaterial({ color: 0xe0482f, roughness: 0.5 }),
      white = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.5 });
    const halo = new THREE.SpriteMaterial({ map: sparkTex, color: 0xffd76a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const cube = new THREE.MeshBasicMaterial({ color: 0xffe9a0 });
    BUOYS.forEach((b) => {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.62 - i * 0.12, 0.66 - i * 0.12, 0.34, 14), i % 2 ? white : red);
        m.position.y = i * 0.32;
        m.castShadow = true;
        g.add(m);
      }
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), white);
      mast.position.y = 1.2;
      g.add(mast);
      g.position.set(b.x, WY, b.z);
      g.visible = false;
      scene.add(g);
      this.buoys.push(g);
      const pc = new THREE.Group();
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), cube);
      const h = new THREE.Sprite(halo);
      h.scale.setScalar(1.8);
      pc.add(c, h);
      pc.visible = false;
      scene.add(pc);
      this.pieces.push(pc);
    });
    // anéis de vento: argola de boias com fitas brancas que giram
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x7fd4ff, emissive: 0x3fa9e6, emissiveIntensity: 0.7, roughness: 0.35 });
    const ribbon = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false });
    RINGS.forEach((r) => {
      const g = new THREE.Group();
      const tor = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.2, 8, 36), ringMat);
      g.add(tor);
      const spin = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1.5), ribbon);
        const a = (i / 4) * Math.PI * 2;
        f.position.set(Math.cos(a) * 1.6, Math.sin(a) * 1.6, 0);
        f.rotation.z = a;
        spin.add(f);
      }
      g.add(spin);
      g.position.set(r.x, WY + 1.6, r.z);
      g.rotation.y = ringYaw(r);
      g.visible = false;
      scene.add(g);
      this.rings.push({ g, spin: 0, cool: 0 });
    });
    // névoa: nuvens baixas e macias pelo acampamento, mais grossas sobre o lago
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0 }));
      const overLake = i < 26,
        a = i * 2.39996,
        r = overLake ? 4 + (i % 6) * 6.5 : 8 + (i % 5) * 5.5;
      const cx = overLake ? -60 : 0,
        cz = overLake ? 4 : 4;
      s.position.set(cx + Math.cos(a) * r, WY + 1.4 + (i % 3) * 0.9, cz + Math.sin(a) * r);
      s.scale.set(16 + (i % 4) * 4, 5 + (i % 3) * 1.5, 1);
      s.visible = false;
      scene.add(s);
      this.mist.push(s);
    }
    this.applyLasting();
  }

  get done() {
    return this.state.step === 'done';
  }

  /** O que fica no acampamento depois de cada etapa, mesmo fora da missão. */
  private applyLasting() {
    const si = stepIndex(this.state.step);
    const vow = this.club.ideals[this.content.vow.ideal];
    if (si > stepIndex('vow') && vow) this.d.camp.setIdeal(VOW_BOARD, vow.text);
    if (this.done) this.d.camp.setGlobeSky(1);
  }

  /** o Dia 2 só existe depois do Dia 1: a Capitã Marina e o cais aparecem junto com ele */
  private get unlocked() {
    return this.d.save.data.day01?.step === 'done';
  }

  private set(s: Day02) {
    this.state = s;
    this.d.save.update({ day02: s });
    this.refresh();
  }

  private q(k: keyof Day02Content['questions']) {
    const q = this.content.questions[k];
    return q.enabled ? this.d.task.quiz(q) : Promise.resolve();
  }

  private async read(k: keyof Day02Content['readings']) {
    const r = this.content.readings[k];
    const verses = r.keys.map((key) => this.bible.verses[key]).filter(Boolean);
    const v = verses.length === r.keys.length ? verses : null;
    await this.d.task.reading(r.ref, v);
    this.d.task.review = { ref: r.ref, verses: v };
  }

  private endReview() {
    this.d.task.review = null;
  }

  private talk(who: string, lines: string[]) {
    return new Promise<void>((res) => this.d.hud.dialog(who, who, lines, res));
  }

  /* ---------- entrar e sair ---------- */

  start(replay = false) {
    if (replay || this.done) {
      this.state = newDay02();
      this.d.camp.setIdeal(VOW_BOARD, null);
      this.d.camp.setGlobeSky(0);
    }
    this.active = true;
    this.d.daylight.set(0, REDUCED_MOTION ? 0 : 1);
    this.d.daylight.setMist(mistLevel(this.state), REDUCED_MOTION ? 0 : 1.5);
    this.d.place(0, 12, Math.PI);
    this.d.camp.setGlobe(1);
    this.parked = null;
    this.boardInter.off = true;
    this.boatHome();
    const p = this.d.player;
    Object.assign(this.pedFollow, { x: p.x + 1.5, z: p.z + 1.5, y: p.y });
    this.set(this.state);
    void this.run();
  }

  exit(wantsNext = false) {
    if (this.riding || this.parked) this.stopRide();
    this.active = false;
    this.endReview();
    this.d.daylight.setMist(0, REDUCED_MOTION ? 0 : 1.2);
    this.pieces.forEach((m) => (m.visible = false));
    this.buoys.forEach((b) => (b.visible = false));
    this.rings.forEach((r) => (r.g.visible = false));
    this.d.hud.show('goal', false);
    this.d.forceControls(false);
    this.pedRides = false;
    this.applyLasting();
    this.d.onExit(this.done, wantsNext);
  }

  private refresh() {
    const s = this.state,
      si = stepIndex(s.step);
    this.buoys.forEach((b, i) => (b.visible = this.active && s.step === 'boat' && !s.buoys.includes(i)));
    this.rings.forEach((r) => (r.g.visible = this.riding));
    this.pieces.forEach((m) => (m.visible = this.active && si >= stepIndex('boat') && si <= stepIndex('globe')));
    const goals: Partial<Record<Step, string>> = {
      mist: 'Fale com a Capitã Marina',
      boat: this.riding ? `Ache as boias de luz (${s.buoys.length}/3)` : 'Fale com a Capitã Marina',
      waters: 'Vá até a Mesa da Família',
      vow: 'Ajude o Pedrito na colina',
      globe: 'Leve a luz ao Globo',
    };
    this.goalText = this.active ? (goals[s.step] ?? '') : '';
    $('goalt').textContent = this.goalText;
    this.d.hud.show('goal', this.active && !!this.goalText);
  }

  get goal() {
    return this.goalText;
  }

  /** Para onde a ajuda (coluna de luz e bússola) aponta agora. */
  objective(): { x: number; z: number; hint: string } | null {
    const s = this.state,
      p = this.d.player;
    switch (s.step) {
      case 'mist':
        return { ...MARINA_SPOT, hint: this.content.start.go };
      case 'boat': {
        if (!this.riding && this.parked) return { x: this.parked.boat.x, z: this.parked.boat.z, hint: 'Volte para o barco!' };
        if (!this.riding) return { ...MARINA_SPOT, hint: this.content.start.go };
        let best: { x: number; z: number } | null = null;
        BUOYS.forEach((b, i) => {
          if (!s.buoys.includes(i) && (!best || Math.hypot(b.x - p.x, b.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z))) best = b;
        });
        return best ? { ...(best as { x: number; z: number }), hint: 'Siga o brilho até a boia!' } : null;
      }
      case 'waters':
        return { x: -9, z: 8, hint: this.content.next.table };
      case 'vow': {
        const b = this.d.camp.idealSpot(VOW_BOARD);
        return { x: b.x, z: b.z, hint: this.content.next.hill };
      }
      case 'globe':
        return { x: GLOBE.x, z: GLOBE.z + 4, hint: this.content.globe.go };
      default:
        return null;
    }
  }

  /* ---------- etapas ---------- */

  private async run() {
    if (this.state.step === 'mist') {
      this.busy = true;
      await this.talk(this.content.start.who, this.content.start.lines);
      this.busy = false;
      this.d.hud.say(this.content.start.go, 7000);
    } else this.d.hud.say(`Vamos continuar: ${this.goalText.toLowerCase()}.`, 5000);
  }

  onInteract(o: Interactable): boolean {
    if (this.busy) return false;
    if (o.id === 'pier-tip' && this.riding) {
      void this.leaveBoat();
      return true;
    }
    if (o.id === 'boat-board' && !this.riding && this.parked) {
      void this.board(this.free);
      return true;
    }
    if (o.npc === 'marina') {
      void this.marinaTalk();
      return true;
    }
    if (!this.active) return false;
    const s = this.state;
    if (o.id === 'table' && s.step === 'waters') {
      void this.watersStep();
      return true;
    }
    if ((o.id === 'ideal' + VOW_BOARD || o.npc === 'pedrito') && s.step === 'vow') {
      void this.vowStep();
      return true;
    }
    if (o.id === 'globe' && s.step === 'globe') {
      void this.globeStep();
      return true;
    }
    return false;
  }

  private faceMarina() {
    const m = this.marina.root,
      p = this.d.player;
    m.rotation.y = Math.atan2(p.x - m.position.x, p.z - m.position.z);
    p.face = Math.atan2(m.position.x - p.x, m.position.z - p.z);
  }

  private async marinaTalk() {
    const c = this.content.marina,
      s = this.state;
    this.busy = true;
    this.faceMarina();
    if (!this.active) {
      // fora da missão: depois do Dia 2, passeio livre de barco
      await this.talk(c.who, this.done ? c.free : c.wait);
      this.busy = false;
      if (this.done) await this.board(true);
      return;
    }
    if (s.step === 'mist') {
      await this.talk(c.who, c.hello);
      this.set(complete(this.state, 'mist'));
      await this.talk(c.who, c.board);
      this.busy = false;
      return this.board(false);
    }
    if (s.step === 'boat') {
      await this.talk(c.who, c.again);
      this.busy = false;
      return this.board(false);
    }
    await this.talk(c.who, stepIndex(s.step) > stepIndex('boat') ? c.after : c.wait);
    this.busy = false;
  }

  private boatHome() {
    Object.assign(this.boat, { x: BOAT_DOCK.x, z: BOAT_DOCK.z, ry: BOAT_DOCK.ry, vx: 0, vz: 0, boost: 0 });
    this.placeBoat();
  }

  /** Sobe no barco amarrado ao cais. No Dia 2, o Pedrito vai junto. */
  private async board(free: boolean) {
    this.busy = true;
    this.free = free;
    this.d.hud.fade(true);
    await this.wait(REDUCED_MOTION ? 0 : 0.45);
    if (!this.parked) this.boatHome();
    this.parked = null;
    this.boardInter.off = true;
    this.riding = true;
    this.d.orbit.setZoom(19);
    this.pedRides = !free && this.active;
    this.tipInter.off = false;
    this.d.forceControls(true);
    this.seat();
    this.d.place(this.d.player.x, this.d.player.z, this.boat.ry);
    this.seat();
    this.refresh();
    this.d.hud.fade(false);
    sfx('horn');
    this.busy = false;
    const b = this.content.boat;
    const tip = TOUCH ? b.controls : b.controlsKeys;
    if (this.pedRides && this.state.buoys.length === 0) {
      await this.talk('Pedrito', b.pedrito);
      this.d.hud.say(`${tip} ${b.rings}`, 8000);
    } else this.d.hud.say(free ? `${tip} ${b.rings}` : tip, 6000);
  }

  /** Desce do barco: no cais ele fica amarrado; numa ilha, fica parado esperando a criança voltar. */
  private async leaveBoat() {
    const at = this.near ?? LANDINGS[0];
    this.busy = true;
    this.d.hud.fade(true);
    await this.wait(REDUCED_MOTION ? 0 : 0.45);
    if (at.id === 'pier') this.stopRide();
    else this.stopRide(at);
    this.d.hud.fade(false);
    this.busy = false;
    if (at.id !== 'pier') this.d.hud.say(`Você chegou na ${at.name}! O barco espera aqui.`, 4500);
    else if (this.free) this.d.hud.say(this.content.marina.freeBye, 4000);
    else if (this.active && this.state.step === 'boat') this.d.hud.say(this.content.marina.again[0], 5000);
  }

  /** Para de dirigir. Sem lugar: volta para o cais. Com uma ilha: o barco fica parado ali. */
  private stopRide(at: Landing | null = null) {
    this.riding = false;
    this.tipInter.off = true;
    this.near = null;
    this.d.orbit.setZoom(13);
    this.d.forceControls(false);
    if (at) {
      this.parked = at;
      Object.assign(this.boat, { x: at.boat.x, z: at.boat.z, ry: at.boat.ry, vx: 0, vz: 0, boost: 0 });
      this.placeBoat();
      Object.assign(this.boardInter, { x: at.boat.x, z: at.boat.z, off: false });
      this.boardInter.mesh?.position.set(at.boat.x, WY + 2, at.boat.z);
      this.d.place(at.land.x, at.land.z, Math.atan2(at.land.x - at.boat.x, at.land.z - at.boat.z));
    } else {
      this.parked = null;
      this.boardInter.off = true;
      this.boatHome();
      this.d.place(PIER_TIP.x, PIER_TIP.z, Math.PI / 2);
    }
    this.refresh();
  }

  private placeBoat() {
    const b = this.d.camp.boat;
    b.position.x = this.boat.x;
    b.position.z = this.boat.z;
    b.rotation.y = this.boat.ry - Math.PI / 2; // o casco é comprido em x
  }

  /** coloca a criança no leme do galeão, de frente para a proa */
  private seat() {
    const p = this.d.player,
      b = this.boat,
      k = GALLEON_SEATS.helm;
    Object.assign(p, { x: b.x + Math.sin(b.ry) * k, z: b.z + Math.cos(b.ry) * k, y: this.d.camp.boat.position.y + GALLEON_DECK, vx: 0, vz: 0, vy: 0, st: 'ground', boost: null, face: b.ry });
  }

  private waterOk(x: number, z: number, ry = this.boat.ry) {
    return hullInWater(x, z, ry);
  }

  /** Movimento no barco (chamado por main.ts no lugar da física a pé). ix, iz: direção; m: quanto. */
  drive(ix: number, iz: number, m: number, dt: number) {
    const b = this.boat,
      boost = b.boost > 0 ? BOAT.boost : 1;
    b.boost = Math.max(0, b.boost - dt);
    b.bump = Math.max(0, b.bump - dt);
    const sp = BOAT.speed * boost,
      tx = ix * sp * m,
      tz = iz * sp * m;
    const k = Math.min(1, dt * (m > 0.05 ? BOAT.accel : 1.1));
    b.vx = lerp(b.vx, b.boost > 0 && m < 0.05 ? b.vx : tx, k);
    b.vz = lerp(b.vz, b.boost > 0 && m < 0.05 ? b.vz : tz, k);
    let nx = b.x + b.vx * dt,
      nz = b.z + b.vz * dt;
    // pedras quase submersas (topo rente à água) não seguram o barco
    const body = { x: nx, y: WY + 0.12, z: nz };
    this.d.camp.col.pushOut(body, BOAT.radius);
    nx = body.x;
    nz = body.z;
    if (!this.waterOk(nx, nz)) {
      // desliza pela margem: tenta só um eixo de cada vez
      const dx = nx - b.x,
        dz = nz - b.z;
      let moved = false;
      // escorrega pela margem: tenta virar aos poucos (45° e 90° para cada lado) até achar água
      for (const a of [0.785, -0.785, 1.571, -1.571]) {
        const c = Math.cos(a) * 0.8,
          sn = Math.sin(a) * 0.8,
          tx2 = b.x + dx * c - dz * sn,
          tz2 = b.z + dx * sn + dz * c;
        if (this.waterOk(tx2, tz2)) {
          nx = tx2;
          nz = tz2;
          moved = true;
          break;
        }
      }
      if (!moved) {
        nx = b.x;
        nz = b.z;
      }
      b.vx *= 0.4;
      b.vz *= 0.4;
      if (b.bump <= 0 && Math.hypot(b.vx, b.vz) > 0.8) {
        sfx('ui');
        b.bump = 0.6;
      }
    }
    b.x = nx;
    b.z = nz;
    const spd = Math.hypot(b.vx, b.vz);
    if (spd > 0.3) {
      // o galeão vira devagar; se a proa ou a popa fossem bater na margem, não vira
      const ry = angLerp(b.ry, Math.atan2(b.vx, b.vz), Math.min(1, dt * BOAT.turn));
      if (this.waterOk(b.x, b.z, ry)) b.ry = ry;
    }
    this.placeBoat();
    this.seat();
    this.updateNear();
    // rastro de espuma atrás do barco
    b.wake -= dt;
    if (spd > 1 && b.wake <= 0) {
      b.wake = b.boost > 0 ? 0.04 : 0.09;
      this.d.fx.puff(b.x - Math.sin(b.ry) * 3.4, WY + 0.08, b.z - Math.cos(b.ry) * 3.4, { n: b.boost > 0 ? 4 : 3, color: 0xffffff, sp: 1, up: 0.8, g: 3, s: 0.6 });
      for (const sd of [-1, 1]) this.d.fx.puff(b.x + Math.sin(b.ry) * 3.2 + Math.cos(b.ry) * sd * 0.8, WY + 0.08, b.z + Math.cos(b.ry) * 3.2 - Math.sin(b.ry) * sd * 0.8, { n: 1, color: 0xffffff, sp: 0.8, up: 0.6, g: 3, s: 0.4 });
    }
    this.checkRings(dt);
    this.checkBuoys();
  }

  /** Mostra o botão de descer quando o barco chega perto do cais ou de uma ilha. */
  private updateNear() {
    const b = this.boat;
    let best: Landing | null = null;
    for (const l of LANDINGS) if (Math.hypot(b.x - l.boat.x, b.z - l.boat.z) < LANDING_NEAR) best = l;
    if (best === this.near) return;
    this.near = best;
    const t = this.tipInter;
    t.off = !best;
    if (best) {
      t.x = b.x;
      t.z = b.z;
      t.label = best.id === 'pier' ? this.content.boat.leave : `Descer na ${best.name}`;
      t.mesh?.position.set(b.x, WY + 2, b.z);
    }
  }

  /** Buzina (botão A no barco). */
  horn() {
    sfx('horn');
    this.d.fx.puff(this.boat.x, WY + 2.2, this.boat.z, { n: 4, color: 0xffffff, sp: 0.6, up: 1.4, g: -0.5, s: 0.5, life: 0.8 });
  }

  private checkRings(dt: number) {
    const b = this.boat;
    this.rings.forEach((r, i) => {
      r.cool = Math.max(0, r.cool - dt);
      r.spin += dt * (r.cool > 0 ? 9 : 1.5);
      (r.g.children[1] as THREE.Group).rotation.z = r.spin;
      if (r.cool > 0 || Math.hypot(b.x - RINGS[i].x, b.z - RINGS[i].z) > 2.4) return;
      r.cool = 3;
      b.boost = BOAT.boostT;
      // empurra para a frente, na direção em que o barco já vai
      const f = Math.max(Math.hypot(b.vx, b.vz), 3);
      b.vx = Math.sin(b.ry) * f * BOAT.boost;
      b.vz = Math.cos(b.ry) * f * BOAT.boost;
      sfx('jump2');
      this.d.sting('faisca');
      this.d.fx.puff(RINGS[i].x, WY + 1.6, RINGS[i].z, { n: 16, tex: sparkTex, color: 0xbfe8ff, add: true, sp: 3, up: 1.5, s: 0.5, life: 0.6 });
      this.d.hud.say(this.content.boat.ring, 1200);
    });
  }

  private checkBuoys() {
    const s = this.state;
    if (!this.active || s.step !== 'boat' || this.busy) return;
    BUOYS.forEach((bu, i) => {
      if (s.buoys.includes(i) || Math.hypot(this.boat.x - bu.x, this.boat.z - bu.z) > BOAT.pick) return;
      sfx('coin');
      this.d.sting('faisca');
      this.d.fx.puff(bu.x, WY + 2.6, bu.z, { n: 16, tex: sparkTex, color: 0xffe28a, add: true, sp: 3, up: 2.5, s: 0.5, life: 0.7 });
      this.d.fx.puff(bu.x, WY + 0.2, bu.z, { n: 10, color: 0xffffff, sp: 2.5, up: 2.5, g: 5 });
      this.set(foundBuoy(this.state, i));
      const n = this.state.buoys.length;
      this.d.daylight.setMist(mistLevel(this.state), REDUCED_MOTION ? 0 : 2);
      if (n === 1) void this.firstBuoy();
      else if (n < BUOY_COUNT) this.d.hud.say(this.content.buoys.left[BUOY_COUNT - n - 1], 4000);
      else void this.allBuoys();
    });
  }

  /** Primeira boia: a leitura de Gn 1:6-7 e a pergunta. */
  private async firstBuoy() {
    this.busy = true;
    await this.wait(0.8);
    await this.read('r1');
    await this.q('expanse');
    this.endReview();
    this.busy = false;
    this.d.hud.say(this.content.buoys.left[1], 6000);
  }

  /** Três boias: o barco volta ao cais e o Pedrito corre para a colina. */
  private async allBuoys() {
    this.busy = true;
    await this.talk('Tico', this.content.buoys.done);
    this.stopRide();
    this.pedRides = false;
    this.faceMarina();
    await this.talk(this.content.marina.who, this.content.marina.after);
    this.busy = false;
    sfx('yay');
    this.d.hud.say(this.content.next.table, 6000);
  }

  private async watersStep() {
    this.busy = true;
    await this.read('r2');
    const st = this.content.sort;
    await this.d.task.sort(st.prompt, st.items, st.bins, st.title);
    await this.talk('Tico', st.done);
    await this.q('skyName');
    this.endReview();
    this.busy = false;
    this.set(complete(this.state, 'waters'));
    this.d.hud.say(this.content.next.hill, 6000);
  }

  private async vowStep() {
    this.busy = true;
    const v = this.content.vow,
      ideal = this.club.ideals[v.ideal];
    const ped = this.d.ped.root.position,
      p = this.d.player;
    this.d.ped.root.rotation.y = Math.atan2(p.x - ped.x, p.z - ped.z);
    await this.talk('Pedrito', this.content.pedrito.call);
    if (ideal) {
      const words = ideal.text.replace(/[.,;:!?]/g, '').split(/\s+/).filter(Boolean);
      await this.d.task.words(v.title, words, v.distractors, 'no Voto');
      sfx('yay');
      this.d.sting('vitoria');
      this.d.camp.setIdeal(VOW_BOARD, ideal.text);
      const b = this.d.camp.idealSpot(VOW_BOARD);
      this.d.fx.puff(b.x, H(b.x, b.z) + 2.2, b.z, { n: 26, tex: sparkTex, color: 0xffe28a, add: true, sp: 3.5, up: 2.5, s: 0.55, life: 1 });
      await this.talk('Tico', [v.lit]);
      await this.talk('Quadros dos Ideais', [ideal.text]);
    }
    await this.talk('Pedrito', this.content.pedrito.after);
    this.busy = false;
    this.set(complete(this.state, 'vow'));
    this.d.hud.say(this.content.globe.go, 7000);
  }

  private async globeStep() {
    this.busy = true;
    this.globeOverride = true;
    this.d.hud.hideTico();
    const { orbit, player: p } = this.d;
    p.face = Math.atan2(GLOBE.x - p.x, GLOBE.z - p.z);
    orbit.want = Math.atan2(p.x - GLOBE.x, p.z - GLOBE.z) + 0.3;
    orbit.setZoom(17);
    const gy = H(GLOBE.x, GLOBE.z) + 3.6;
    const from = this.pieces.map((m) => m.position.clone());
    await this.animate(1.6, (k) => {
      const e = k * k * (3 - 2 * k);
      this.pieces.forEach((m, i) => m.position.set(lerp(from[i].x, GLOBE.x, e), lerp(from[i].y, gy, e) + Math.sin(e * Math.PI) * 2, lerp(from[i].z, GLOBE.z, e)));
    });
    this.pieces.forEach((m) => (m.visible = false));
    // a Voz: só texto, luz e o Globo (Deus não é representado)
    const v = $('voice');
    v.textContent = this.content.globe.voice;
    v.classList.remove('show');
    void v.offsetWidth;
    v.classList.add('show');
    speak(this.content.globe.voice, 'A Voz');
    sfx('yay');
    this.d.sting('vitoria');
    // o céu abre: a névoa some do acampamento inteiro e o Globo ganha o céu e as águas
    this.d.daylight.setMist(0, REDUCED_MOTION ? 0 : 3);
    await this.animate(2.6, (k) => this.d.camp.setGlobeSky(k));
    this.d.fx.puff(GLOBE.x, gy, GLOBE.z, { n: 40, tex: sparkTex, color: 0xbfe8ff, add: true, sp: 6, up: 4, s: 0.7, life: 1.4 });
    await this.wait(REDUCED_MOTION ? 0 : 1.2);
    await this.talk('Tico', this.content.globe.after);
    orbit.want = null;
    orbit.setZoom(13);
    this.globeOverride = false;
    this.set(complete(this.state, 'globe'));
    await this.d.task.recap(this.content.creation.recap);
    const r = this.content.rewards,
      save = this.d.save;
    save.update({ badges: [...new Set([...save.data.badges, r.badge])] });
    const res = await this.d.task.reward({
      title: this.content.title,
      badge: r.badge,
      note: r.badgeNote,
      lantern: r.lantern,
      stars: r.stars,
      real: this.content.realMission.text,
      adult: this.content.realMission.adult,
      realDone: this.state.realMission,
    });
    this.set({ ...this.state, realMission: res.realMission });
    const fb = await this.d.task.feedback();
    if (fb) save.update({ feedback: { ...save.data.feedback, day02: fb } });
    this.busy = false;
    this.exit(fb?.wantsNext === true);
  }

  private animate(seconds: number, f: (k: number) => void) {
    if (REDUCED_MOTION) {
      f(1);
      return Promise.resolve();
    }
    return new Promise<void>((res) => {
      const t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / 1000 / seconds);
        f(k);
        if (k < 1) requestAnimationFrame(tick);
        else res();
      };
      tick();
    });
  }

  private wait(s: number) {
    return new Promise<void>((r) => setTimeout(r, s * 1000));
  }

  cameraOverride(_dt: number) {
    return false;
  }

  /** O Pedrito é controlado pela missão enquanto ela está ativa. */
  get drivesPedrito() {
    return this.active;
  }
  /** a Capitã Marina saiu do cais (Dia 5: ela espera na praia do recife) */
  away = false;

  /* ---------- a cada quadro ---------- */

  update(dt: number, t: number) {
    const open = this.unlocked;
    this.marina.root.visible = open && !this.away;
    if (open && !this.docked && !this.riding && !this.parked) {
      this.boatHome();
      this.docked = true;
    }
    this.marinaInter.off = !open || this.riding || this.away;
    const p = this.d.player;
    if (open) animate(this.marina, dt, { wave: !this.riding && Math.hypot(p.x - MARINA_SPOT.x, p.z - MARINA_SPOT.z) < 6 });
    // névoa: só durante o Dia 2
    const mist = this.d.daylight.mist;
    for (const s of this.mist) {
      s.visible = mist > 0.02;
      if (s.visible) {
        s.material.opacity = Math.min(0.85, mist * 0.8);
        s.position.x += Math.sin(t * 0.1 + s.position.z) * dt * 0.3;
      }
    }
    if (this.riding) this.rings.forEach((r) => (r.g.visible = true));
    if (!this.active) {
      if (this.riding) this.pedRides = false;
      return;
    }
    const s = this.state,
      si = stepIndex(s.step);
    // boias balançam; os pedaços de luz ficam em cima delas ou orbitando a criança
    let orbitN = 0;
    BUOYS.forEach((bu, i) => {
      const g = this.buoys[i];
      g.position.y = WY - 0.1 + Math.sin(t * 1.6 + i) * 0.08;
      g.rotation.z = Math.sin(t * 1.2 + i) * 0.08;
      const m = this.pieces[i];
      if (!m.visible || this.globeOverride) return;
      m.children[0].rotation.set(t * 1.3, t * 1.7, 0);
      const found = s.buoys.includes(i) || si > stepIndex('boat');
      if (!found) m.position.set(bu.x, WY + 1.9 + Math.sin(t * 2.4 + i) * 0.18, bu.z);
      else {
        const a = t * 1.6 + orbitN * 2.1;
        orbitN++;
        m.position.set(p.x + Math.cos(a) * 0.9, p.y + 2.5 + Math.sin(t * 3 + i) * 0.12, p.z + Math.sin(a) * 0.9);
      }
    });

    // Pedrito: no cais esperando, no barco junto, na colina diante do quadro, depois acompanha
    const ped = this.d.ped,
      pi = this.d.camp.inter.byId('pedrito-npc');
    const board = this.d.camp.idealSpot(VOW_BOARD);
    if (this.pedRides && (this.riding || this.parked)) {
      const b = this.boat,
        k = GALLEON_SEATS.bow;
      ped.root.position.set(b.x + Math.sin(b.ry) * k, this.d.camp.boat.position.y + GALLEON_SEATS.bowY, b.z + Math.cos(b.ry) * k);
      ped.root.rotation.y = b.ry;
      animate(ped, dt, { wave: Math.hypot(b.vx, b.vz) > 4 });
      Object.assign(this.pedFollow, { x: ped.root.position.x, z: ped.root.position.z, y: ped.root.position.y });
    } else if (si <= stepIndex('boat')) {
      const x = PIER.x0 - 1.6,
        z = PIER.z - 0.4;
      ped.root.position.set(x, this.d.camp.col.groundAt(x, z, 2), z);
      animate(ped, dt, { mode: 'open', wave: Math.hypot(p.x - x, p.z - z) < 5 });
      Object.assign(this.pedFollow, { x, z, y: ped.root.position.y });
    } else if (si <= stepIndex('vow')) {
      const x = board.x + Math.sin(board.ry) * 2 + Math.cos(board.ry) * 1.6,
        z = board.z + Math.cos(board.ry) * 2 - Math.sin(board.ry) * 1.6;
      ped.root.position.set(x, H(x, z), z);
      if (!this.busy) ped.root.rotation.y = angLerp(ped.root.rotation.y, Math.atan2(p.x - x, p.z - z), 0.08);
      animate(ped, dt, { wave: Math.hypot(p.x - x, p.z - z) < 7 && !this.busy });
      Object.assign(this.pedFollow, { x, z, y: ped.root.position.y });
    } else {
      const f = this.pedFollow,
        tx = p.x - Math.sin(p.face - 0.8) * 1.8,
        tz = p.z - Math.cos(p.face - 0.8) * 1.8;
      const okLand = H(tx, tz) > WY;
      const dx = (okLand ? tx : f.x) - f.x,
        dz = (okLand ? tz : f.z) - f.z,
        d = Math.hypot(dx, dz);
      if (d > 0.35) {
        const st = Math.min(Math.min(d * 2.5, 6.5) * dt, d);
        f.x += (dx / d) * st;
        f.z += (dz / d) * st;
        ped.root.rotation.y = angLerp(ped.root.rotation.y, Math.atan2(dx, dz), 0.2);
      }
      if (d > 16) Object.assign(f, { x: p.x + 1, z: p.z + 1 });
      f.y = lerp(f.y, this.d.camp.col.groundAt(f.x, f.z, f.y + 0.5), 0.3);
      ped.root.position.set(f.x, f.y, f.z);
      animate(ped, dt, { walk: d > 0.35, speed: 3 });
    }
    if (pi) {
      pi.x = ped.root.position.x;
      pi.z = ped.root.position.z;
      pi.y = ped.root.position.y;
      pi.mesh?.position.set(pi.x, pi.y + 1.7, pi.z);
      // o Pedrito só responde quando é a vez dele (na colina); no resto, não disputa o botão de ação
      pi.off = s.step !== 'vow';
    }
  }
}
