import * as THREE from 'three';
import type { Spot } from './layout';
import { DayKey, DayState, Step, complete, foundPiece, newDay, pedPart, stepIndex } from './state';
import type { MissionDeps } from '../day01/mission';
import { Question } from '../quiz';
import { GLOBE } from '../../world/camp';
import { Interactable } from '../../world/interactables';
import { sparkTex } from '../../world/fx';
import { Rig, animate } from '../../world/builders/kid';
import { H } from '../../world/terrain';
import { REDUCED_MOTION } from '../../engine/gfx';
import { sfx } from '../../engine/audio';
import { angLerp, lerp } from '../../engine/math';
import { speak } from '../../engine/speech';
import { $ } from '../../ui/hud';

/*
 * Molde dos Dias 3 a 7 (docs/DAYS_03_07.md): algo falta no acampamento, o personagem do dia pede ajuda,
 * um desafio de habilidade com mecânica nova junta os pedaços de luz (primeira leitura e pergunta),
 * o Pedrito propõe o desafio dele (segunda leitura e pergunta) e, no Globo, a Voz diz um trecho exato do dia.
 * Cada dia só escreve o cenário e a mecânica; falas e textos vêm de public/data/days/dayNN.json.
 */

interface Said {
  who: string;
}
export interface DayContent {
  id: string;
  title: string;
  npc: Said & { name: string; hello: string[]; again: string[]; after: string[]; wait: string[] };
  start: Said & { lines: string[]; go: string };
  goals: Record<'start' | 'skill' | 'pedrito' | 'globe', string>;
  skill: { intro: string[]; controls: string; left: string[]; done: string[]; hint: string };
  readings: Record<'r1' | 'r2', { ref: string; keys: string[] }>;
  questions: Record<'q1' | 'q2', Question>;
  pedrito: { call: string[]; after: string[]; hint: string; title?: string; ideal?: string; distractors?: string[]; lit?: string; [k: string]: unknown };
  globe: { go: string; voice: string; after: string[] };
  rewards: { badge: string; badgeNote: string; lantern: string; stars: number };
  realMission: { text: string; adult: string };
  creation: { recap: { title: string; intro: string; items: { icon: string; game: string; creation: string }[]; close: string } };
  doneMsg: string;
  [k: string]: unknown;
}

export interface Bible {
  verses: Record<string, string>;
}
export interface ClubTexts {
  ideals: Record<string, { title: string; text: string }>;
}

const url = (p: string) => new URL(p, document.baseURI).toString();
export const loadDay = (key: DayKey) => fetch(url(`data/days/${key}.json`)).then((r) => r.json() as Promise<DayContent>);

export type { Spot } from './layout';

export abstract class DayMission {
  active = false;
  busy = false;
  state: DayState;
  /** quantos pedaços de luz o desafio de habilidade junta */
  abstract readonly pieces: number;
  /** quantas partes o desafio do Pedrito tem (0 = uma tarefa só) */
  readonly pedParts: number = 0;
  protected npc: Rig;
  protected npcInter: Interactable;
  protected pieceMeshes: THREE.Group[] = [];
  protected goalText = '';
  protected pedStarted = false;
  protected pedFollow = { x: 0, z: 0, y: 0 };
  protected globeOverride = false;

  /** id do personagem do dia nas interações (o Dia 7 usa a Diretora Sol, que já está no acampamento) */
  protected npcId: string;
  private sharedNpc: boolean;
  /** o que a criança carrega acima da cabeça (semente, regador, bandeirinha...) */
  protected carried: THREE.Object3D | null = null;

  constructor(
    protected d: MissionDeps,
    readonly key: DayKey,
    readonly n: number,
    protected content: DayContent,
    protected bible: Bible,
    protected club: ClubTexts,
    npc: (() => Rig) | { rig: Rig; id: string },
    protected npcSpot: Spot,
  ) {
    this.state = (d.save.data[key] as DayState | null) ?? newDay();
    const c = content.npc;
    if (typeof npc === 'function') {
      this.sharedNpc = false;
      this.npcId = key;
      this.npc = npc();
      const y = H(npcSpot.x, npcSpot.z);
      this.npc.root.position.set(npcSpot.x, y, npcSpot.z);
      this.npc.root.rotation.y = npcSpot.ry ?? 0;
      this.npc.root.visible = false;
      d.scene.add(this.npc.root);
      this.npcInter = d.camp.inter.add({ id: 'npc-' + key, npc: key, x: npcSpot.x, z: npcSpot.z, y, w: 1.8, h: 3.8, name: c.name, label: 'Conversar', who: c.who, lines: c.wait, off: true });
    } else {
      this.sharedNpc = true;
      this.npcId = npc.id;
      this.npc = npc.rig;
      this.npcInter = d.camp.inter.byId(npc.id + '-npc')!;
    }
  }

  /** chamado pelo filho no fim do construtor (depois de montar o cenário do dia) */
  protected init(count = this.pieces) {
    const cube = new THREE.MeshBasicMaterial({ color: 0xffe9a0 });
    const halo = new THREE.SpriteMaterial({ map: sparkTex, color: 0xffd76a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const h = new THREE.Sprite(halo);
      h.scale.setScalar(1.8);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), cube), h);
      g.visible = false;
      this.d.scene.add(g);
      this.pieceMeshes.push(g);
    }
    this.applyLasting();
  }

  get done() {
    return this.state.step === 'done';
  }
  get goal() {
    return this.goalText;
  }
  get drivesPedrito() {
    return this.active;
  }
  cameraOverride(_dt: number) {
    return false;
  }

  /** o dia só aparece depois do anterior */
  protected get unlocked() {
    const prev = this.n === 3 ? this.d.save.data.day02 : this.d.save.data[`day0${this.n - 1}` as DayKey];
    return prev?.step === 'done';
  }

  /* ---------- o que cada dia escreve ---------- */

  /** o que fica no acampamento depois de cada etapa (também fora da missão) */
  protected abstract applyLasting(): void;
  /** desfaz o que o dia acendeu (repetir o dia) */
  protected abstract resetLasting(): void;
  /** entra no dia: luz, o que falta no cenário, onde a criança começa */
  protected abstract enter(): void;
  /** sai do dia (fim ou saída no meio) */
  protected abstract leave(): void;
  /** onde fica o pedaço de luz i ainda não achado (null: escondido) */
  protected abstract pieceSpot(i: number, t: number): THREE.Vector3 | null;
  /** para onde a ajuda aponta no desafio de habilidade */
  protected abstract skillObjective(): Spot | null;
  /** onde o Pedrito espera antes do desafio dele */
  protected abstract pedritoSpot(): Spot;
  /** desafio do Pedrito (depois da segunda leitura e pergunta); termina quando a criança conclui */
  protected abstract pedritoChallenge(): Promise<void>;
  /** o Globo ganha o que foi criado (k de 0 a 1) e o cenário fica completo */
  protected abstract restore(k: number): void;

  /** toques do desafio de habilidade (sementes, poço, bandeirinhas...) */
  protected skillInteract(_o: Interactable): boolean {
    return false;
  }
  /** toques durante o desafio do Pedrito */
  protected pedritoInteract(_o: Interactable): boolean {
    return false;
  }
  /** para onde a ajuda aponta no desafio do Pedrito, depois que ele começou */
  protected pedritoObjective(): Spot | null {
    return null;
  }
  /** começa o desafio de habilidade (depois da conversa com o personagem) */
  protected beginSkill() {}
  /** cada quadro, só com a missão ativa */
  protected tick(_dt: number, _t: number) {}
  /** cada quadro, também fora da missão (cenário que fica) */
  protected idle(_dt: number, _t: number) {}

  /* ---------- ferramentas ---------- */

  protected set(s: DayState) {
    this.state = s;
    this.d.save.update({ [this.key]: s });
    this.refresh();
  }

  protected q(k: 'q1' | 'q2') {
    const q = this.content.questions[k];
    return q.enabled ? this.d.task.quiz(q) : Promise.resolve();
  }

  protected async read(k: 'r1' | 'r2') {
    const r = this.content.readings[k];
    const verses = r.keys.map((key) => this.bible.verses[key]).filter(Boolean);
    const v = verses.length === r.keys.length ? verses : null;
    await this.d.task.reading(r.ref, v);
    this.d.task.review = { ref: r.ref, verses: v };
  }

  /** leitura extra (fora de r1 e r2), sempre pelas chaves do arquivo conferido */
  protected async readKeys(ref: string, keys: string[]) {
    const verses = keys.map((key) => this.bible.verses[key]).filter(Boolean);
    const v = verses.length === keys.length ? verses : null;
    await this.d.task.reading(ref, v);
    this.d.task.review = { ref, verses: v };
  }

  protected endReview() {
    this.d.task.review = null;
  }

  protected talk(who: string, lines: string[]) {
    return new Promise<void>((res) => this.d.hud.dialog(who, who, lines, res));
  }

  protected animate(seconds: number, f: (k: number) => void) {
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

  protected wait(s: number) {
    return new Promise<void>((r) => setTimeout(r, (REDUCED_MOTION ? 0 : s) * 1000));
  }

  protected near(x: number, z: number, r: number) {
    const p = this.d.player;
    return Math.hypot(p.x - x, p.z - z) < r;
  }

  protected faceNpc() {
    const m = this.npc.root,
      p = this.d.player;
    m.rotation.y = Math.atan2(p.x - m.position.x, p.z - m.position.z);
    p.face = Math.atan2(m.position.x - p.x, m.position.z - p.z);
  }

  /** põe algo nas mãos da criança (null: solta) */
  protected carry(o: THREE.Object3D | null) {
    if (this.carried && this.carried !== o) this.carried.visible = false;
    this.carried = o;
    if (o) o.visible = true;
  }

  /** distância 3D da criança até um ponto (pedaços de luz no alto e no fundo do lago) */
  protected reach(at: THREE.Vector3, r = 1.4) {
    const p = this.d.player;
    return Math.hypot(p.x - at.x, p.y + 1 - at.y, p.z - at.z) < r;
  }

  /** marca uma parte do desafio do Pedrito */
  protected pedDone(i: number) {
    this.set(pedPart(this.state, i, this.pedParts));
  }

  /** Pedaço de luz i: brilho, som e, no primeiro, a leitura e a pergunta. */
  protected piece(i: number, at: THREE.Vector3) {
    const s = this.state;
    if (s.step !== 'skill' || s.got.includes(i)) return;
    sfx('coin');
    this.d.sting('faisca');
    this.d.fx.puff(at.x, at.y, at.z, { n: 16, tex: sparkTex, color: 0xffe28a, add: true, sp: 3, up: 2.5, s: 0.5, life: 0.7 });
    this.set(foundPiece(this.state, i, this.pieces));
    const n = this.state.got.length;
    this.onPiece(i, n);
    if (n === 1) void this.firstPiece();
    else if (n < this.pieces) this.d.hud.say(this.content.skill.left[Math.min(this.pieces - n - 1, this.content.skill.left.length - 1)], 4500);
    else void this.allPieces();
  }
  /** reação do cenário a cada pedaço (uma planta cresce, uma estrela acende...) */
  protected onPiece(_i: number, _n: number) {}

  private async firstPiece() {
    this.busy = true;
    await this.wait(0.6);
    await this.read('r1');
    await this.q('q1');
    this.endReview();
    this.busy = false;
    const c = this.content.skill;
    if (this.pieces > 1) this.d.hud.say(c.left[Math.min(this.pieces - 2, c.left.length - 1)], 6000);
  }

  private async allPieces() {
    this.busy = true;
    await this.wait(0.5);
    await this.talk('Tico', this.content.skill.done);
    this.afterSkill();
    this.busy = false;
    sfx('yay');
    this.d.hud.say(this.content.pedrito.hint, 7000);
  }
  /** fim do desafio de habilidade (guarda ferramentas, volta os controles) */
  protected afterSkill() {}

  /* ---------- entrar e sair ---------- */

  start(replay = false) {
    if (replay || this.done) {
      this.state = newDay();
      this.resetLasting();
    }
    this.active = true;
    this.pedStarted = false;
    this.enter();
    const p = this.d.player;
    Object.assign(this.pedFollow, { x: p.x + 1.5, z: p.z + 1.5, y: p.y });
    this.set(this.state);
    void this.run();
  }

  exit(wantsNext = false) {
    this.active = false;
    this.busy = false;
    this.endReview();
    this.pieceMeshes.forEach((m) => (m.visible = false));
    this.carry(null);
    this.leave();
    this.d.hud.show('goal', false);
    this.d.forceControls(false);
    this.applyLasting();
    this.d.onExit(this.done, wantsNext, this.content.doneMsg);
  }

  protected refresh() {
    const s = this.state;
    const g = this.content.goals;
    const goals: Partial<Record<Step, string>> = {
      start: g.start,
      skill: `${g.skill} (${s.got.length}/${this.pieces})`,
      pedrito: this.pedParts && this.pedStarted ? `${g.pedrito} (${s.ped.length}/${this.pedParts})` : g.pedrito,
      globe: g.globe,
    };
    this.goalText = this.active ? (goals[s.step] ?? '') : '';
    $('goalt').textContent = this.goalText;
    this.d.hud.show('goal', this.active && !!this.goalText);
  }

  objective(): { x: number; z: number; hint: string } | null {
    const s = this.state;
    switch (s.step) {
      case 'start':
        return { x: this.npcSpot.x, z: this.npcSpot.z, hint: this.content.start.go };
      case 'skill': {
        const o = this.skillObjective();
        return o ? { x: o.x, z: o.z, hint: this.content.skill.hint } : null;
      }
      case 'pedrito': {
        const o = (this.pedStarted && this.pedritoObjective()) || this.pedritoSpot();
        return { x: o.x, z: o.z, hint: this.content.pedrito.hint };
      }
      case 'globe':
        return { x: GLOBE.x, z: GLOBE.z + 4, hint: this.content.globe.go };
      default:
        return null;
    }
  }

  private async run() {
    if (this.state.step === 'start') {
      this.busy = true;
      await this.talk(this.content.start.who, this.content.start.lines);
      this.busy = false;
      this.d.hud.say(this.content.start.go, 7000);
    } else {
      if (this.state.step === 'skill') this.beginSkill();
      this.d.hud.say(`Vamos continuar: ${this.goalText.toLowerCase()}.`, 5000);
    }
  }

  onInteract(o: Interactable): boolean {
    if (this.busy) return false;
    if (o.npc === this.npcId && (!this.sharedNpc || this.active)) {
      void this.npcTalk();
      return true;
    }
    if (!this.active) return false;
    const s = this.state;
    if (s.step === 'skill' && this.skillInteract(o)) return true;
    if (s.step === 'pedrito') {
      if (!this.pedStarted && o.npc === 'pedrito') {
        void this.pedritoStep();
        return true;
      }
      if (this.pedStarted && this.pedritoInteract(o)) return true;
    }
    if (o.id === 'globe' && s.step === 'globe') {
      void this.globeStep();
      return true;
    }
    return false;
  }

  private async npcTalk() {
    const c = this.content.npc,
      s = this.state;
    this.busy = true;
    this.faceNpc();
    if (!this.active) {
      await this.talk(c.who, this.done ? c.after : c.wait);
      this.busy = false;
      return;
    }
    if (s.step === 'start') {
      await this.talk(c.who, c.hello);
      this.set(complete(this.state, 'start'));
      if (this.content.skill.intro.length) await this.talk('Tico', this.content.skill.intro);
      this.busy = false;
      this.beginSkill();
      this.d.hud.say(this.content.skill.controls, 7000);
      return;
    }
    await this.talk(c.who, s.step === 'skill' ? c.again : c.after);
    this.busy = false;
  }

  private async pedritoStep() {
    this.busy = true;
    const ped = this.d.ped.root.position,
      p = this.d.player;
    this.d.ped.root.rotation.y = Math.atan2(p.x - ped.x, p.z - ped.z);
    await this.talk('Pedrito', this.content.pedrito.call);
    await this.read('r2');
    await this.q('q2');
    this.endReview();
    this.pedStarted = true;
    this.refresh();
    this.busy = false;
    await this.pedritoChallenge();
    this.busy = true;
    await this.talk('Pedrito', this.content.pedrito.after);
    this.busy = false;
    this.set(complete(this.state, 'pedrito'));
    this.d.hud.say(this.content.globe.go, 7000);
  }

  /** desafio do Pedrito com blocos de palavras: monta um ideal e acende o quadro dele */
  protected async idealWords(board: number) {
    const v = this.content.pedrito,
      ideal = v.ideal ? this.club.ideals[v.ideal] : undefined;
    if (!ideal) return;
    this.busy = true;
    const words = ideal.text.replace(/[.,;:!?]/g, '').split(/\s+/).filter(Boolean);
    await this.d.task.words(v.title ?? ideal.title, words, v.distractors ?? [], `no ${ideal.title}`);
    sfx('yay');
    this.d.sting('vitoria');
    this.d.camp.setIdeal(board, ideal.text);
    const b = this.d.camp.idealSpot(board);
    this.d.fx.puff(b.x, H(b.x, b.z) + 2.2, b.z, { n: 26, tex: sparkTex, color: 0xffe28a, add: true, sp: 3.5, up: 2.5, s: 0.55, life: 1 });
    if (v.lit) await this.talk('Tico', [v.lit]);
    await this.talk('Quadros dos Ideais', [ideal.text]);
    this.busy = false;
  }

  /** a Voz no Globo: só texto, luz e o Globo (Deus não é representado) */
  protected async globeStep() {
    this.busy = true;
    this.globeOverride = true;
    this.d.hud.hideTico();
    const { orbit, player: p } = this.d;
    p.face = Math.atan2(GLOBE.x - p.x, GLOBE.z - p.z);
    orbit.want = Math.atan2(p.x - GLOBE.x, p.z - GLOBE.z) + 0.3;
    orbit.setZoom(17);
    const gy = H(GLOBE.x, GLOBE.z) + 3.6;
    const from = this.pieceMeshes.map((m) => m.position.clone());
    this.pieceMeshes.forEach((m) => (m.visible = true));
    await this.animate(1.6, (k) => {
      const e = k * k * (3 - 2 * k);
      this.pieceMeshes.forEach((m, i) => m.position.set(lerp(from[i].x, GLOBE.x, e), lerp(from[i].y, gy, e) + Math.sin(e * Math.PI) * 2, lerp(from[i].z, GLOBE.z, e)));
    });
    this.pieceMeshes.forEach((m) => (m.visible = false));
    const v = $('voice');
    v.textContent = this.content.globe.voice;
    v.classList.remove('show');
    void v.offsetWidth;
    v.classList.add('show');
    speak(this.content.globe.voice, 'A Voz');
    sfx('yay');
    this.d.sting('vitoria');
    await this.animate(2.6, (k) => this.restore(k));
    this.d.fx.puff(GLOBE.x, gy, GLOBE.z, { n: 40, tex: sparkTex, color: 0xfff1b0, add: true, sp: 6, up: 4, s: 0.7, life: 1.4 });
    await this.wait(1.2);
    await this.talk('Tico', this.content.globe.after);
    await this.afterGlobe();
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
    if (fb) save.update({ feedback: { ...save.data.feedback, [this.key]: fb } });
    this.busy = false;
    this.exit(fb?.wantsNext === true);
  }
  /** cena extra depois da Voz (no Dia 7: o sábado e a cerimônia do lenço) */
  protected async afterGlobe() {}

  /* ---------- a cada quadro ---------- */

  update(dt: number, t: number) {
    if (!this.sharedNpc) {
      const open = this.unlocked || this.done;
      this.npc.root.visible = open;
      this.npcInter.off = !open;
      if (open) animate(this.npc, dt, { wave: this.near(this.npcSpot.x, this.npcSpot.z, 6) && !this.busy });
    }
    this.idle(dt, t);
    if (this.carried) {
      const p = this.d.player;
      this.carried.position.set(p.x, p.y + 2.75 + Math.sin(t * 4) * 0.05, p.z);
      this.carried.rotation.y = p.face;
    }
    if (!this.active) return;
    const s = this.state,
      si = stepIndex(s.step),
      p = this.d.player;
    // pedaços de luz: no lugar enquanto ninguém achou; depois giram em volta da criança até o Globo
    let orbitN = 0;
    this.pieceMeshes.forEach((m, i) => {
      if (this.globeOverride) return;
      const found = s.got.includes(i) || si > stepIndex('skill');
      m.children[0].rotation.set(t * 1.3, t * 1.7, 0);
      if (!found) {
        const at = si === stepIndex('skill') ? this.pieceSpot(i, t) : null;
        m.visible = !!at;
        if (at) {
          m.position.copy(at);
          if (this.touchPieces && !this.busy && this.reach(at)) this.piece(i, at.clone());
        }
        return;
      }
      m.visible = si <= stepIndex('globe');
      const a = t * 1.6 + orbitN * (Math.PI * 2 / Math.max(1, this.pieces));
      orbitN++;
      m.position.set(p.x + Math.cos(a) * 0.9, p.y + 2.5 + Math.sin(t * 3 + i) * 0.12, p.z + Math.sin(a) * 0.9);
    });
    this.tick(dt, t);
    this.updatePedrito(dt);
  }

  /** Pedrito: espera no lugar dele até o desafio dele acabar; depois acompanha a criança */
  protected updatePedrito(dt: number) {
    const ped = this.d.ped,
      p = this.d.player,
      s = this.state,
      pi = this.d.camp.inter.byId('pedrito-npc');
    const waits = stepIndex(s.step) <= stepIndex('pedrito') && !(s.step === 'pedrito' && this.pedStarted && this.pedritoFollows);
    if (waits) {
      const sp = this.pedritoSpot();
      ped.root.position.set(sp.x, this.d.camp.col.groundAt(sp.x, sp.z, 9), sp.z);
      if (!this.busy) ped.root.rotation.y = angLerp(ped.root.rotation.y, Math.atan2(p.x - sp.x, p.z - sp.z), 0.08);
      animate(ped, dt, { wave: this.near(sp.x, sp.z, 7) && !this.busy && s.step === 'pedrito' });
      Object.assign(this.pedFollow, { x: sp.x, z: sp.z, y: ped.root.position.y });
    } else {
      const f = this.pedFollow,
        tx = p.x - Math.sin(p.face - 0.8) * 1.8,
        tz = p.z - Math.cos(p.face - 0.8) * 1.8;
      const okLand = H(tx, tz) > -0.3;
      const dx = (okLand ? tx : f.x) - f.x,
        dz = (okLand ? tz : f.z) - f.z,
        dd = Math.hypot(dx, dz);
      if (dd > 0.35) {
        const st = Math.min(Math.min(dd * 2.5, 6.5) * dt, dd);
        f.x += (dx / dd) * st;
        f.z += (dz / dd) * st;
        ped.root.rotation.y = angLerp(ped.root.rotation.y, Math.atan2(dx, dz), 0.2);
      }
      if (dd > 16) Object.assign(f, { x: p.x + 1, z: p.z + 1 });
      f.y = lerp(f.y, this.d.camp.col.groundAt(f.x, f.z, f.y + 0.5), 0.3);
      ped.root.position.set(f.x, f.y, f.z);
      animate(ped, dt, { walk: dd > 0.35, speed: 3 });
    }
    if (pi) {
      pi.x = ped.root.position.x;
      pi.z = ped.root.position.z;
      pi.y = ped.root.position.y;
      pi.mesh?.position.set(pi.x, pi.y + 1.7, pi.z);
      pi.off = !(s.step === 'pedrito' && !this.pedStarted);
    }
  }
  /** o pedaço de luz é pego encostando nele (false: o dia chama piece() sozinho) */
  protected touchPieces = true;
  /** no desafio do Pedrito, ele anda junto (safári) ou fica no lugar (quadro, mesa) */
  protected pedritoFollows = false;
}
