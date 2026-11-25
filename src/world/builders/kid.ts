import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, decal } from '../textures';
import { lerp, rnd, rr } from '../../engine/math';

/* Personagens de blocos: Aventureiros, Diretora Cecília, Pedrito e Tico (docs/CHARACTERS.md). */

export type HairStyle = 'short' | 'long' | 'curly' | 'afro' | 'pony';
export type FaceMode = 'open' | 'blink' | 'wow';

export interface Look {
  n?: string;
  skin: number;
  hair: number;
  style?: HairStyle;
  eye?: string;
  brow?: number;
  glasses?: boolean;
  skirt?: boolean;
  bow?: boolean;
  /** lenço de líder com LA1 (Diretora Cecília) */
  la1?: boolean;
  /** sem uniforme (visitante) */
  bare?: boolean;
  shirt?: number;
  pants?: number;
  pack?: boolean;
  scale?: number;
  animal?: boolean;
}

export interface Rig {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  face: THREE.Mesh;
  fm: THREE.MeshStandardMaterial;
  legs: THREE.Group[];
  arms: THREE.Group[];
  tail?: THREE.Group[];
  o: Look;
  ph: number;
  blink: number;
  mode: FaceMode;
}

export interface Pose {
  walk?: boolean;
  speed?: number;
  air?: boolean;
  swim?: boolean;
  wave?: boolean;
  mode?: FaceMode;
}

const materials = new Map<string, THREE.MeshStandardMaterial>();
export const mat = (c: number, r = 0.7) => {
  const k = c + '_' + r;
  let m = materials.get(k);
  if (!m) materials.set(k, (m = new THREE.MeshStandardMaterial({ color: c, roughness: r })));
  return m;
};

const geos = new Map<string, RoundedBoxGeometry>();
export const rg = (w: number, h: number, d: number, r = 0.08) => {
  const k = [w, h, d, r].join();
  let g = geos.get(k);
  if (!g) geos.set(k, (g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) / 2 - 0.01))));
  return g;
};

export function part(p: THREE.Object3D, w: number, h: number, d: number, c: number, x: number, y: number, z: number, r?: number, rough?: number) {
  const m = new THREE.Mesh(rg(w, h, d, r), mat(c, rough));
  m.position.set(x, y, z);
  m.castShadow = true;
  p.add(m);
  return m;
}

export function piv(p: THREE.Object3D, x: number, y: number, z: number) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  p.add(g);
  return g;
}

const faces = new Map<string, THREE.CanvasTexture>();

/** Rosto desenhado em textura: olhos grandes com brilho, sobrancelha, bochecha e boca. Nunca olhos vazios. */
export function faceTex(o: Look, mode: FaceMode) {
  const k = [o.hair, o.skin, o.eye || 0, mode, o.glasses ? 1 : 0, o.animal ? 1 : 0].join();
  const hit = faces.get(k);
  if (hit) return hit;
  const t = canvasTex(256, 256, (g) => {
    const hx = '#' + new THREE.Color(o.brow ?? o.hair).getHexString(),
      eye = o.eye || '#3b2416',
      lift = mode === 'wow' ? -8 : 0;
    for (const s of [-1, 1]) {
      const cx = 128 + s * 52,
        cy = 128;
      if (mode === 'blink') {
        g.strokeStyle = '#2a1a12';
        g.lineWidth = 9;
        g.lineCap = 'round';
        g.beginPath();
        g.arc(cx, cy + 4, 22, Math.PI * 1.1, Math.PI * 1.9, false);
        g.stroke();
      } else {
        g.fillStyle = '#fff';
        g.beginPath();
        g.ellipse(cx, cy, 28, 34, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = eye;
        g.beginPath();
        g.ellipse(cx + s * 3, cy + 5, 19, 24, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#120a06';
        g.beginPath();
        g.ellipse(cx + s * 3, cy + 7, 10, 13, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(cx + s * 3 + 8, cy - 5, 7.5, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(cx + s * 3 - 6, cy + 14, 3.6, 0, Math.PI * 2);
        g.fill();
      }
      if (!o.animal) {
        g.strokeStyle = hx;
        g.lineWidth = 9;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(cx - 20, cy - 48 + lift);
        g.quadraticCurveTo(cx, cy - 60 + lift, cx + 20, cy - 50 + lift);
        g.stroke();
      }
      g.fillStyle = 'rgba(255,120,130,.45)';
      g.beginPath();
      g.ellipse(cx + s * 20, cy + 50, 19, 11, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (o.glasses) {
      g.strokeStyle = '#1f2a44';
      g.lineWidth = 8;
      for (const dx of [-52, 52]) {
        g.beginPath();
        g.arc(128 + dx, 128, 40, 0, Math.PI * 2);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(116, 124);
      g.lineTo(140, 124);
      g.stroke();
    }
    g.fillStyle = '#7a2a2a';
    if (mode === 'wow') {
      g.beginPath();
      g.ellipse(128, 198, 14, 17, 0, 0, Math.PI * 2);
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(98, 186);
      g.quadraticCurveTo(128, 222, 158, 186);
      g.quadraticCurveTo(128, 200, 98, 186);
      g.fill();
      g.fillStyle = '#e86a7a';
      g.beginPath();
      g.ellipse(128, 202, 11, 6, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
  faces.set(k, t);
  return t;
}

function faceMesh(o: Look, w: number, h: number) {
  const fm = new THREE.MeshStandardMaterial({ map: faceTex(o, 'open'), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
  return { fm, face: new THREE.Mesh(new THREE.PlaneGeometry(w, h), fm) };
}

const WINE = 0x6e2638;
/** Cores das quatro classes (THEME_AVENTUREIROS.md §3), da base do lenço para baixo: Abelhinhas, Luminares, Edificadores, Mãos Ajudadoras. */
const CLASS_STRIPES = [0x7cc3e8, 0xf08a24, 0x1f3a7a, 0x9c3350];

const woggles = new Map<string, THREE.CylinderGeometry>();
function woggleGeo(r: number, h: number) {
  const k = r + '_' + h;
  let g = woggles.get(k);
  if (!g) woggles.set(k, (g = new THREE.CylinderGeometry(r, r, h, 12)));
  return g;
}

/** Triângulo de tecido com a base em cima (na nuca) e a ponta para baixo; face visível voltada para -z (costas). */
function backTriangle(w: number, h: number, color: number) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0);
  sh.lineTo(w / 2, 0);
  sh.lineTo(0, -h);
  sh.closePath();
  const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }), mat(color));
  m.castShadow = true;
  return m;
}

/**
 * Lenço do Aventureiro como é usado (docs/LENCO.md): triângulo enrolado a partir da base até virar duas pontas.
 * Nas costas aparece o triângulo com o emblema; em volta do pescoço, o rolo; na frente, as duas pontas
 * unidas por um prendedor cilíndrico branco com emblema pequeno. Líder (LA1): listras das quatro classes junto à base.
 */
function scarf(torso: THREE.Group, k: 'a1' | 'la1') {
  // rolo em volta do pescoço
  part(torso, 1.02, 0.15, 0.62, WINE, 0, 0.8, 0, 0.07);
  // triângulo nas costas, com o emblema entre as duas arestas, perto da ponta
  const back = backTriangle(0.92, 0.62, WINE);
  back.position.set(0, 0.78, -0.33);
  torso.add(back);
  if (k === 'la1') {
    CLASS_STRIPES.forEach((c, i) => {
      const y = 0.72 - i * 0.045,
        w = 0.92 * ((y - 0.16) / 0.62) - 0.06;
      part(torso, w, 0.03, 0.012, c, 0, y, -0.338, 0.005);
    });
  }
  const em = decal(k, k === 'la1' ? 0.22 : 0.24, 0, 0.44, -0.345, Math.PI, torso);
  em.material.alphaTest = 0.1;
  // frente: as duas pontas descem do pescoço e se juntam no prendedor
  for (const s of [-1, 1]) {
    part(torso, 0.1, 0.14, 0.05, WINE, s * 0.09, 0.74, 0.31, 0.03).rotation.z = s * 0.6;
    part(torso, 0.1, 0.34, 0.04, WINE, s * 0.05, 0.47, 0.31, 0.03).rotation.z = s * 0.12;
  }
  const w = new THREE.Mesh(woggleGeo(0.095, 0.15), mat(0xe9e3d6, 0.45));
  w.position.set(0, 0.66, 0.36);
  w.castShadow = true;
  torso.add(w);
  const mini = decal(k, 0.11, 0, 0.66, 0.457, 0, torso);
  mini.material.alphaTest = 0.1;
}

/** Aventureiro, Aventureira, Diretora Cecília ou visitante, a partir de parâmetros. */
export function makeKid(o: Look): Rig {
  const root = new THREE.Group(),
    body = piv(root, 0, 0, 0),
    sk = o.skin,
    sh = o.shirt ?? 0xfafafa,
    pt = o.pants ?? 0x1f3352,
    legs: THREE.Group[] = [],
    arms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const l = piv(body, s * 0.24, 1.02, 0);
    if (o.skirt) part(l, 0.34, 0.42, 0.36, sk, 0, -0.32, 0);
    else part(l, 0.38, 0.62, 0.4, pt, 0, -0.3, 0);
    part(l, 0.36, 0.26, 0.38, 0xffffff, 0, -0.7, 0); // meia branca
    part(l, 0.4, 0.22, 0.56, 0x1d1d26, 0, -0.88, 0.06, 0.08, 0.4); // sapato preto
    legs.push(l);
  }
  if (o.skirt) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.66, 0.52, 8), mat(pt));
    m.position.y = 1.0;
    m.rotation.y = Math.PI / 8;
    m.castShadow = true;
    body.add(m);
  } else part(body, 0.9, 0.32, 0.54, pt, 0, 1.1, 0, 0.08);

  const torso = piv(body, 0, 1.25, 0);
  part(torso, 0.98, 0.82, 0.58, sh, 0, 0.38, 0, 0.12);
  part(torso, 1.0, 0.14, 0.6, 0x1a1a22, 0, 0.03, 0, 0.05, 0.4); // cinto
  part(torso, 0.18, 0.12, 0.05, 0xd4d8de, 0, 0.03, 0.31, 0.02, 0.3); // fivela
  if (!o.bare) part(torso, 0.26, 0.11, 0.03, 0x172d49, -0.28, 0.52, 0.3, 0.02); // plaqueta de nome
  if (o.pack) part(torso, 0.76, 0.86, 0.32, 0x7a5434, 0, 0.4, -0.42, 0.1);
  for (const s of [-1, 1]) {
    const a = piv(torso, s * 0.62, 0.7, 0);
    part(a, 0.3, 0.36, 0.32, sh, 0, -0.16, 0, 0.08);
    part(a, 0.26, 0.34, 0.28, sk, 0, -0.48, 0, 0.08);
    part(a, 0.3, 0.24, 0.3, sk, 0, -0.72, 0, 0.1);
    arms.push(a);
  }

  const head = piv(torso, 0, 1.2, 0);
  part(head, 1.04, 0.98, 0.96, sk, 0, 0, 0, 0.2, 0.6);
  for (const s of [-1, 1]) part(head, 0.14, 0.26, 0.2, sk, s * 0.55, -0.02, 0, 0.06);
  const { fm, face } = faceMesh(o, 0.94, 0.9);
  face.position.set(0, -0.04, 0.485);
  head.add(face);

  const h = o.hair;
  part(head, 1.1, 0.34, 1.04, h, 0, 0.42, -0.01, 0.14);
  part(head, 1.1, 0.24, 0.16, h, 0, 0.28, 0.46, 0.07);
  if (o.style === 'long') {
    // até os ombros, para não cobrir o triângulo do lenço nas costas
    part(head, 1.1, 0.86, 0.32, h, 0, 0.02, -0.44, 0.12);
    for (const s of [-1, 1]) part(head, 0.16, 0.8, 0.62, h, s * 0.55, -0.04, -0.12, 0.06);
  } else if (o.style === 'curly') {
    const tufts: [number, number, number][] = [[-0.36, 0.6, 0], [0, 0.66, 0.05], [0.36, 0.6, 0], [-0.2, 0.58, -0.38], [0.2, 0.6, -0.38], [-0.48, 0.4, -0.2], [0.48, 0.4, -0.2]];
    for (const [x, y, z] of tufts) part(head, 0.4, 0.36, 0.4, h, x, y, z, 0.16);
    part(head, 1.06, 0.6, 0.3, h, 0, 0.1, -0.42, 0.12);
  } else if (o.style === 'afro') {
    part(head, 1.16, 0.46, 1.08, h, 0, 0.44, -0.03, 0.22);
    part(head, 1.14, 0.5, 0.3, h, 0, 0.12, -0.42, 0.12);
  } else if (o.style === 'pony') {
    part(head, 1.06, 0.6, 0.3, h, 0, 0.12, -0.42, 0.12);
    const pn = piv(head, 0, 0.4, -0.62);
    part(pn, 0.62, 0.56, 0.5, h, 0, 0.12, 0, 0.24);
    part(pn, 0.36, 0.62, 0.34, h, 0, -0.36, -0.06, 0.14);
    if (o.bow) part(pn, 0.56, 0.24, 0.14, 0x6e2638, 0, -0.04, 0.26, 0.06);
  } else part(head, 1.06, 0.5, 0.24, h, 0, 0.18, -0.44, 0.08);

  if (!o.bare) scarf(torso, o.la1 ? 'la1' : 'a1');
  if (o.scale) root.scale.setScalar(o.scale);
  return { root, body, torso, head, face, fm, legs, arms, o, ph: rnd() * 9, blink: rr(1, 4), mode: 'open' };
}

/** Tico: sagui de blocos (provisório), com tufos brancos, cauda listrada e lencinho vinho. */
export function makeTico(): Rig {
  const look: Look = { hair: 0x4a3a2e, skin: 0, eye: '#2a1a12', animal: true };
  const root = new THREE.Group(),
    body = piv(root, 0, 0, 0),
    fur = 0x8a6a4e,
    dark = 0x4a3a2e,
    light = 0xe9c99b,
    legs: THREE.Group[] = [],
    arms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const l = piv(body, s * 0.18, 0.42, 0);
    part(l, 0.2, 0.42, 0.22, fur, 0, -0.2, 0, 0.08);
    legs.push(l);
  }
  const torso = piv(body, 0, 0.45, 0);
  part(torso, 0.62, 0.62, 0.5, fur, 0, 0.3, 0, 0.2);
  part(torso, 0.42, 0.42, 0.08, light, 0, 0.26, 0.24, 0.1);
  for (const s of [-1, 1]) {
    const a = piv(torso, s * 0.38, 0.5, 0);
    part(a, 0.16, 0.42, 0.16, fur, 0, -0.2, 0, 0.06);
    arms.push(a);
  }
  const head = piv(torso, 0, 0.88, 0);
  part(head, 0.72, 0.64, 0.62, fur, 0, 0, 0, 0.24);
  part(head, 0.56, 0.44, 0.1, light, 0, -0.06, 0.3, 0.12);
  for (const s of [-1, 1]) part(head, 0.16, 0.36, 0.34, 0xffffff, s * 0.46, 0.12, -0.02, 0.08).rotation.z = s * -0.4;
  const { fm, face } = faceMesh(look, 0.56, 0.52);
  face.position.set(0, -0.02, 0.36);
  head.add(face);
  // lencinho: triângulo nas costas, pontas e prendedor na frente (sem emblema)
  part(torso, 0.66, 0.1, 0.54, WINE, 0, 0.6, 0, 0.05);
  const tt = backTriangle(0.5, 0.34, WINE);
  tt.position.set(0, 0.58, -0.25);
  torso.add(tt);
  const tw = new THREE.Mesh(woggleGeo(0.06, 0.1), mat(0xf4f1ea, 0.5));
  tw.position.set(0, 0.5, 0.27);
  torso.add(tw);
  for (const sd of [-1, 1]) part(torso, 0.06, 0.16, 0.04, WINE, sd * 0.03, 0.38, 0.26, 0.02).rotation.z = sd * 0.15;
  const tail: THREE.Group[] = [];
  let p = piv(torso, 0, 0.08, -0.26);
  for (let i = 0; i < 8; i++) {
    part(p, 0.14, 0.14, 0.3, i % 2 ? light : dark, 0, 0, -0.15, 0.06);
    tail.push(p);
    p = piv(p, 0, 0, -0.28);
  }
  root.scale.setScalar(0.82);
  return { root, body, torso, head, face, fm, legs, arms, tail, o: look, ph: 0, blink: 2, mode: 'open' };
}

/** Seis avatares jogáveis. `n` é só identificador interno: no jogo, a criança dá o apelido (docs/CHARACTERS.md). */
export const AV: Look[] = [
  { n: 'Aventureiro 1', skin: 0xf0c8a0, hair: 0x5a3a22, style: 'short' },
  { n: 'Aventureiro 2', skin: 0x8d5a3b, hair: 0x1b1b1b, style: 'afro' },
  { n: 'Aventureiro 3', skin: 0xf2cfb0, hair: 0xc4501b, style: 'curly', glasses: true, eye: '#3a6aa0' },
  { n: 'Aventureira 1', skin: 0xeab98f, hair: 0x4a2a1a, style: 'long', skirt: true },
  { n: 'Aventureira 2', skin: 0x8d5a3b, hair: 0x1b1b1b, style: 'pony', skirt: true, bow: true },
  { n: 'Aventureira 3', skin: 0xf2cfb0, hair: 0xe3b85a, style: 'long', skirt: true, eye: '#4a7a3a', brow: 0xb8862e },
];

/** Anima pernas, braços, respiração, piscadas e cauda. */
export function animate(c: Rig, dt: number, s: Pose) {
  const speed = s.speed ?? 0;
  c.ph += dt * (s.walk ? 9 + speed * 1.2 : 2);
  const w = s.walk ? Math.sin(c.ph) * Math.min(0.85, 0.25 + speed * 0.1) : 0;
  const [l0, l1] = c.legs,
    [a0, a1] = c.arms;
  l0.rotation.x = lerp(l0.rotation.x, s.air ? -0.5 : s.swim ? Math.sin(c.ph * 1.3) * 0.6 : w, 0.3);
  l1.rotation.x = lerp(l1.rotation.x, s.air ? 0.3 : s.swim ? -Math.sin(c.ph * 1.3) * 0.6 : -w, 0.3);
  const ar = s.air ? -2.6 : s.swim ? -1.6 + Math.sin(c.ph * 1.3) * 0.9 : -w * 0.9;
  a0.rotation.x = lerp(a0.rotation.x, s.wave ? 0 : ar, 0.25);
  a1.rotation.x = lerp(a1.rotation.x, s.swim ? -1.6 - Math.sin(c.ph * 1.3) * 0.9 : s.air ? -2.6 : w * 0.9, 0.25);
  a0.rotation.z = lerp(a0.rotation.z, s.wave ? -2.5 : s.air ? -0.3 : -0.06, 0.2);
  a1.rotation.z = lerp(a1.rotation.z, s.air ? 0.3 : 0.06, 0.2);
  c.body.position.y = s.walk && !s.air ? Math.abs(Math.sin(c.ph)) * 0.09 : Math.sin(c.ph) * 0.015;
  c.torso.scale.y = 1 + (s.walk ? 0 : Math.sin(c.ph) * 0.012);
  c.blink -= dt;
  let m: FaceMode = s.mode || 'open';
  if (c.blink < 0) {
    m = 'blink';
    if (c.blink < -0.12) c.blink = rr(2, 5);
  }
  if (m !== c.mode) {
    c.mode = m;
    c.fm.map = faceTex(c.o, m);
    c.fm.needsUpdate = true;
  }
  c.tail?.forEach((t, i) => {
    t.rotation.x = i ? 0.22 + Math.sin(c.ph * 1.5 - i * 0.6) * 0.08 : -0.9;
  });
}

/**
 * Diretora Cecília abaixada até a altura da criança, com a Bíblia erguida (abertura, Quadro 3).
 * Aplicar DEPOIS de animate(), com k de 0 (em pé) a 1 (abaixada). Os valores são escritos a partir
 * do quadro atual, sem acumular: assim a pose não depende da taxa de quadros e não treme
 * quando o tempo entre quadros varia (celulares, principalmente iPhone).
 * Ela afasta as pernas (uma à frente, outra atrás) e desce na mesma medida, sem afundar no chão.
 */
export const KNEEL = { split: 0.7, legLen: 0.99, lean: 0.22, book: -2.1, lamp: -0.5 };
export function kneelPose(c: Rig, k: number) {
  if (k <= 0) {
    c.torso.rotation.x = 0;
    return;
  }
  const a = KNEEL.split * k;
  c.legs[0].rotation.x = -a;
  c.legs[1].rotation.x = a;
  c.body.position.y -= KNEEL.legLen * (1 - Math.cos(a));
  c.torso.rotation.x = KNEEL.lean * k;
  c.arms[1].rotation.x = lerp(c.arms[1].rotation.x, KNEEL.book, k);
  c.arms[0].rotation.x = lerp(c.arms[0].rotation.x, KNEEL.lamp, k);
}
