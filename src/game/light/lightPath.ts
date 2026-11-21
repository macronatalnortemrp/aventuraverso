import * as THREE from 'three';
import { Puzzle, Mirror, Trace, trace, turn } from './beam';
import { PUZZLES } from './puzzles';
import { Island, ISLAND, STEPS, TOP_Y } from '../../world/island';
import { Colliders, Box } from '../../world/colliders';
import { Interactables, Interactable } from '../../world/interactables';
import { Fx, sparkTex } from '../../world/fx';
import { part } from '../../world/builders/kid';
import { REDUCED_MOTION } from '../../engine/gfx';
import { sfx } from '../../engine/audio';
import { lerp } from '../../engine/math';

/*
 * O Caminho da Luz (Dia 1, etapa dos convites): sequência de desafios de habilidade e raciocínio,
 * sem narrativa. Sobe-se pelas mini ilhas e, no topo, encaixam-se e giram-se espelhos até a luz
 * chegar ao cristal. A trajetória é calculada de verdade (beam.ts); nada é animação de enfeite.
 */

/** altura do feixe acima do piso do topo */
const BEAM_Y = 1.1;
/** posição da estante de espelhos (u, v), perto da chegada */
const RACK = { u: 1.6, v: -3.9 };

/** Coordenadas do puzzle (u, v) para o grupo do topo (x, z locais). */
const local = (u: number, v: number) => ({ x: v, z: -u });

export interface LightDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  col: Colliders;
  inter: Interactables;
  fx: Fx;
  /** posição atual do jogador */
  player: () => { x: number; y: number; z: number };
}

interface Shot {
  p: THREE.Vector3;
  l: THREE.Vector3;
  d: number;
}

export class LightPath {
  readonly island: Island;
  stage = 0;
  /** desafio montado no topo e esperando solução */
  active = false;
  solved = false;
  carrying = false;
  private placed: Mirror[] = [];
  private inRack = 0;
  private pz: Puzzle = PUZZLES[0];
  private kit = new THREE.Group();
  private mirrorObjs: { g: THREE.Group; angle: number; shown: number; support: number }[] = [];
  private rackMirrors: THREE.Group[] = [];
  private ringMeshes: THREE.Mesh[] = [];
  private crystal!: THREE.Mesh;
  private crystalMat!: THREE.MeshStandardMaterial;
  private carried: THREE.Group;
  private beam: THREE.Mesh[] = [];
  private beamGlow: THREE.Mesh[] = [];
  private tip: THREE.Sprite;
  private blockBoxes: Box[] = [];
  private inters: Interactable[] = [];
  private lastTrace: Trace | null = null;
  private litT = 0;
  private pillar: THREE.Mesh | null = null;
  /** quando o feixe acende o cristal */
  onSolved: ((stage: number) => void) | null = null;
  /* câmera dirigida */
  private shots: Shot[] = [];
  private shotT = 0;
  private from = { p: new THREE.Vector3(), l: new THREE.Vector3() };
  private look = new THREE.Vector3();
  private shotsDone: (() => void) | null = null;

  constructor(private d: LightDeps) {
    this.island = new Island(d.scene, d.col);
    this.island.top.add(this.kit);
    // espelho na mão (sobre a cabeça) enquanto a criança leva até um suporte
    this.carried = mirrorMesh(0.7);
    this.carried.visible = false;
    d.scene.add(this.carried);
    // feixe: segmentos reaproveitados
    const core = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
    const glow = new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1, 0.09, 0.09), core),
        g = new THREE.Mesh(new THREE.BoxGeometry(1, 0.32, 0.32), glow);
      c.visible = g.visible = false;
      this.island.top.add(c, g);
      this.beam.push(c);
      this.beamGlow.push(g);
    }
    this.tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, color: 0xffe28a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.tip.scale.setScalar(0.9);
    this.tip.visible = false;
    this.island.top.add(this.tip);
  }

  /* ---------- montagem do desafio ---------- */

  /** Monta no topo o desafio da etapa (0, 1 ou 2). `solved` mostra a etapa já concluída (luz acesa). */
  setup(stage: number, solved = false) {
    this.clearKit();
    this.stage = stage;
    this.pz = PUZZLES[stage];
    this.solved = solved;
    this.active = !solved;
    this.carrying = false;
    this.carried.visible = false;
    this.placed = solved ? this.pz.solution.map((angle, support) => ({ support, angle })) : [];
    this.inRack = solved ? 0 : this.pz.supports.length;
    const k = this.kit,
      pz = this.pz;
    // fonte de luz: pedestal e lanterna dourada virada para o feixe
    {
      const p = local(pz.source.u, pz.source.v),
        g = new THREE.Group();
      g.position.set(p.x, 0, p.z);
      part(g, 0.9, 0.7, 0.9, 0xcfc4a8, 0, 0.35, 0, 0.12);
      part(g, 0.7, 0.6, 0.7, 0xd7a64d, 0, 1.0, 0, 0.12, 0.4);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 16), new THREE.MeshBasicMaterial({ color: 0xfff1b0 }));
      lens.rotation.z = Math.PI / 2;
      lens.position.set(0.36, 1.0, 0);
      g.add(lens);
      g.rotation.y = beamYaw(pz.source.dir);
      k.add(g);
    }
    // suportes
    this.ringMeshes = pz.supports.map((s) => {
      const p = local(s.u, s.v);
      part(k, 0.7, 0.5, 0.7, 0xb9ae96, p.x, 0.25, p.z, 0.2);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(p.x, 0.53, p.z);
      k.add(ring);
      return ring;
    });
    // pedras que seguram a luz
    for (const b of pz.blocks) {
      const p = local(b.u, b.v);
      part(k, b.hv * 2, 1.6, b.hu * 2, 0x8d8273, p.x, 0.8, p.z, 0.15, 0.95);
      part(k, b.hv * 2 - 0.3, 0.25, b.hu * 2 - 0.3, 0x7cc35a, p.x, 1.66, p.z, 0.1);
      const w = toWorldXZ(b.u, b.v);
      const box: Box = { x0: w.x - b.hv, x1: w.x + b.hv, z0: w.z - b.hu, z1: w.z + b.hu, top: TOP_Y + 1.6, bottom: TOP_Y - 0.1 };
      this.d.col.boxes.push(box);
      this.blockBoxes.push(box);
    }
    // cristal receptor
    {
      const p = local(pz.receiver.u, pz.receiver.v);
      part(k, 0.8, 0.6, 0.8, 0xcfc4a8, p.x, 0.3, p.z, 0.15);
      this.crystalMat = new THREE.MeshStandardMaterial({ color: 0x9fe3ff, emissive: 0x6fd0ff, emissiveIntensity: 0.15, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.9 });
      this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), this.crystalMat);
      this.crystal.scale.set(1, 1.5, 1);
      this.crystal.position.set(p.x, BEAM_Y, p.z);
      k.add(this.crystal);
    }
    // estante com os espelhos disponíveis
    {
      const p = local(RACK.u, RACK.v);
      part(k, 1.8, 0.3, 0.6, 0x7a5634, p.x, 0.15, p.z, 0.06);
      this.rackMirrors = pz.supports.map((_, i) => {
        const m = mirrorMesh(0.75);
        m.position.set(p.x - 0.55 + i * 0.55, 0.3, p.z);
        m.rotation.y = 0;
        k.add(m);
        return m;
      });
    }
    // espelhos (aparecem quando encaixados)
    this.mirrorObjs = pz.supports.map((s, i) => {
      const g = mirrorMesh(1);
      const p = local(s.u, s.v);
      g.position.set(p.x, 0.5, p.z);
      g.visible = false;
      k.add(g);
      return { g, angle: 90, shown: 90, support: i };
    });
    for (const m of this.placed) this.showMirror(m.support, m.angle);
    this.crystalMat.emissiveIntensity = solved ? 2.2 : 0.15;
    this.addInteractables();
    this.refresh();
  }

  private clearKit() {
    this.kit.clear();
    this.d.col.removeBoxes(this.blockBoxes);
    this.blockBoxes = [];
    for (const o of this.inters) o.off = true;
    this.pillar?.removeFromParent();
    this.pillar = null;
    this.lastTrace = null;
    this.litT = 0;
  }

  private addInteractables() {
    const add = (id: string, u: number, v: number, w: number) => {
      const p = toWorldXZ(u, v);
      let o = this.d.inter.byId(id);
      if (!o) o = this.d.inter.add({ id, x: p.x, z: p.z, y: TOP_Y, w, h: 2.4, name: 'Caminho da Luz', label: '', who: 'Tico' });
      Object.assign(o, { x: p.x, z: p.z, y: TOP_Y, off: false });
      o.mesh?.position.set(p.x, TOP_Y + 1.2, p.z);
      if (!this.inters.includes(o)) this.inters.push(o);
      return o;
    };
    add('lp-rack', RACK.u, RACK.v, 2);
    this.pz.supports.forEach((s, i) => add('lp-sup' + i, s.u, s.v, 1.6));
    for (let i = this.pz.supports.length; i < 3; i++) {
      const o = this.d.inter.byId('lp-sup' + i);
      if (o) o.off = true;
    }
  }

  /** Atualiza rótulos dos botões de ação, giro e o feixe. */
  private refresh() {
    const rack = this.d.inter.byId('lp-rack');
    if (rack) {
      rack.label = this.inRack ? 'Pegar espelho' : '';
      rack.off = !this.active || this.inRack === 0 || this.carrying;
    }
    this.pz.supports.forEach((_, i) => {
      const o = this.d.inter.byId('lp-sup' + i);
      if (!o) return;
      const has = this.placed.some((m) => m.support === i);
      o.label = has ? 'Girar espelho' : 'Encaixar espelho';
      o.off = !this.active || (!has && !this.carrying);
      o.rotate = has && this.active ? (dir) => this.rotate(i, dir) : undefined;
      this.ringMeshes[i].visible = !has;
    });
    this.rackMirrors.forEach((m, i) => (m.visible = i < this.inRack));
    this.lastTrace = trace(this.pz, this.placed);
    this.drawBeam(this.lastTrace);
  }

  /* ---------- interação ---------- */

  onInteract(o: Interactable): boolean {
    if (!this.active || !o.id?.startsWith('lp-')) return false;
    if (o.id === 'lp-rack') {
      if (this.inRack > 0 && !this.carrying) {
        this.inRack--;
        this.carrying = true;
        this.carried.visible = true;
        sfx('ui');
        this.refresh();
      }
      return true;
    }
    const i = Number(o.id.slice(6));
    const has = this.placed.find((m) => m.support === i);
    if (has) this.rotate(i, 1);
    else if (this.carrying) {
      // encaixa sozinho, virado de frente para quem chega (a criança descobre o ângulo girando)
      const m = { support: i, angle: 90 };
      this.placed.push(m);
      this.carrying = false;
      this.carried.visible = false;
      this.showMirror(i, m.angle);
      const p = toWorldXZ(this.pz.supports[i].u, this.pz.supports[i].v);
      this.d.fx.puff(p.x, TOP_Y + 1, p.z, { n: 8, tex: sparkTex, color: 0xdff6ff, add: true, sp: 1.5, up: 1, s: 0.35, life: 0.5 });
      sfx('jump');
      this.refresh();
    }
    return true;
  }

  rotate(support: number, dir: 1 | -1) {
    if (!this.active) return;
    const m = this.placed.find((x) => x.support === support);
    if (!m) return;
    m.angle = turn(m.angle, dir);
    this.mirrorObjs[support].angle = m.angle;
    sfx('ui');
    this.refresh();
  }

  private showMirror(i: number, angle: number) {
    const o = this.mirrorObjs[i];
    o.g.visible = true;
    o.angle = o.shown = angle;
    o.g.rotation.y = mirrorYaw(angle);
    o.g.scale.setScalar(0.01);
  }

  /* ---------- feixe ---------- */

  private drawBeam(t: Trace) {
    const pts = t.points;
    this.beam.forEach((b, i) => {
      const g = this.beamGlow[i];
      if (i >= pts.length - 1) {
        b.visible = g.visible = false;
        return;
      }
      const a = local(pts[i].u, pts[i].v),
        c = local(pts[i + 1].u, pts[i + 1].v),
        dx = c.x - a.x,
        dz = c.z - a.z,
        L = Math.hypot(dx, dz);
      for (const m of [b, g]) {
        m.visible = L > 0.01;
        m.position.set((a.x + c.x) / 2, BEAM_Y, (a.z + c.z) / 2);
        m.scale.x = Math.max(0.01, L);
        m.rotation.y = Math.atan2(-dz, dx);
      }
    });
    const end = local(pts[pts.length - 1].u, pts[pts.length - 1].v);
    this.tip.position.set(end.x, BEAM_Y, end.z);
    this.tip.visible = true;
  }

  /* ---------- câmera dirigida ---------- */

  /** Toca uma sequência de planos; enquanto toca, `camera()` controla a câmera. */
  play(shots: Shot[]) {
    this.from.p.copy(this.d.camera.position);
    this.from.l.copy(this.look.lengthSq() ? this.look : new THREE.Vector3(ISLAND.x, 4, ISLAND.z));
    this.shots = REDUCED_MOTION ? shots.map((s) => ({ ...s, d: Math.min(s.d, 0.01) + (s.d > 1.5 ? 1.2 : 0) })) : shots;
    this.shotT = performance.now();
    return new Promise<void>((r) => (this.shotsDone = r));
  }

  /** Chamado a cada quadro pelo laço principal. Devolve true enquanto a câmera é da cena. */
  camera(_dt: number) {
    if (!this.shots.length) return false;
    const s = this.shots[0];
    // relógio real (como a animação da ilha): a apresentação dura o mesmo em qualquer aparelho
    const k = Math.min(1, (performance.now() - this.shotT) / 1000 / Math.max(0.001, s.d)),
      e = REDUCED_MOTION ? 1 : k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    this.d.camera.position.lerpVectors(this.from.p, s.p, e);
    this.look.lerpVectors(this.from.l, s.l, e);
    this.d.camera.lookAt(this.look);
    if (k >= 1) {
      this.from.p.copy(s.p);
      this.from.l.copy(s.l);
      this.shots.shift();
      this.shotT = performance.now();
      if (!this.shots.length) {
        const r = this.shotsDone;
        this.shotsDone = null;
        r?.();
      }
    }
    return true;
  }

  /** Planos da apresentação: o lugar, o percurso desde a partida e a área do desafio. */
  tour(): Shot[] {
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    /** câmera do lado de fora do anel do percurso, na direção da peça, olhando para ela */
    const outside = (st: { x: number; z: number; y: number }, dist: number, up: number): Shot => {
      const a = Math.atan2(st.z - ISLAND.z, st.x - ISLAND.x);
      return { p: v(ISLAND.x + Math.cos(a) * dist, st.y + up, ISLAND.z + Math.sin(a) * dist), l: v(st.x, st.y + 0.6, st.z), d: 2.3 };
    };
    const s0 = STEPS[0],
      s2 = STEPS[2];
    return [
      // 0. o lugar onde a ilha vai surgir, visto da Clareira
      { p: v(ISLAND.x + 22, 8, ISLAND.z + 14), l: v(ISLAND.x, 4.5, ISLAND.z), d: 1.4 },
      // 1. a partida (marca dourada) e os primeiros saltos
      { p: v(s0.x + 7, 6, s0.z + 6), l: v((s0.x + s2.x) / 2, 1.2, (s0.z + s2.z) / 2), d: 2.4 },
      // 2. o meio do caminho, subindo em volta da ilha
      outside(STEPS[4], 17, 6),
      // 3. a última mini ilha e a passagem para o topo
      outside(STEPS[8], 15, 5),
      // 4. a área do desafio, vista de cima
      { p: v(ISLAND.x - 5, TOP_Y + 11, ISLAND.z + 7), l: v(ISLAND.x + 0.3, TOP_Y + 0.4, ISLAND.z - 0.3), d: 2.6 },
    ];
  }

  /** Volta suave para perto do jogador antes de devolver o controle. */
  backTo(x: number, y: number, z: number, yaw: number, dist = 13, pitch = 0.5): Shot {
    return {
      p: new THREE.Vector3(x + Math.sin(yaw) * Math.cos(pitch) * dist, y + 1.6 + Math.sin(pitch) * dist, z + Math.cos(yaw) * Math.cos(pitch) * dist),
      l: new THREE.Vector3(x, y + 1.6, z),
      d: 1.4,
    };
  }

  /* ---------- quadro a quadro ---------- */

  /** Peça do percurso que deve brilhar: a próxima acima de onde a criança está. */
  private guideNext(t: number) {
    const p = this.d.player();
    const on = this.island.standingOn(p.x, p.y, p.z);
    const next = !this.active || on >= STEPS.length ? -1 : on === -2 ? -1 : on + 1;
    this.island.guide(next >= STEPS.length ? -1 : next, t);
  }

  update(dt: number, t: number) {
    this.island.update(dt, t);
    if (!this.island.visible) return;
    this.guideNext(t);
    // espelhos aparecem e giram suaves até o ângulo escolhido
    for (const o of this.mirrorObjs) {
      if (!o.g.visible) continue;
      if (o.g.scale.x < 1) o.g.scale.setScalar(Math.min(1, o.g.scale.x + dt * 6));
      let diff = o.angle - o.shown;
      if (diff > 90) diff -= 180;
      if (diff < -90) diff += 180;
      o.shown += diff * Math.min(1, dt * 14);
      o.g.rotation.y = mirrorYaw(o.shown);
    }
    this.ringMeshes.forEach((r, i) => r.visible && r.scale.setScalar(1 + Math.sin(t * 4 + i) * 0.08));
    // espelho na mão
    if (this.carried.visible) {
      const p = this.d.player();
      this.carried.position.set(p.x, p.y + 3.1 + Math.sin(t * 4) * 0.08, p.z);
      this.carried.rotation.y = t * 1.5;
    }
    this.tip.scale.setScalar(0.8 + Math.sin(t * 9) * 0.15);
    this.crystal?.rotation.set(0, t * (this.solved ? 2 : 0.6), 0);
    if (this.pillar) {
      const m = this.pillar.material as THREE.MeshBasicMaterial;
      m.opacity = Math.min(0.55, m.opacity + dt * 0.4);
      this.pillar.scale.y = Math.min(1, this.pillar.scale.y + dt * 0.8);
    }
    // o feixe chegou ao cristal: confirma por um instante (o espelho termina de girar) e conclui
    if (this.active && this.lastTrace?.lit) {
      this.litT += dt;
      this.crystalMat.emissiveIntensity = lerp(this.crystalMat.emissiveIntensity, 1.2, Math.min(1, dt * 4));
      if (this.litT > 0.45) this.complete();
    } else if (this.active) {
      this.litT = 0;
      this.crystalMat.emissiveIntensity = lerp(this.crystalMat.emissiveIntensity, 0.15, Math.min(1, dt * 4));
    }
  }

  /** Comemoração proporcional à etapa: a terceira é a maior. */
  private complete() {
    this.active = false;
    this.solved = true;
    this.refresh();
    const r = this.pz.receiver,
      w = toWorldXZ(r.u, r.v),
      y = TOP_Y + BEAM_Y;
    this.crystalMat.emissiveIntensity = 2.4;
    this.crystal.scale.set(1.25, 1.9, 1.25);
    const fx = this.d.fx;
    sfx('yay');
    fx.puff(w.x, y, w.z, { n: 18, tex: sparkTex, color: 0xbff0ff, add: true, sp: 2.5, up: 2.5, s: 0.45, life: 0.9 });
    if (this.stage >= 1) {
      fx.shock(w.x, TOP_Y, w.z, 0xfff1b0);
      setTimeout(() => fx.puff(w.x, y + 0.5, w.z, { n: 26, tex: sparkTex, color: 0xffe28a, add: true, sp: 4, up: 4, g: 3, s: 0.5, life: 1.2 }), 250);
    }
    if (this.stage >= 2) {
      // coluna de luz sobe do cristal central
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.8, 14, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      );
      m.geometry.translate(0, 7, 0);
      const p = local(r.u, r.v);
      m.position.set(p.x, BEAM_Y, p.z);
      m.scale.y = 0.01;
      this.island.top.add(m);
      this.pillar = m;
      [0, 400, 800].forEach((ms, i) =>
        setTimeout(() => {
          fx.shock(w.x, TOP_Y, w.z, [0xfff1b0, 0xbff0ff, 0xffd76a][i]);
          fx.puff(w.x, y + 1 + i, w.z, { n: 30, tex: sparkTex, color: [0xfff1b0, 0xbff0ff, 0xffd76a][i], add: true, sp: 5, up: 5, g: 2, s: 0.55, life: 1.5 });
        }, ms),
      );
    }
    setTimeout(() => this.onSolved?.(this.stage), REDUCED_MOTION ? 200 : 900);
  }

  /** Desliga tudo (fim do desafio, saída da missão). */
  hide() {
    this.active = false;
    this.carrying = false;
    this.carried.visible = false;
    this.clearKit();
    this.beam.forEach((b, i) => (b.visible = this.beamGlow[i].visible = false));
    this.tip.visible = false;
    this.island.hide();
  }

  /** O rótulo de giro (para o laço principal mostrar os botões ⟲ ⟳). */
  get busyCamera() {
    return this.shots.length > 0;
  }
}

/** Espelho de pé: moldura de madeira, face espelhada dos dois lados, haste. Tamanho relativo s. */
function mirrorMesh(s: number) {
  const g = new THREE.Group();
  const face = new THREE.MeshStandardMaterial({ color: 0xdff2ff, metalness: 0.95, roughness: 0.08, envMapIntensity: 1.6 });
  part(g, 0.12 * s, 0.5 * s, 0.12 * s, 0x7a5634, 0, 0.25 * s, 0, 0.04);
  part(g, 1.3 * s, 0.95 * s, 0.14 * s, 0xb8834f, 0, 0.6 * s + 0.0, 0, 0.05);
  const f = new THREE.Mesh(new THREE.BoxGeometry(1.12 * s, 0.78 * s, 0.16 * s), face);
  f.position.y = 0.6 * s;
  g.add(f);
  return g;
}

/** O espelho (linha a `angle` graus no plano u, v) vira para o mundo do grupo do topo. */
const mirrorYaw = (angle: number) => {
  const a = (angle * Math.PI) / 180,
    dx = Math.sin(a),
    dz = -Math.cos(a);
  return Math.atan2(-dz, dx);
};
const beamYaw = (dir: number) => mirrorYaw(dir);

function toWorldXZ(u: number, v: number) {
  return { x: ISLAND.x + v, z: ISLAND.z - u };
}
