import * as THREE from 'three';
import { Box, Colliders } from './colliders';
import { part } from './builders/kid';
import { radialTex } from './textures';
import { rnd, setSeed } from '../engine/math';

/*
 * Ilha suspensa do Caminho da Luz: a mesma estrutura para os três desafios.
 * Percurso fixo de mini ilhas que sobe em espiral pelo lado de terra (o lago fica ao sul)
 * até o topo, onde ficam os puzzles de espelhos. Visual de blocos, como o resto do acampamento.
 */

import { ARRIVAL_Z, ISLAND, STEPS, TOP_HALF_W, TOP_Y } from './islandLayout';
export { ISLAND, STEPS, TOP_HALF_W, TOP_Y, toWorld } from './islandLayout';
export type { Step } from './islandLayout';

const GRASS = 0x7cc35a,
  GRASS_TOP = 0xa6dc6a,
  ROCK = [0x8d8273, 0x7b7062, 0x9a8f7e, 0x6f665a],
  MOSS = 0x4f9a46;

export class Island {
  readonly group = new THREE.Group();
  /** cada mini ilha do percurso (para a animação de aparecer, em ordem) */
  readonly pieces: THREE.Group[] = [];
  /** o topo com a base de rocha */
  readonly top = new THREE.Group();
  private boxes: Box[] = [];
  private falls: { m: THREE.Mesh; tex: THREE.CanvasTexture }[] = [];
  private mist: THREE.Sprite[] = [];
  private stepGlow: THREE.Mesh[] = [];
  visible = false;

  constructor(
    scene: THREE.Scene,
    private col: Colliders,
  ) {
    setSeed(77);
    this.group.visible = false;
    scene.add(this.group);
    // percurso
    STEPS.forEach((st, i) => {
      const g = new THREE.Group();
      g.position.set(st.x, st.y, st.z);
      if (i === 0) {
        part(g, st.w, 0.4, st.d, 0xd9cfb5, 0, -0.2, 0, 0.12, 0.8);
        part(g, st.w - 0.5, 0.06, st.d - 0.5, 0xffe08a, 0, 0.01, 0, 0.03, 0.6); // marca de partida
      } else {
        part(g, st.w, 0.36, st.d, GRASS_TOP, 0, -0.18, 0, 0.1, 0.8);
        part(g, st.w * 0.86, 0.5, st.d * 0.86, ROCK[i % 4], 0, -0.6, 0, 0.1, 0.9);
        part(g, st.w * 0.55, 0.5, st.d * 0.55, ROCK[(i + 1) % 4], 0, -1.05, 0, 0.1, 0.9);
        part(g, st.w * 0.25, 0.4, st.d * 0.25, ROCK[(i + 2) % 4], 0, -1.45, 0, 0.08, 0.9);
        if (i % 3 === 1) part(g, 0.3, 0.5, 0.3, MOSS, st.w * 0.3, -0.55, st.d * 0.44, 0.08);
      }
      // brilho suave na borda: mostra onde pousar
      const glow = new THREE.Mesh(new THREE.BoxGeometry(st.w + 0.08, 0.06, st.d + 0.08), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0 }));
      glow.position.y = 0.03;
      g.add(glow);
      this.stepGlow.push(glow);
      this.group.add(g);
      this.pieces.push(g);
    });
    this.buildTop();
  }

  private buildTop() {
    const t = this.top,
      W = TOP_HALF_W * 2;
    t.position.set(ISLAND.x, TOP_Y, ISLAND.z);
    part(t, W, 0.5, W, GRASS_TOP, 0, -0.25, 0, 0.12, 0.85);
    part(t, W + 0.2, 0.5, W + 0.2, GRASS, 0, -0.65, 0, 0.12, 0.85);
    // base de rocha em degraus, afinando para baixo (como uma ilha arrancada da terra)
    const layers: [number, number][] = [
      [W - 0.2, 1.3],
      [W - 1.6, 1.4],
      [W - 3.2, 1.5],
      [W - 5, 1.5],
      [W - 6.8, 1.3],
    ];
    let y = -0.9;
    layers.forEach(([w, h], i) => {
      y -= h / 2;
      part(t, w, h, w, ROCK[i % 4], 0, y, 0, 0.18, 0.95);
      // blocos soltos nas laterais, para a rocha não parecer uma caixa
      for (let k = 0; k < 6; k++) {
        const a = rnd() * Math.PI * 2,
          r = w / 2 - 0.1;
        part(t, 0.9 + rnd() * 0.8, h * (0.6 + rnd() * 0.5), 0.9 + rnd() * 0.8, ROCK[(i + k) % 4], Math.cos(a) * r * 0.8, y - rnd() * 0.3, Math.sin(a) * r * 0.8, 0.15, 0.95);
      }
      y -= h / 2;
    });
    // musgo pendurado
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2 + rnd() * 0.3,
        r = TOP_HALF_W - 0.1;
      part(t, 0.4, 0.6 + rnd() * 0.9, 0.4, MOSS, Math.cos(a) * r, -1.3 - rnd() * 0.5, Math.sin(a) * r, 0.1);
    }
    // borda baixa de pedra, com passagem no lado da chegada (oeste)
    for (let i = -4; i <= 4; i++) {
      const p = i * 1.05;
      for (const [x, z] of [
        [p, -TOP_HALF_W + 0.2],
        [p, TOP_HALF_W - 0.2],
        [TOP_HALF_W - 0.2, p],
      ])
        part(t, 0.9, 0.45, 0.9, ROCK[(i + 8) % 4], x, 0.2, z, 0.15, 0.9);
      if (Math.abs(p - (ARRIVAL_Z - ISLAND.z)) > 1.6) part(t, 0.9, 0.45, 0.9, ROCK[(i + 9) % 4], -TOP_HALF_W + 0.2, 0.2, p, 0.15, 0.9);
    }
    // flores e moitas nos cantos (fora da área do puzzle)
    for (const [x, z] of [
      [-4.1, -4.1],
      [4.1, -4.1],
      [4.1, 4.1],
      [-4.1, 4.1],
    ]) {
      part(t, 0.7, 0.55, 0.7, MOSS, x, 0.3, z, 0.25);
      part(t, 0.2, 0.2, 0.2, [0xffd23f, 0xff8fa3, 0xffffff][Math.abs(x + z) % 3 | 0], x + 0.25, 0.65, z - 0.1, 0.06);
    }
    // cachoeiras no lado do lago (sul), que se desfazem em névoa no ar
    for (const x of [-2.6, 0.4, 3]) {
      const tex = waterTex();
      const h = TOP_Y + 0.1 + rnd() * 0.2; // até a água do lago
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, h), new THREE.MeshBasicMaterial({ map: tex, alphaMap: fadeTex, color: 0xd8f2ff, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      m.position.set(x, -h / 2 - 0.2, TOP_HALF_W + 0.18);
      t.add(m);
      this.falls.push({ m, tex });
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0.55 }));
      s.position.set(x, -h - 0.2, TOP_HALF_W + 0.3);
      s.scale.set(3, 2, 1);
      t.add(s);
      this.mist.push(s);
    }
    this.group.add(t);
  }

  /** Liga as colisões das plataformas e do topo (borda com passagem a oeste). */
  private addColliders() {
    if (this.boxes.length) return;
    const c = this.col,
      push = (x: number, z: number, w: number, d: number, top: number, bottom: number) => {
        const b: Box = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, top, bottom };
        c.boxes.push(b);
        this.boxes.push(b);
      };
    STEPS.forEach((st, i) => push(st.x, st.z, st.w, st.d, st.y, i === 0 ? -5 : st.y - 1.6));
    push(ISLAND.x, ISLAND.z, TOP_HALF_W * 2, TOP_HALF_W * 2, TOP_Y, TOP_Y - 8);
    // paredes invisíveis na borda do topo (a criança não cai sem querer); a passagem a oeste fica aberta
    const hw = TOP_HALF_W,
      wallTop = TOP_Y + 2.6,
      wallBot = TOP_Y - 0.1;
    push(ISLAND.x, ISLAND.z - hw, hw * 2, 0.4, wallTop, wallBot);
    push(ISLAND.x, ISLAND.z + hw, hw * 2, 0.4, wallTop, wallBot);
    push(ISLAND.x + hw, ISLAND.z, 0.4, hw * 2, wallTop, wallBot);
    const gap = 1.6,
      a0 = ISLAND.z - hw,
      a1 = ARRIVAL_Z - gap,
      b0 = ARRIVAL_Z + gap,
      b1 = ISLAND.z + hw;
    if (a1 > a0) push(ISLAND.x - hw, (a0 + a1) / 2, 0.4, a1 - a0, wallTop, wallBot);
    if (b1 > b0) push(ISLAND.x - hw, (b0 + b1) / 2, 0.4, b1 - b0, wallTop, wallBot);
  }

  private removeColliders() {
    this.col.removeBoxes(this.boxes);
    this.boxes = [];
  }

  /** Mostra tudo pronto (retomada do jogo, sem animação). */
  show() {
    this.visible = this.group.visible = true;
    this.pieces.forEach((p) => p.scale.setScalar(1));
    this.top.scale.setScalar(1);
    this.top.position.y = TOP_Y;
    this.addColliders();
  }

  /**
   * Quadro da animação de aparecer (k de 0 a 1): o topo sobe do chão girando de leve,
   * as mini ilhas surgem em ordem, da partida até o topo. Devolve o índice da peça que acabou de surgir.
   */
  appear(k: number) {
    this.visible = this.group.visible = true;
    const e = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2));
    const kt = Math.min(1, k / 0.45);
    this.top.scale.setScalar(Math.max(0.001, e(kt)));
    this.top.position.y = TOP_Y - (1 - Math.min(1, kt * 1.2)) * 7;
    let popped = -1;
    this.pieces.forEach((p, i) => {
      const ki = (k - 0.35 - i * 0.06) / 0.14;
      const before = p.scale.x;
      p.scale.setScalar(Math.max(0.001, e(ki)));
      if (before < 0.01 && ki > 0) popped = i;
    });
    if (k >= 1) this.addColliders();
    return popped;
  }

  /** Some aos poucos, do topo para a partida (k de 0 a 1). */
  vanish(k: number) {
    if (k <= 0) this.removeColliders();
    this.top.scale.setScalar(Math.max(0.001, 1 - Math.min(1, k / 0.6)));
    this.pieces.forEach((p, i) => {
      const ki = (k - (this.pieces.length - i) * 0.05) / 0.25;
      p.scale.setScalar(Math.max(0.001, 1 - Math.min(1, Math.max(0, ki))));
    });
    if (k >= 1) this.hide();
  }

  hide() {
    this.removeColliders();
    this.visible = this.group.visible = false;
  }

  /** 0 = dia, 1 = escuro total: no escuro todas as plataformas ganham uma borda acesa, para a criança ver onde pular. */
  dark = 0;

  /** Brilho na próxima plataforma do percurso (onde a criança deve pousar). */
  guide(next: number, t: number) {
    const base = this.dark * 0.3;
    this.stepGlow.forEach((g, i) => ((g.material as THREE.MeshBasicMaterial).opacity = i === next ? Math.max(base, 0.45 + Math.sin(t * 5) * 0.25) : base));
  }

  update(dt: number, t: number) {
    if (!this.group.visible) return;
    for (const f of this.falls) f.tex.offset.y = (f.tex.offset.y - dt * 0.9) % 1;
    this.mist.forEach((s, i) => (s.material.opacity = 0.45 + Math.sin(t * 1.3 + i) * 0.12));
  }

  /** Em qual peça do percurso a criança está pisando (-1 = chão, STEPS.length = topo). */
  standingOn(x: number, y: number, z: number) {
    if (Math.abs(x - ISLAND.x) < TOP_HALF_W && Math.abs(z - ISLAND.z) < TOP_HALF_W && Math.abs(y - TOP_Y) < 0.3) return STEPS.length;
    for (let i = STEPS.length - 1; i >= 0; i--) {
      const s = STEPS[i];
      if (Math.abs(x - s.x) < s.w / 2 + 0.2 && Math.abs(z - s.z) < s.d / 2 + 0.2 && Math.abs(y - s.y) < 0.3) return i;
    }
    return y < 0.6 ? -1 : -2;
  }
}

/** Textura de água caindo (listras claras que descem), com fim transparente. */
function waterTex() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#9fd8f5';
    g.fillRect(0, 0, 32, 128);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) g.fillRect(2 + ((i * 7) % 28), (i * 37) % 128, 2, 18);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** some de cima para baixo: a água vira névoa no ar */
const fadeTex = (() => {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#ddd');
    grad.addColorStop(0.35, '#fff');
    grad.addColorStop(0.75, '#bbb');
    grad.addColorStop(1, '#000');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 64);
  }
  return new THREE.CanvasTexture(c);
})();

const mistTex = radialTex([
  [0, 'rgba(255,255,255,0.9)'],
  [0.5, 'rgba(255,255,255,0.35)'],
  [1, 'rgba(255,255,255,0)'],
]);

