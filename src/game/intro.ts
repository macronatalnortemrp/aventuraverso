import * as THREE from 'three';
import { Camp, BOOK, FLAG, GLOBE, tentSpot } from '../world/camp';
import { Assembly } from '../world/assemble';
import { Daylight } from '../world/daylight';
import { Fx, sparkTex } from '../world/fx';
import { HILL, H } from '../world/terrain';
import { plate } from '../world/textures';
import { Rig, animate, kneelPose, part, Pose } from '../world/builders/kid';
import { SPARKS } from './day01/mission';
import { Music } from '../engine/music';
import type { CueId } from '../engine/musicScore';
import { REDUCED_MOTION } from '../engine/gfx';
import { sfx } from '../engine/audio';
import { angLerp, approach, lerp } from '../engine/math';
import { speakAvailable, stopSpeaking } from '../engine/speech';
import { $ } from '../ui/hud';

/*
 * Abertura narrada (docs/INTRO_SEQUENCE.md), em cenas 3D com câmera dirigida.
 * Q1 Encantamento · Q2 Mistério · Q3 Propósito · Q4 Companheirismo · Q5 Participação · Q6 Expectativa.
 * Textos em public/data/intro.json. Legendas, Pular e Repetir em HTML; o áudio é opcional.
 */

type G = string | { m: string; f: string };
export interface IntroText {
  q1: { who: string; line: G; _big: G };
  q2: { who: string; line: G };
  q3: { who: string; lines: G[] };
  q4: { who: string; line: G };
  q5: { who: string; prompt: G; after: G; _button: string; _page: string };
  _q6: { kicker: string; title: string; text: string; button: string };
}

export async function loadIntro(): Promise<IntroText> {
  const r = await fetch(new URL('data/intro.json', document.baseURI).toString());
  return (await r.json()) as IntroText;
}

export interface IntroDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  camp: Camp;
  daylight: Daylight;
  fx: Fx;
  assembly: Assembly;
  music: Music;
  player: () => Rig;
  tico: Rig;
  sol: Rig;
  ground: (x: number, z: number) => number;
  portraits: () => Record<string, string>;
  sound: () => boolean;
  /** coisas do jogo que somem durante a abertura (moedas) */
  hidden: THREE.Object3D[];
}

/** Quem está na cena e o que está fazendo. */
interface Actor {
  rig: Rig;
  x: number;
  y: number;
  z: number;
  face: number;
  pose: Pose;
  /** caminhada em andamento */
  path?: { x0: number; z0: number; x1: number; z1: number; t: number; d: number };
  /** ajuste extra depois da animação (braço erguido, cambalhota...) */
  extra?: (dt: number) => void;
  /** pulo: tempo restante */
  hop?: number;
}

const CANCEL = Symbol('cancel');
const CHILD = { x: 0, z: 11 };
const SOL_IN = { x: 2.1, z: 11 };
const TICO_IN = { x: -2.1, z: 11 };
/** câmera dos diálogos na Clareira: de frente, um pouco abaixo, vendo os rostos três quartos */
const STAGE_CAM = { x: 0.2, y: 2.8, z: 4.6 };
const NEAR_BOOK = { child: { x: 0.3, z: BOOK.z + 3.4 }, tico: { x: 1.9, z: BOOK.z + 2.4 }, sol: { x: -2.4, z: BOOK.z + 3.2 } };
const ease = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const words = (s: string) => s.split(/\s+/).length;
/** tempo de leitura para 6 a 9 anos (com folga) */
const readTime = (s: string) => Math.max(3.5, words(s) * 0.42 + 1.2);

export class Intro {
  active = false;
  private T = 0;
  private tok = 0;
  private waits: { at: number; res: () => void }[] = [];
  private actors: Actor[] = [];
  private props: THREE.Object3D[] = [];
  private pages: { m: THREE.Mesh; a: number; t: number; r: number; spin: number }[] = [];
  private sparks: { g: THREE.Group; from: THREE.Vector3; to: THREE.Vector3; t: number }[] = [];
  private cam = { p0: new THREE.Vector3(), p1: new THREE.Vector3(), l0: new THREE.Vector3(), l1: new THREE.Vector3(), t0: 0, d: 0 };
  private look = new THREE.Vector3();
  private build: { r0: number; r1: number; t0: number; d: number } | null = null;
  private globe: { k: number; flicker: number } = { k: 0, flicker: 0 };
  private bookGlow: THREE.Sprite | null = null;
  private bookPage: THREE.Object3D | null = null;
  private bookTap: (() => void) | null = null;
  private finish: (() => void) | null = null;
  private solHome = { p: new THREE.Vector3(), ry: 0 };
  private nick = '';
  private girl = false;

  constructor(
    private d: IntroDeps,
    private text: IntroText,
  ) {
    $('iskip').onclick = () => {
      sfx('ui');
      this.skip();
    };
    $('irep').onclick = () => {
      sfx('ui');
      this.restart();
    };
    $('ibook').onclick = () => this.bookTap?.();
    // X da legenda: some a fala atual e a voz para; a abertura segue no seu ritmo
    $('ix').onclick = () => {
      sfx('ui');
      stopSpeaking();
      this.quiet();
    };
    $('igo').onclick = () => {
      sfx('yay');
      this.end();
    };
  }

  /** Toca a abertura. Termina quando a criança toca em "Começar a aventura". */
  play(nick: string, girl: boolean): Promise<void> {
    this.nick = nick || (girl ? 'Aventureira' : 'Aventureiro');
    this.girl = girl;
    this.solHome.p.copy(this.d.sol.root.position);
    this.solHome.ry = this.d.sol.root.rotation.y;
    this.active = true;
    this.d.hidden.forEach((o) => (o.visible = false));
    $('intro').classList.add('show');
    const q6 = this.text._q6;
    $('ik').textContent = q6.kicker;
    $('ih').textContent = q6.title;
    $('ip').textContent = q6.text;
    $('igo').textContent = q6.button;
    $('ibook').setAttribute('aria-label', this.text.q5._button);
    return new Promise((res) => {
      this.finish = res;
      this.restart();
    });
  }

  /* ---------- controle ---------- */

  private g(t: G) {
    const s = typeof t === 'string' ? t : this.girl ? t.f : t.m;
    return s.replace(/\{apelido\}/g, this.nick);
  }

  /** espera em segundos de cena; lança CANCEL se a criança pular ou repetir */
  private async w(sec: number) {
    const my = this.tok;
    await new Promise<void>((res) => this.waits.push({ at: this.T + (sec > 0 ? sec : 0), res }));
    if (my !== this.tok) throw CANCEL;
  }

  private cancelAll() {
    this.tok++;
    const ws = this.waits;
    this.waits = [];
    ws.forEach((w) => w.res());
    this.bookTap = null;
    stopSpeaking();
  }

  restart() {
    this.cancelAll();
    this.reset();
    this.run(() => this.sequence());
  }

  skip() {
    this.cancelAll();
    this.reset();
    this.run(() => this.endState());
  }

  private run(f: () => Promise<void>) {
    f().catch((e) => {
      if (e !== CANCEL) throw e;
    });
  }

  private end() {
    this.cancelAll();
    this.clear();
    this.d.assembly.done();
    this.d.daylight.setWarm(0);
    this.d.daylight.auraBoost = 1;
    this.d.music.setContext('normal');
    const s = this.d.sol;
    s.root.position.copy(this.solHome.p);
    s.root.rotation.y = this.solHome.ry;
    s.body.position.y = 0;
    s.torso.rotation.x = 0;
    for (const r of [this.d.player(), this.d.tico, s]) r.root.rotation.set(0, r.root.rotation.y, 0);
    this.d.tico.root.scale.setScalar(0.82);
    this.active = false;
    this.d.hidden.forEach((o) => (o.visible = true));
    $('intro').classList.remove('show');
    this.finish?.();
  }

  /* ---------- cena ---------- */

  private clear() {
    for (const p of this.props) p.removeFromParent();
    this.props = [];
    this.pages = [];
    this.sparks = [];
    this.bookGlow = null;
    this.bookPage = null;
    this.actors = [];
    this.build = null;
    for (const id of ['isub', 'ibig', 'ibook', 'iend']) $(id).classList.remove('show');
  }

  /** Volta ao começo: acampamento desmontado, pôr do sol, Globo fraquinho. */
  private reset() {
    this.clear();
    this.T = 0;
    this.d.assembly.begin();
    this.d.daylight.set(0.12);
    this.d.daylight.setWarm(1);
    this.d.daylight.auraBoost = 1;
    this.globe = { k: 0.35, flicker: 0 };
    this.d.camp.setGlobe(0.35);
    const p = this.d.player(),
      t = this.d.tico,
      s = this.d.sol;
    // fora de cena até a hora de entrar
    this.actors = [
      { rig: p, x: CHILD.x, y: -50, z: 24, face: Math.PI, pose: {} },
      { rig: t, x: TICO_IN.x, y: -50, z: TICO_IN.z, face: Math.PI / 2, pose: {} },
      { rig: s, x: 7, y: -50, z: 17, face: -2.3, pose: {} },
    ];
    s.body.position.y = 0;
    s.torso.rotation.x = 0;
    for (const a of this.actors) a.rig.root.rotation.set(0, a.face, 0);
    t.root.scale.setScalar(0.82);
    this.setCam(new THREE.Vector3(0, 4.2, 46), new THREE.Vector3(0, 4.6, 36), 0);
  }

  private actor(r: Rig) {
    return this.actors.find((a) => a.rig === r)!;
  }

  private place(r: Rig, x: number, z: number, face: number) {
    const a = this.actor(r);
    Object.assign(a, { x, z, face, y: this.d.ground(x, z), path: undefined });
  }

  private walk(r: Rig, x: number, z: number, d: number) {
    const a = this.actor(r);
    if (a.y < -10) a.y = this.d.ground(a.x, a.z);
    a.path = { x0: a.x, z0: a.z, x1: x, z1: z, t: 0, d: REDUCED_MOTION ? 0.01 : d };
  }

  private faceTo(r: Rig, o: { x: number; z: number }) {
    const a = this.actor(r);
    a.face = Math.atan2(o.x - a.x, o.z - a.z);
  }

  /** câmera vai até a posição p olhando para l em d segundos (corte seco com movimento reduzido) */
  private setCam(p: THREE.Vector3, l: THREE.Vector3, d: number) {
    const c = this.cam;
    c.p0.copy(this.d.camera.position);
    c.l0.copy(this.look);
    c.p1.copy(p);
    c.l1.copy(l);
    c.t0 = this.T;
    c.d = REDUCED_MOTION ? 0 : d;
    if (c.d === 0) {
      c.p0.copy(p);
      c.l0.copy(l);
      this.look.copy(l);
      this.d.camera.position.copy(p);
      this.d.camera.lookAt(l);
    }
  }

  /** Vira o personagem para o parceiro, "roubando" um pouco para a câmera (rosto três quartos), como em animação. */
  private cheat(r: Rig, partner: { x: number; z: number }, w = 0.5) {
    const a = this.actor(r),
      c = this.cam.p1;
    let px = partner.x - a.x,
      pz = partner.z - a.z,
      cx = c.x - a.x,
      cz = c.z - a.z;
    const lp = Math.hypot(px, pz) || 1,
      lc = Math.hypot(cx, cz) || 1;
    px /= lp;
    pz /= lp;
    cx /= lc;
    cz /= lc;
    a.face = Math.atan2(px * (1 - w) + cx * w, pz * (1 - w) + cz * w);
  }

  private v(x: number, y: number, z: number) {
    return new THREE.Vector3(x, y, z);
  }

  /** Legenda (sempre visível) e voz gravada quando houver; a música abaixa enquanto alguém fala. */
  private say(who: string, t: string) {
    $('iwho').textContent = who;
    $('itx').textContent = t;
    const img = $<HTMLImageElement>('isav'),
      src = this.d.portraits()[who];
    img.hidden = !src;
    if (src) img.src = src;
    const box = $('isub');
    box.classList.remove('show');
    void box.offsetWidth;
    box.classList.add('show');
    this.d.music.duck(true);
    if (this.d.sound()) speakAvailable(t, who);
    return readTime(t);
  }

  private quiet() {
    $('isub').classList.remove('show');
    this.d.music.duck(false);
  }

  private music(t: 'joy' | 'mystery' | 'warm' | 'hope') {
    const cue: Record<typeof t, CueId> = { joy: 'festa', mystery: 'misterio', warm: 'acolhida', hope: 'acolhida' };
    this.d.music.play(cue[t]);
    if (t === 'hope') this.d.music.sting('esperanca');
  }

  /* ---------- roteiro ---------- */

  private async sequence() {
    await this.q1();
    await this.q2();
    await this.q3();
    await this.q4();
    await this.q5();
    await this.endState();
  }

  /** Quadro 1 — Encantamento: o portão se abre e o acampamento se monta bloco a bloco. */
  private async q1() {
    const { player } = this.d,
      p = player();
    this.music('joy');
    this.build = { r0: 0, r1: 120, t0: this.T + 0.4, d: 9.5 };
    if (REDUCED_MOTION) this.d.assembly.done();
    this.setCam(this.v(0, 5.2, 42.5), this.v(0, 4.4, 36), 3);
    await this.w(3);
    // atravessa o portão e voa sobre a Clareira
    this.setCam(this.v(0, 11, 17), this.v(0, 2, -6), 4.5);
    await this.w(3.5);
    const line = this.g(this.text.q1.line);
    const dur = this.say(this.text.q1.who, line);
    await this.w(1);
    // passa pela bandeira e mostra a Colina do Globo ao fundo
    this.setCam(this.v(9, 13, 18), this.v(2, 6, HILL.z), 3.5);
    await this.w(3.4);
    // desce até a Clareira: a criança chega correndo
    this.setCam(this.v(0.6, 3, 3.6), this.v(0, 2.1, 11), 2.6);
    this.place(p, CHILD.x, 21, Math.PI);
    this.walk(p, CHILD.x, CHILD.z, 2.4);
    this.actor(p).pose = { walk: true, speed: 5 };
    await this.w(2.5);
    const a = this.actor(p);
    a.pose = {};
    a.hop = 0.6;
    await this.w(0.6);
    a.pose = { wave: true, mode: 'wow' };
    const big = $('ibig');
    big.textContent = this.g(this.text.q1._big);
    big.classList.add('show');
    sfx('yay');
    const y = this.d.ground(CHILD.x, CHILD.z);
    [0xffd76a, 0xfff1b0, 0xd7a64d].forEach((color, i) =>
      setTimeout(() => this.d.fx.puff(CHILD.x + (i - 1) * 1.2, y + 3.4, CHILD.z, { n: 16, tex: sparkTex, color, add: true, sp: 3.5, up: 4, g: 5, s: 0.5, life: 1.2, grow: 0.2 }), i * 160),
    );
    await this.w(Math.max(3.2, dur - 7.5));
    a.pose = {};
    big.classList.remove('show');
    this.quiet();
  }

  /** Quadro 2 — Mistério: o vento leva as páginas, o Globo se apaga e cai a noite. */
  private async q2() {
    this.music('mystery');
    const by = this.d.ground(BOOK.x, BOOK.z);
    this.setCam(this.v(4, by + 4.2, BOOK.z + 8.5), this.v(0, by + 3.2, BOOK.z - 3), 3.2);
    const dur = this.say(this.text.q2.who, this.g(this.text.q2.line));
    await this.w(2.4);
    // as páginas voam
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshBasicMaterial({ color: 0xfffaf0, side: THREE.DoubleSide, transparent: true }));
      m.position.set(BOOK.x, by + 1.3, BOOK.z);
      this.d.scene.add(m);
      this.props.push(m);
      this.pages.push({ m, a: Math.random() * Math.PI * 2, t: -i * 0.14, r: 0.6 + Math.random() * 0.8, spin: 2 + Math.random() * 3 });
    }
    sfx('page');
    await this.w(3.4);
    // o Globo pisca e se apaga; três faíscas fogem e se escondem
    this.globe.flicker = 1.2;
    await this.w(1.2);
    this.globe = { k: 0, flicker: 0 };
    this.d.camp.setGlobe(0);
    const gy = this.d.ground(GLOBE.x, GLOBE.z) + 3.6;
    const halo = new THREE.SpriteMaterial({ map: sparkTex, color: 0xffd76a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const cube = new THREE.MeshBasicMaterial({ color: 0xffe9a0 });
    for (const sp of SPARKS) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), cube));
      const h = new THREE.Sprite(halo);
      h.scale.setScalar(3.2);
      g.add(h);
      g.position.set(GLOBE.x, gy, GLOBE.z);
      this.d.scene.add(g);
      this.props.push(g);
      this.sparks.push({ g, from: g.position.clone(), to: this.v(sp.x, this.d.ground(sp.x, sp.z) + 0.6, sp.z), t: 0 });
    }
    sfx('dive');
    this.setCam(this.v(0, 15, 24), this.v(2, 3, -12), 2.2);
    await this.w(2.6);
    this.d.daylight.set(1, REDUCED_MOTION ? 0 : 2.6);
    await this.w(1.6);
    // de volta à criança, sozinha no escuro
    const p = this.d.player();
    this.setCam(this.v(STAGE_CAM.x + 0.6, 2.4, STAGE_CAM.z + 1.4), this.v(0, 1.9, CHILD.z), 2.4);
    this.place(p, CHILD.x, CHILD.z, 0);
    this.cheat(p, STAGE_CAM, 1);
    this.actor(p).extra = () => (p.head.rotation.y = Math.sin(this.T * 1.6) * 0.5);
    await this.w(Math.max(3, dur - 10.8));
    this.actor(p).extra = undefined;
    p.head.rotation.y = 0;
    this.quiet();
  }

  /** Quadro 3 — Propósito: a Diretora Cecília chega com o lampião e ergue a Bíblia. */
  private async q3() {
    this.music('warm');
    const s = this.d.sol,
      p = this.d.player();
    // lampião e Bíblia de blocos (sem símbolos inventados: só a palavra "Bíblia")
    const lamp = new THREE.Group();
    part(lamp, 0.3, 0.06, 0.3, 0x3a2a1c, 0, 0.2, 0, 0.02);
    (part(lamp, 0.24, 0.3, 0.24, 0xffd76a, 0, 0, 0, 0.04) as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0xffd76a });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: 0xffc860, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(2.4);
    lamp.add(glow);
    lamp.position.set(0, -0.95, 0.12);
    s.arms[0].add(lamp);
    this.props.push(lamp);
    const bible = new THREE.Group();
    part(bible, 0.5, 0.66, 0.14, 0x2b3d63, 0, 0, 0, 0.03);
    part(bible, 0.44, 0.6, 0.15, 0xf3ead2, 0.04, 0, 0, 0.02);
    plate('Bíblia', 0.4, 0.14, '#2b3d63', '#f1d38a', 0, 0.1, 0.08, 0, { parent: bible, fs: 15 });
    bible.position.set(0, -0.95, 0.3);
    bible.rotation.x = 1.45; // compensa o braço erguido: a capa fica virada para a criança
    bible.visible = false;
    s.arms[1].add(bible);
    this.props.push(bible);

    this.place(s, 8, 8.5, 0);
    this.walk(s, SOL_IN.x, SOL_IN.z, 3);
    this.actor(s).pose = { walk: true, speed: 2 };
    this.setCam(this.v(STAGE_CAM.x + 1.2, STAGE_CAM.y, STAGE_CAM.z), this.v(1.4, 2.5, 11), 2.6);
    this.d.daylight.auraBoost = 4;
    await this.w(1.2);
    this.cheat(p, SOL_IN);
    await this.w(1.9);
    const sa = this.actor(s);
    sa.pose = {};
    this.cheat(s, CHILD);
    // abaixa até a altura da criança e ergue a Bíblia. A pose sai de um único valor (0 a 1) que anda
    // suave com o tempo; antes cada quadro puxava os braços contra animate() e ela tremia no celular.
    let kneel = 0,
      want = 1;
    sa.extra = (dt) => {
      kneel = REDUCED_MOTION ? want : approach(kneel, want, dt, 0.45);
      kneelPose(s, ease(kneel));
    };
    bible.visible = true;
    sfx('plim');
    const [l1, l2] = this.text.q3.lines.map((l) => this.g(l));
    await this.w(this.say(this.text.q3.who, l1));
    this.setCam(this.v(STAGE_CAM.x + 1.6, STAGE_CAM.y + 0.2, STAGE_CAM.z + 1.6), this.v(1.6, 2.8, 11), 4);
    await this.w(this.say(this.text.q3.who, l2));
    want = 0;
    bible.visible = false;
    this.quiet();
  }

  /** Quadro 4 — Companheirismo: o Tico aparece pendurado num galho e cai de cambalhota. */
  private async q4() {
    const t = this.d.tico,
      p = this.d.player(),
      gy = this.d.ground(TICO_IN.x, TICO_IN.z),
      by = gy + 4.1;
    const branch = new THREE.Group();
    part(branch, 3.2, 0.3, 0.3, 0x7a5434, -1.1, 0, 0, 0.08);
    part(branch, 0.7, by - gy + 0.6, 0.7, 0x6a4a2c, -2.6, -(by - gy) / 2 + 0.1, 0, 0.1); // tronco
    for (const [x, y, z] of [[-2.6, 1.3, 0], [-3.3, 1, 0.5], [-2, 1.1, -0.5]]) part(branch, 1.6, 1.2, 1.6, 0x3f8a3a, x, y, z, 0.25);
    for (const [x, y, z] of [[-2.2, 0.5, 0], [-1.2, 0.6, 0.4], [-0.4, 0.45, -0.3], [-1.7, 0.75, -0.4]]) part(branch, 1.1, 0.8, 1.1, 0x4f9a46, x, y, z, 0.2);
    branch.position.set(TICO_IN.x + 0.3, by, TICO_IN.z);
    this.d.scene.add(branch);
    this.props.push(branch);
    const ta = this.actor(t);
    Object.assign(ta, { x: TICO_IN.x, z: TICO_IN.z, y: by - 0.05, face: Math.atan2(STAGE_CAM.x - TICO_IN.x, STAGE_CAM.z - TICO_IN.z) });
    // de cabeça para baixo, preso pelo rabo
    let flip = Math.PI,
      fall = -1;
    ta.extra = (dt) => {
      if (fall >= 0) {
        fall = Math.min(1, fall + dt / (REDUCED_MOTION ? 0.01 : 0.75));
        ta.y = lerp(by - 0.05, gy, fall * fall);
        flip = Math.PI + fall * Math.PI;
      } else branch.rotation.z = Math.sin(this.T * 9) * 0.03;
      t.root.rotation.z = flip;
      t.root.position.y = ta.y;
    };
    this.setCam(this.v(STAGE_CAM.x - 0.6, STAGE_CAM.y + 0.4, STAGE_CAM.z), this.v(-0.9, 2.8, 11), 2);
    this.cheat(p, TICO_IN);
    this.cheat(this.d.sol, TICO_IN, 0.3);
    const dur = this.say(this.text.q4.who, this.g(this.text.q4.line));
    await this.w(1.8);
    fall = 0;
    sfx('jump2');
    await this.w(0.8);
    ta.extra = undefined;
    t.root.rotation.z = 0;
    ta.y = gy;
    sfx('pound');
    this.d.fx.puff(TICO_IN.x, gy + 0.1, TICO_IN.z, { n: 8, sp: 2, up: 0.8, s: 0.45 });
    this.setCam(this.v(STAGE_CAM.x - 0.9, 2.3, STAGE_CAM.z + 1.8), this.v(-1.1, 1.6, 11), 1.4);
    this.cheat(t, CHILD, 0.6);
    // ajeita o lencinho e acena
    ta.extra = () => (t.arms[1].rotation.x = -2.4);
    await this.w(0.9);
    ta.extra = undefined;
    ta.pose = { wave: true };
    this.actor(this.d.sol).pose = { mode: 'open' };
    await this.w(Math.max(3, dur - 3.5));
    ta.pose = {};
    this.quiet();
  }

  /** Quadro 5 — Participação: a criança toca no Livro e vê a página do Dia 1 em branco. */
  private async q5() {
    const p = this.d.player(),
      t = this.d.tico,
      s = this.d.sol,
      by = this.d.ground(BOOK.x, BOOK.z);
    $('fade').style.opacity = '1';
    await this.w(REDUCED_MOTION ? 0 : 0.45);
    this.place(p, NEAR_BOOK.child.x, NEAR_BOOK.child.z, Math.PI);
    this.place(t, NEAR_BOOK.tico.x, NEAR_BOOK.tico.z, 0);
    this.place(s, NEAR_BOOK.sol.x, NEAR_BOOK.sol.z, 0);
    this.faceTo(t, BOOK);
    this.faceTo(s, BOOK);
    this.faceTo(p, BOOK);
    this.setCam(this.v(3.4, by + 4.6, BOOK.z + 8.6), this.v(0, by + 1.4, BOOK.z), 0);
    $('fade').style.opacity = '0';
    // brilho pulsando no Livro
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: 0xffe08a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(BOOK.x, by + 1.35, BOOK.z);
    this.d.scene.add(glow);
    this.props.push(glow);
    this.bookGlow = glow;
    const ta = this.actor(t);
    ta.extra = () => (t.arms[1].rotation.x = -1.5);
    const prompt = this.g(this.text.q5.prompt);
    this.say(this.text.q5.who, prompt);
    $('ibook').classList.add('show');
    setTimeout(() => this.active && $('ibook').focus(), 300);
    // espera o toque; o Tico lembra de vez em quando, sem travar
    const my = this.tok;
    let tapped = false;
    const tap = new Promise<void>((res) => (this.bookTap = res));
    void tap.then(() => (tapped = true));
    for (let i = 0; !tapped; i++) {
      await Promise.race([tap, this.w(8).catch(() => undefined)]);
      if (my !== this.tok) throw CANCEL;
      if (!tapped) {
        ta.pose = { wave: true };
        this.say(this.text.q5.who, prompt);
        setTimeout(() => (ta.pose = {}), 1500);
      }
    }
    this.bookTap = null;
    $('ibook').classList.remove('show');
    ta.extra = undefined;
    ta.pose = {};
    sfx('page');
    glow.visible = false;
    // a página do Dia 1 aparece em branco, só com o título
    const pg = plate(this.text.q5._page, 1.1, 0.78, '#fffaf0', '#172D49', BOOK.x, by + 1.42, BOOK.z + 0.08, 0, { border: '#D7A64D' });
    pg.rotation.x = -0.35;
    (pg.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xfff1c8);
    (pg.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12;
    pg.scale.setScalar(0.01);
    this.props.push(pg);
    this.bookPage = pg;
    this.d.fx.puff(BOOK.x, by + 1.6, BOOK.z, { n: 18, tex: sparkTex, color: 0xffe28a, add: true, sp: 2, up: 2.5, g: 1, s: 0.4, life: 1.1, grow: 0.3 });
    this.setCam(this.v(0.1, by + 3.1, BOOK.z + 2.4), this.v(0, by + 1.3, BOOK.z), 2.2);
    this.faceTo(t, NEAR_BOOK.child);
    await this.w(this.say(this.text.q5.who, this.g(this.text.q5.after)));
    this.quiet();
  }

  /** Quadro 6 — Expectativa: a missão do Dia 1 e o botão para começar. */
  private async endState() {
    // garante o estado final (também quando a criança pula a abertura)
    this.build = null;
    this.d.assembly.done();
    this.d.daylight.set(1);
    this.globe = { k: 0, flicker: 0 };
    this.d.camp.setGlobe(0);
    for (const pg of this.pages) pg.m.visible = false;
    for (const sp of this.sparks) sp.g.visible = false;
    const by = this.d.ground(BOOK.x, BOOK.z);
    if (this.actor(this.d.player()).z > BOOK.z + 10) {
      this.place(this.d.player(), NEAR_BOOK.child.x, NEAR_BOOK.child.z, Math.PI);
      this.place(this.d.tico, NEAR_BOOK.tico.x, NEAR_BOOK.tico.z, 0);
      this.place(this.d.sol, NEAR_BOOK.sol.x, NEAR_BOOK.sol.z, 0);
      this.faceTo(this.d.player(), BOOK);
      this.faceTo(this.d.sol, BOOK);
      this.faceTo(this.d.tico, NEAR_BOOK.child);
      this.d.tico.root.rotation.z = 0;
    }
    this.setCam(this.v(3.2, by + 4.2, BOOK.z + 8.4), this.v(0, by + 2, BOOK.z - 2), REDUCED_MOTION ? 0 : 2);
    this.quiet();
    this.music('hope');
    $('iend').classList.add('show');
    setTimeout(() => this.active && $('igo').focus(), 350);
  }

  /* ---------- quadro a quadro ---------- */

  update(dt: number) {
    if (!this.active) return;
    this.T += dt;
    const due = this.waits.filter((w) => w.at <= this.T);
    if (due.length) {
      this.waits = this.waits.filter((w) => w.at > this.T);
      due.forEach((w) => w.res());
    }
    // montagem do acampamento
    if (this.build && !REDUCED_MOTION) {
      const b = this.build,
        k = Math.min(1, Math.max(0, (this.T - b.t0) / b.d));
      const n = this.d.assembly.set(lerp(b.r0, b.r1, k));
      if (n) sfx('plim');
      if (k >= 1) {
        this.d.assembly.done();
        this.build = null;
      }
    }
    // câmera
    const c = this.cam,
      k = c.d > 0 ? ease(Math.min(1, (this.T - c.t0) / c.d)) : 1;
    this.d.camera.position.lerpVectors(c.p0, c.p1, k);
    this.look.lerpVectors(c.l0, c.l1, k);
    this.d.camera.lookAt(this.look);
    // Globo
    if (this.globe.flicker > 0) {
      this.globe.flicker -= dt;
      this.d.camp.setGlobe(Math.random() < 0.5 ? 0 : 0.4 * Math.random());
    }
    // páginas ao vento
    for (const pg of this.pages) {
      pg.t += dt;
      const t = Math.max(0, pg.t);
      pg.m.visible = pg.t > 0 && t < 5;
      const by = this.d.ground(BOOK.x, BOOK.z);
      const a = pg.a + t * pg.spin;
      pg.m.position.set(BOOK.x + Math.cos(a) * pg.r * t, by + 1.3 + t * 2.4 + t * t * 0.6, BOOK.z + Math.sin(a) * pg.r * t - t * 0.6);
      pg.m.rotation.set(t * 3.1, a, t * 2.3);
      (pg.m.material as THREE.MeshBasicMaterial).opacity = 1 - Math.max(0, (t - 3.5) / 1.5);
    }
    // faíscas fugindo para os esconderijos
    for (const sp of this.sparks) {
      sp.t += dt / 2.4;
      const k2 = Math.min(1, sp.t);
      sp.g.position.lerpVectors(sp.from, sp.to, k2);
      sp.g.position.y += Math.sin(k2 * Math.PI) * 11;
      sp.g.visible = sp.t < 1.4;
      sp.g.rotation.y += dt * 4;
      // rastro de luz enquanto voa
      if (sp.t < 1 && Math.floor(sp.t * 30) !== Math.floor((sp.t - dt / 2.4) * 30))
        this.d.fx.puff(sp.g.position.x, sp.g.position.y, sp.g.position.z, { n: 2, tex: sparkTex, color: 0xffe28a, add: true, sp: 0.4, up: 0, g: 0, s: 0.9, life: 0.9, grow: -0.5 });
      if (sp.t >= 1 && sp.t - dt / 2.4 < 1) this.d.fx.puff(sp.to.x, sp.to.y, sp.to.z, { n: 10, tex: sparkTex, color: 0xffd76a, add: true, sp: 1.5, up: 1.5, s: 0.4, life: 0.8 });
    }
    // brilho do Livro e página nova
    if (this.bookGlow?.visible) this.bookGlow.scale.setScalar(1.6 + Math.sin(this.T * 5) * 0.5);
    if (this.bookPage) this.bookPage.scale.setScalar(lerp(this.bookPage.scale.x, 1, Math.min(1, dt * 5)));
    if ($('ibook').classList.contains('show')) this.pinBookButton();
    // personagens
    for (const a of this.actors) {
      if (a.path) {
        const pth = a.path;
        pth.t = Math.min(1, pth.t + dt / pth.d);
        a.x = lerp(pth.x0, pth.x1, pth.t);
        a.z = lerp(pth.z0, pth.z1, pth.t);
        a.face = Math.atan2(pth.x1 - pth.x0, pth.z1 - pth.z0);
        if (pth.t >= 1) {
          a.path = undefined;
          if (a.pose.walk) a.pose = {};
        }
      }
      let y = a.y;
      if (a.y > -10 && !a.extra) y = a.y = this.d.ground(a.x, a.z);
      if (a.hop !== undefined) {
        a.hop -= dt;
        const h = Math.max(0, a.hop) / 0.6;
        y += Math.sin(h * Math.PI) * 0.9;
        if (a.hop <= 0) {
          a.hop = undefined;
          this.d.fx.puff(a.x, y + 0.05, a.z, { n: 5, sp: 1.4, up: 0.4, s: 0.4 });
        }
      }
      a.rig.root.position.set(a.x, y, a.z);
      a.rig.root.rotation.y = angLerp(a.rig.root.rotation.y, a.face, Math.min(1, dt * 8));
      animate(a.rig, dt, { ...a.pose, air: a.hop !== undefined });
      a.extra?.(dt);
    }
    // luz da noite em volta da criança
    const pa = this.actors[0];
    if (pa) {
      const c2 = this.d.camera.position,
        L = Math.hypot(c2.x - pa.x, c2.z - pa.z) || 1,
        fx = pa.x + ((c2.x - pa.x) / L) * 1.6,
        fz = pa.z + ((c2.z - pa.z) / L) * 1.6;
      this.d.daylight.update(dt, fx, pa.y, fz, Math.atan2(pa.x - fx, pa.z - fz));
    }
  }

  /** O botão HTML fica sobre o Livro na tela (toque, clique ou Enter). */
  private pinBookButton() {
    const by = this.d.ground(BOOK.x, BOOK.z);
    const v = new THREE.Vector3(BOOK.x, by + 1.3, BOOK.z).project(this.d.camera);
    const b = $('ibook');
    b.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
    b.style.top = ((1 - v.y) / 2) * ($('intro').clientHeight || innerHeight) + 'px';
  }
}

/** Marcos que tocam um "plim" quando a montagem passa por eles. */
export function landmarks() {
  return [{ x: 0, z: 36 }, ...[0, 1, 2, 3].map(tentSpot), FLAG, GLOBE, BOOK];
}

