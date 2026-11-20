import * as THREE from 'three';
import { Day01, SPARK_COUNT, complete, foundSpark, hungInvite, isNight, newDay01, stepIndex, Step } from './state';
import { Question } from '../quiz';
import { Player } from '../player';
import { Camp, CENTRAL_LAMP, GLOBE, MURALS } from '../../world/camp';
import { Interactable } from '../../world/interactables';
import { Fx, sparkTex } from '../../world/fx';
import { Daylight } from '../../world/daylight';
import { AV, Rig, animate, makeKid } from '../../world/builders/kid';
import { H, LAKE, WY } from '../../world/terrain';
import { Ambient, AmbientKind } from '../../engine/ambient';
import { OrbitCamera } from '../../engine/camera';
import { MOBILE, REDUCED_MOTION } from '../../engine/gfx';
import { sfx } from '../../engine/audio';
import { angLerp, lerp } from '../../engine/math';
import { speak } from '../../engine/speech';
import { Hud, $ } from '../../ui/hud';
import { Task } from '../../ui/task';
import { Save } from '../../persistence/save';

/* Missão 1 do Éden: "A Luz no Acampamento" (docs/DAY_01.md). Textos em public/data/days/day01.json. */

export interface Day01Content {
  title: string;
  start: string[];
  lantern: string[];
  readings: Record<'r1' | 'r2' | 'r3', { ref: string; keys: string[] }>;
  questions: Record<'beforeLight' | 'scarf' | 'lightName' | 'invite1' | 'invite2' | 'invite3', Question>;
  pedrito: { afraid: string[]; after: string[] };
  phrase: { fallback: string[]; distractors: string[]; done: string[] };
  sort: { prompt: string; items: { id: string; name: string; group: string }[]; done: string[] };
  invites: { sol: string[]; hung: string };
  globe: { go: string; voice: string; after: string[] };
  rewards: { badge: string; badgeNote: string; lantern: string; stars: number };
  realMission: { text: string; adult: string };
  creation: {
    afterReading1: string[];
    afterSparks: string[];
    afterLamp: string[];
    afterSort: string[];
    recap: { title: string; intro: string; items: { icon: string; game: string; creation: string }[]; close: string };
  };
}

interface Bible {
  verses: Record<string, string>;
}

const url = (p: string) => new URL(p, document.baseURI).toString();

export async function loadDay01() {
  const [content, bible] = await Promise.all([
    fetch(url('data/days/day01.json')).then((r) => r.json() as Promise<Day01Content>),
    fetch(url('data/content/bible-arc1898.json'))
      .then((r) => r.json() as Promise<Bible>)
      .catch(() => ({ verses: {} })),
  ]);
  return { content, bible };
}

/** Faíscas: sino perto do observatório, água corrente no cais, grilo na mata. */
export const SPARKS: { kind: AmbientKind; x: number; z: number }[] = [
  { kind: 'bell', x: 17, z: -12 },
  { kind: 'water', x: -15.5, z: LAKE.z + 4.5 },
  { kind: 'cricket', x: 28, z: 16 },
];
const PEDRITO_SPOT = { x: -6, z: 2.5 };

export interface MissionDeps {
  scene: THREE.Scene;
  camp: Camp;
  fx: Fx;
  hud: Hud;
  task: Task;
  daylight: Daylight;
  ambient: Ambient;
  orbit: OrbitCamera;
  save: Save;
  player: Player;
  ped: Rig;
  sol: Rig;
  /** coloca o jogador num ponto e reposiciona a câmera */
  place(x: number, z: number, face: number): void;
  /** volta ao acampamento normal (fim ou saída da missão) */
  onExit(done: boolean, wantsNext: boolean): void;
}

export class Day01Mission {
  active = false;
  /** cena dirigida em andamento (o jogo pausa) */
  busy = false;
  state: Day01;
  private sparkMeshes: THREE.Group[] = [];
  private campers: Rig[] = [];
  private pedFollow = { x: 0, z: 0, y: 0, hop: 0 };
  private lampK = 0;
  private globeK = 0;
  private goalText = '';

  constructor(
    private d: MissionDeps,
    private content: Day01Content,
    private bible: Bible,
  ) {
    this.state = d.save.data.day01 ?? newDay01();
    const halo = new THREE.SpriteMaterial({ map: sparkTex, color: 0xffd76a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const cube = new THREE.MeshBasicMaterial({ color: 0xffe9a0 });
    for (let i = 0; i < SPARK_COUNT; i++) {
      const g = new THREE.Group();
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), cube);
      const h = new THREE.Sprite(halo);
      h.scale.setScalar(1.6);
      g.add(c, h);
      g.visible = false;
      d.scene.add(g);
      this.sparkMeshes.push(g);
    }
    // acampantes ao lado dos murais (aparecem na etapa dos convites)
    MURALS.forEach(([x, z, ry], i) => {
      const k = makeKid({ ...AV[[1, 3, 5][i]], n: undefined });
      k.root.position.set(x + Math.sin(ry) * 1.6 + Math.cos(ry) * 1.6, 0, z + Math.cos(ry) * 1.6 - Math.sin(ry) * 1.6);
      k.root.position.y = H(k.root.position.x, k.root.position.z);
      k.root.rotation.y = ry;
      k.root.visible = false;
      d.scene.add(k.root);
      this.campers.push(k);
    });
    if (this.done) this.applyDone();
  }

  get done() {
    return this.state.step === 'done';
  }

  private set(s: Day01) {
    this.state = s;
    this.d.save.update({ day01: s });
    this.refresh();
  }

  private q(k: keyof Day01Content['questions']) {
    const q = this.content.questions[k];
    return q.enabled ? this.d.task.quiz(q) : Promise.resolve();
  }

  private read(k: keyof Day01Content['readings']) {
    const r = this.content.readings[k];
    const verses = r.keys.map((key) => this.bible.verses[key]).filter(Boolean);
    return this.d.task.reading(r.ref, verses.length === r.keys.length ? verses : null);
  }

  private talk(who: string, lines: string[]) {
    return new Promise<void>((res) => this.d.hud.dialog(who, who, lines, res));
  }

  /* ---------- entrar e sair ---------- */

  start(replay = false) {
    if (replay || this.done) this.state = newDay01();
    this.active = true;
    this.d.daylight.set(isNight(this.state) ? 1 : 0, REDUCED_MOTION ? 0 : 1.5);
    this.d.place(0, 12, Math.PI);
    this.d.camp.setGlobe(0);
    this.globeK = 0;
    this.lampK = stepIndex(this.state.step) > stepIndex('letThereBeLight') ? 1 : 0;
    this.d.camp.setCentralLamp(this.lampK);
    this.state.invites.forEach((i) => this.d.camp.setInvite(i, true));
    const p = this.d.player;
    Object.assign(this.pedFollow, { x: p.x + 1.5, z: p.z + 1.5, y: p.y });
    this.set(this.state);
    void this.run();
  }

  exit(wantsNext = false) {
    this.active = false;
    this.d.ambient.clear();
    this.d.daylight.set(0, REDUCED_MOTION ? 0 : 1.2);
    this.sparkMeshes.forEach((m) => (m.visible = false));
    this.campers.forEach((c) => (c.root.visible = false));
    for (const id of ['lamp', 'mural0', 'mural1', 'mural2']) this.inter(id).off = true;
    this.d.hud.show('goal', false);
    if (this.done) this.applyDone();
    else {
      this.d.camp.setCentralLamp(0);
      MURALS.forEach((_, i) => this.d.camp.setInvite(i, false));
    }
    this.d.onExit(this.done, wantsNext);
  }

  /** Depois de concluído, o Globo fica aceso e os convites nos murais. */
  private applyDone() {
    this.d.camp.setGlobe(1);
    this.d.camp.setCentralLamp(1);
    MURALS.forEach((_, i) => this.d.camp.setInvite(i, true));
    this.d.daylight.wideLantern = true;
  }

  private inter(id: string) {
    const o = this.d.camp.inter.byId(id);
    if (!o) throw new Error('interação não encontrada: ' + id);
    return o;
  }

  /** Mostra e liga o que a etapa atual precisa. */
  private refresh() {
    const s = this.state,
      si = stepIndex(s.step);
    // faíscas: no chão (ainda não achadas) ou em órbita do jogador
    this.d.ambient.clear();
    SPARKS.forEach((sp, i) => {
      const m = this.sparkMeshes[i];
      m.visible = this.active && s.step !== 'lantern' && si <= stepIndex('globe');
      if (s.step === 'sparks' && !s.sparks.includes(i)) this.d.ambient.add(sp.kind, sp.x, sp.z);
    });
    this.inter('lamp').off = s.step !== 'letThereBeLight';
    MURALS.forEach((_, i) => (this.inter('mural' + i).off = s.step !== 'invites' || s.invites.includes(i)));
    this.campers.forEach((c) => (c.root.visible = this.active && s.step === 'invites'));
    const goals: Partial<Record<Step, string>> = {
      lantern: 'Fale com o Tico',
      sparks: `Siga os sons e ache as faíscas (${s.sparks.length}/3)`,
      pedrito: 'Ajude o Pedrito na clareira',
      letThereBeLight: 'Leve as faíscas ao lampião central',
      dayNight: 'Vá até a Mesa da Família',
      invites: `Pendure os convites nos murais (${s.invites.length}/3)`,
      globe: 'Leve as faíscas ao Globo do Éden',
    };
    this.goalText = goals[s.step] ?? '';
    $('goalt').textContent = this.goalText;
    this.d.hud.show('goal', this.active && !!this.goalText);
  }

  /** Para onde a ajuda do Tico aponta agora. */
  objective(): { x: number; z: number; hint: string } | null {
    const s = this.state,
      p = this.d.player;
    switch (s.step) {
      case 'sparks': {
        let best: { x: number; z: number } | null = null;
        SPARKS.forEach((sp, i) => {
          if (!s.sparks.includes(i) && (!best || Math.hypot(sp.x - p.x, sp.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z))) best = sp;
        });
        return best ? { ...(best as { x: number; z: number }), hint: 'Escute: sino, água e grilo. Cada som esconde uma faísca!' } : null;
      }
      case 'pedrito':
        return { ...PEDRITO_SPOT, hint: 'O Pedrito está na clareira, com medo do escuro.' };
      case 'letThereBeLight':
        return { ...CENTRAL_LAMP, hint: 'O lampião central fica na clareira, perto da fogueira.' };
      case 'dayNight':
        return { x: -9, z: 8, hint: 'A Mesa da Família fica na clareira.' };
      case 'invites': {
        const i = [0, 1, 2].find((k) => !s.invites.includes(k));
        return i === undefined ? null : { x: MURALS[i][0], z: MURALS[i][1], hint: 'Os murais ficam em volta da clareira.' };
      }
      case 'globe':
        return { x: GLOBE.x, z: GLOBE.z + 4, hint: this.content.globe.go };
      default:
        return null;
    }
  }

  get goal() {
    return this.goalText;
  }

  /* ---------- etapas ---------- */

  private async run() {
    if (this.state.step === 'lantern') {
      this.busy = true;
      await this.talk('Tico', [...this.content.start, ...this.content.lantern]);
      await this.read('r1');
      await this.q('beforeLight');
      await this.talk('Tico', this.content.creation.afterReading1);
      this.busy = false;
      this.set(complete(this.state, 'lantern'));
      this.d.hud.say(
        MOBILE
          ? 'Siga os sons: sino, água e grilo. Cada um esconde uma faísca! Toque no chão para andar.'
          : 'Siga os sons: sino, água e grilo. Cada um esconde uma faísca! Clique no chão para andar.',
        8000,
      );
    } else this.d.hud.say(`Vamos continuar: ${this.goalText.toLowerCase()}.`, 5000);
  }

  /** Toques em pessoas e objetos durante a missão. Devolve true se a missão cuidou. */
  onInteract(o: Interactable): boolean {
    if (!this.active || this.busy) return false;
    const s = this.state;
    if (o.npc === 'pedrito' && s.step === 'pedrito') {
      void this.pedritoStep();
      return true;
    }
    if (o.id === 'lamp' && s.step === 'letThereBeLight') {
      void this.lampStep();
      return true;
    }
    if (o.id === 'table' && s.step === 'dayNight') {
      void this.dayNightStep();
      return true;
    }
    if (o.npc === 'sol' && s.step === 'invites') {
      void this.talk('Diretora Sol', this.content.invites.sol);
      return true;
    }
    if (o.id?.startsWith('mural') && s.step === 'invites') {
      void this.inviteStep(Number(o.id.slice(5)));
      return true;
    }
    if (o.id === 'globe' && s.step === 'globe') {
      void this.globeStep();
      return true;
    }
    return false;
  }

  private async pedritoStep() {
    this.busy = true;
    await this.talk('Pedrito', this.content.pedrito.afraid);
    await this.q('scarf');
    await this.talk('Pedrito', this.content.pedrito.after);
    this.busy = false;
    sfx('yay');
    this.set(complete(this.state, 'pedrito'));
  }

  private async lampStep() {
    this.busy = true;
    await this.read('r2');
    const verse = this.bible.verses['Gn 1:3'];
    const words = verse ? verse.replace(/[.,;:!?]/g, '').split(/\s+/).filter(Boolean) : this.content.phrase.fallback;
    await this.d.task.words('Monte a frase', words, this.content.phrase.distractors);
    sfx('yay');
    this.lampK = 0.001; // acende aos poucos em update()
    this.d.fx.puff(CENTRAL_LAMP.x, H(CENTRAL_LAMP.x, CENTRAL_LAMP.z) + 4.2, CENTRAL_LAMP.z, { n: 18, tex: sparkTex, color: 0xffe28a, add: true, sp: 3, up: 2, s: 0.5, life: 0.9 });
    await this.talk('Tico', [...this.content.phrase.done, ...this.content.creation.afterLamp]);
    this.busy = false;
    this.set(complete(this.state, 'letThereBeLight'));
  }

  private async dayNightStep() {
    this.busy = true;
    await this.read('r3');
    await this.d.task.sort(this.content.sort.prompt, this.content.sort.items);
    this.d.daylight.set(0, REDUCED_MOTION ? 0 : 6); // a luz do dia surge aos poucos
    await this.talk('Tico', [...this.content.sort.done, ...this.content.creation.afterSort]);
    await this.q('lightName');
    this.busy = false;
    this.set(complete(this.state, 'dayNight'));
    this.d.hud.say('A Diretora Sol tem uma tarefa para você!', 5000);
  }

  private async inviteStep(i: number) {
    this.busy = true;
    const c = this.campers[i];
    c.root.rotation.y = Math.atan2(this.d.player.x - c.root.position.x, this.d.player.z - c.root.position.z);
    await this.q((['invite1', 'invite2', 'invite3'] as const)[i]);
    this.d.camp.setInvite(i, true);
    sfx('coin');
    this.busy = false;
    this.set(hungInvite(this.state, i));
    if (this.state.step === 'globe') this.d.hud.say(this.content.globe.go, 7000);
    else this.d.hud.say(this.content.invites.hung, 2500);
  }

  private async globeStep() {
    this.busy = true;
    this.d.hud.hideTico();
    const { orbit, player: p } = this.d;
    p.face = Math.atan2(GLOBE.x - p.x, GLOBE.z - p.z);
    orbit.want = Math.atan2(p.x - GLOBE.x, p.z - GLOBE.z) + 0.3;
    orbit.setZoom(17);
    // as faíscas voam até o Globo
    const gy = H(GLOBE.x, GLOBE.z) + 3.6;
    const from = this.sparkMeshes.map((m) => m.position.clone());
    await this.animate(1.6, (k) => {
      const e = k * k * (3 - 2 * k);
      this.sparkMeshes.forEach((m, i) => {
        m.position.set(lerp(from[i].x, GLOBE.x, e), lerp(from[i].y, gy, e) + Math.sin(e * Math.PI) * 2, lerp(from[i].z, GLOBE.z, e));
      });
    });
    this.sparkMeshes.forEach((m) => (m.visible = false));
    // a Voz: só texto, luz e o Globo (Deus não é representado)
    const v = $('voice');
    v.textContent = this.content.globe.voice;
    v.classList.remove('show');
    void v.offsetWidth;
    v.classList.add('show');
    speak(this.content.globe.voice, 'A Voz', 0.85);
    sfx('yay');
    await this.animate(2.2, (k) => {
      this.globeK = k;
      this.d.camp.setGlobe(k);
    });
    this.d.fx.puff(GLOBE.x, gy, GLOBE.z, { n: 40, tex: sparkTex, color: 0xfff1b0, add: true, sp: 6, up: 4, s: 0.7, life: 1.4 });
    // o Globo alterna dia e noite
    if (!REDUCED_MOTION)
      for (let i = 0; i < 2; i++) {
        this.d.daylight.set(0.85, 1.1);
        await this.wait(1.4);
        this.d.daylight.set(0, 1.1);
        await this.wait(1.4);
      }
    await this.talk('Tico', this.content.globe.after);
    orbit.want = null;
    orbit.setZoom(13);
    this.set(complete(this.state, 'globe'));
    await this.d.task.recap(this.content.creation.recap);
    // recompensas
    const r = this.content.rewards;
    const save = this.d.save;
    save.update({ badges: [...new Set([...save.data.badges, r.badge])] });
    this.d.daylight.wideLantern = true;
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
    if (fb) save.update({ feedback: { ...save.data.feedback, day01: fb } });
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

  /* ---------- a cada quadro ---------- */

  update(dt: number, t: number) {
    if (!this.active) return;
    const s = this.state,
      p = this.d.player,
      si = stepIndex(s.step);
    // faíscas: no lugar ou orbitando o jogador; uma vai com o Pedrito depois que ele ajuda
    let orbitN = 0;
    SPARKS.forEach((sp, i) => {
      const m = this.sparkMeshes[i];
      if (!m.visible || (this.busy && s.step === 'globe')) return;
      const found = s.sparks.includes(i) || si > stepIndex('sparks');
      m.children[0].rotation.set(t * 1.3, t * 1.7, 0);
      if (!found) {
        m.position.set(sp.x, H(sp.x, sp.z) + 1 + Math.sin(t * 2.4 + i) * 0.2, sp.z);
        if (s.step === 'sparks' && Math.hypot(p.x - sp.x, p.z - sp.z) < 1.6 && Math.abs(p.y + 1 - m.position.y) < 2.2) {
          sfx('coin');
          this.d.fx.puff(m.position.x, m.position.y, m.position.z, { n: 14, tex: sparkTex, color: 0xffe28a, add: true, sp: 3, up: 2.5, s: 0.5, life: 0.7 });
          this.set(foundSpark(s, i));
          const n = this.state.sparks.length;
          if (this.state.step === 'pedrito') {
            this.d.hud.hideTico();
            void this.talk('Tico', ['Você achou as três faíscas!', ...this.content.creation.afterSparks, 'Agora ouça... alguém está com medo na clareira.']);
          }
          else this.d.hud.say(`Faísca encontrada! Faltam ${SPARK_COUNT - n}.`, 3500);
        }
        return;
      }
      const carriedByPedrito = si > stepIndex('pedrito') && i === s.sparks[0];
      if (carriedByPedrito) {
        const f = this.pedFollow;
        m.position.set(f.x, f.y + 2.9 + Math.sin(t * 3) * 0.1, f.z);
      } else {
        const a = t * 1.6 + orbitN * 2.1;
        orbitN++;
        m.position.set(p.x + Math.cos(a) * 0.9, p.y + 2.5 + Math.sin(t * 3 + i) * 0.12, p.z + Math.sin(a) * 0.9);
      }
    });

    // Pedrito: com medo na clareira, depois acompanha o jogador
    const ped = this.d.ped,
      pi = this.inter('pedrito-npc');
    if (si <= stepIndex('pedrito')) {
      ped.root.position.set(PEDRITO_SPOT.x, H(PEDRITO_SPOT.x, PEDRITO_SPOT.z), PEDRITO_SPOT.z);
      ped.body.scale.y = 0.9; // encolhido de medo
      animate(ped, dt, { mode: 'wow' });
      Object.assign(this.pedFollow, { x: PEDRITO_SPOT.x, z: PEDRITO_SPOT.z, y: ped.root.position.y });
    } else {
      ped.body.scale.y = 1;
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
    pi.x = ped.root.position.x;
    pi.z = ped.root.position.z;
    pi.y = ped.root.position.y;
    pi.mesh?.position.set(pi.x, pi.y + 1.7, pi.z);
    // acompanhando, o Pedrito só leva a faísca: não disputa o botão de ação com o que a criança procura
    pi.off = si > stepIndex('pedrito');

    // lampião acende devagar
    if (this.lampK > 0 && this.lampK < 1) {
      this.lampK = Math.min(1, this.lampK + dt / 1.5);
      this.d.camp.setCentralLamp(this.lampK);
    }
    this.campers.forEach((c) => c.root.visible && animate(c, dt, { wave: Math.hypot(p.x - c.root.position.x, p.z - c.root.position.z) < 5 }));
  }

  /** O Pedrito é controlado pela missão enquanto ela está ativa. */
  get drivesPedrito() {
    return this.active;
  }
}
