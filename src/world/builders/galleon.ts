import * as THREE from 'three';
import { Batch } from '../batch';

/*
 * Galeão de blocos da Capitã Marina: casco de madeira com faixa dourada, castelo de popa com janelas acesas,
 * três mastros com velas brancas estufadas, gurupés, cesto da gávea e bandeirolas.
 * O casco é comprido em x (proa em +x) e a linha d'água fica em y = 0.
 */

const HULL = 0x7a4a2a,
  HULL_L = 0xa8703f,
  DARK = 0x4a2e1a,
  GOLD = 0xe0b040,
  RED = 0xb83a2a,
  SAIL = 0xf7f2e6,
  DECK = 0xc9965a,
  NAVY = 0x24456e;

/** altura do convés (em cima dele ficam a criança e o Pedrito) */
export const GALLEON_DECK = 0.96;
/** onde a criança fica (no leme, antes do castelo de popa) e o Pedrito (na proa), em x local */
export const GALLEON_SEATS = { helm: -1.15, bow: 2.5, bowY: 1.27 };

/** vela estufada para a frente (+x): caixa fina com a barriga curvada */
function sailGeo(w: number, h: number, belly: number) {
  const g = new THREE.BoxGeometry(0.07, h, w, 1, 4, 8).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i) / (w / 2),
      y = p.getY(i) / (h / 2);
    p.setX(i, p.getX(i) + belly * (1 - z * z) * (0.75 + 0.25 * (1 - y * y)));
  }
  g.computeVertexNormals();
  return g;
}

/** vela triangular (bujarrona) entre o gurupés e o mastro da proa, com as duas faces */
function jibGeo(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  const g = new THREE.BufferGeometry();
  const v = [a, b, c, a, c, b].flatMap((q) => [q.x, q.y, q.z]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(12).fill(0), 2));
  g.computeVertexNormals();
  return g;
}

export function makeGalleon() {
  const root = new THREE.Group();
  const B = new Batch(),
    G = new Batch();
  const box = (w: number, h: number, d: number, c: number, x: number, y: number, z: number, o: { r?: number; rx?: number; ry?: number; rz?: number } = {}) => B.box(w, h, d, c, x, y, z, { j: 0.04, ...o });

  // casco: quilha vermelha, bojo, faixa dourada e a parte de cima
  box(5, 0.5, 1.3, RED, 0, -0.45, 0, { r: 0.12 });
  box(6, 0.56, 2.1, HULL, 0, 0, 0, { r: 0.12 });
  box(6.1, 0.12, 2.18, GOLD, 0, 0.3, 0);
  box(6.4, 0.6, 2.42, HULL, -0.1, 0.62, 0, { r: 0.08 });
  // proa afinando
  box(0.9, 0.56, 1.5, HULL, 3.35, 0.02, 0, { r: 0.12 });
  box(0.9, 0.62, 1.9, HULL, 3.45, 0.62, 0, { r: 0.1 });
  box(0.6, 0.6, 1.1, HULL, 4.05, 0.7, 0, { r: 0.1 });
  box(0.45, 0.5, 0.55, HULL_L, 4.45, 0.82, 0, { r: 0.08 });
  box(0.95, 0.12, 1.95, GOLD, 3.45, 0.32, 0);
  // convés, amurada e borda dourada
  box(6.1, 0.08, 2.2, DECK, -0.1, 0.92, 0);
  for (const s of [-1, 1]) {
    box(6.3, 0.42, 0.14, HULL_L, -0.1, 1.15, s * 1.17);
    box(6.4, 0.08, 0.22, GOLD, -0.1, 1.38, s * 1.17);
    // vigias douradas no costado
    for (let x = -1.6; x <= 2.2; x += 0.95) {
      box(0.3, 0.3, 0.05, GOLD, x, 0.58, s * 1.22);
      box(0.2, 0.2, 0.06, DARK, x, 0.58, s * 1.23);
    }
    // faixa azul do Clube embaixo da borda
    box(6.2, 0.1, 0.05, NAVY, -0.1, 0.84, s * 1.22);
  }
  box(0.14, 0.42, 2.2, HULL_L, 3.9, 1.15, 0);
  // castelo da proa
  box(1.5, 0.3, 2.3, HULL_L, 2.65, 1.12, 0);
  // gurupés inclinado
  box(2.6, 0.15, 0.15, DARK, 5.05, 1.45, 0, { rz: 0.32 });
  // castelo de popa com janelas acesas
  box(1.9, 1.1, 2.5, HULL, -2.45, 1.5, 0, { r: 0.06 });
  box(2, 0.08, 2.55, DECK, -2.45, 2.08, 0);
  box(2.05, 0.1, 2.6, GOLD, -2.45, 1.98, 0);
  box(0.22, 1.6, 2.5, DARK, -3.45, 1.35, 0, { r: 0.05 });
  for (const z of [-0.75, 0, 0.75]) G.box(0.06, 0.34, 0.36, 0xffd27a, -3.58, 1.45, z);
  for (const s of [-1, 1]) {
    for (let x = -3.3; x <= -1.6; x += 0.42) box(0.08, 0.4, 0.08, DARK, x, 2.3, s * 1.2);
    box(1.9, 0.07, 0.1, GOLD, -2.45, 2.5, s * 1.2);
    for (const x of [-2.9, -2.0]) G.box(0.22, 0.24, 0.05, 0xffd27a, x, 1.5, s * 1.27);
  }
  // escadinha do castelo e leme
  for (let i = 0; i < 3; i++) box(0.3, 0.1, 0.9, HULL_L, -1.38 + i * 0.0 - i * 0.12, 1.12 + i * 0.32, 0.55);
  box(0.12, 0.7, 0.12, DARK, -1.62, 1.32, 0);
  const wheel = new THREE.TorusGeometry(0.34, 0.05, 6, 14).rotateY(Math.PI / 2).toNonIndexed();
  B.add(wheel, DARK, -1.55, 1.75, 0, 0, 0, 0, 1, 0);
  for (let i = 0; i < 4; i++) box(0.04, 0.78, 0.04, DARK, -1.55, 1.75, 0, { rx: (i * Math.PI) / 4 });
  // lanterna da popa
  box(0.1, 0.7, 0.1, DARK, -3.45, 2.45, 0);
  G.box(0.32, 0.34, 0.32, 0xffd27a, -3.45, 2.95, 0);
  // barris e boia salva-vidas
  for (const [x, z] of [[1.2, 0.72], [1.55, 0.35]]) B.add(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 10).toNonIndexed(), HULL_L, x, 1.21, z, 0, 0, 0, 1, 0.05);
  const ring = new THREE.TorusGeometry(0.28, 0.08, 6, 14).toNonIndexed();
  B.add(ring, 0xfafafa, -2.4, 1.45, 1.3, 0, 0, 0, 1, 0);
  for (let i = 0; i < 4; i++) box(0.12, 0.13, 0.08, 0xe0482f, -2.4 + Math.cos((i * Math.PI) / 2) * 0.28, 1.45 + Math.sin((i * Math.PI) / 2) * 0.28, 1.31);

  // mastros: [x, base, altura]; velas: [w, h, y do centro]
  const masts: { x: number; base: number; h: number; sails: [number, number, number][] }[] = [
    { x: 2.1, base: 0.96, h: 4.6, sails: [[2.7, 1.8, 2.45], [2.1, 1.3, 4.15]] },
    { x: 0.1, base: 0.96, h: 6, sails: [[3.1, 2.1, 2.65], [2.5, 1.6, 4.65]] },
    { x: -2.35, base: 2.08, h: 3.5, sails: [[2.1, 1.6, 3.55]] },
  ];
  for (const m of masts) {
    box(0.22, m.h, 0.22, DARK, m.x, m.base + m.h / 2, 0);
    for (const [w, h, y] of m.sails) {
      B.add(sailGeo(w, h, 0.38), SAIL, m.x + 0.12, y, 0, 0, 0, 0, 1, 0.02);
      box(0.12, 0.12, w + 0.3, DARK, m.x + 0.1, y + h / 2 + 0.06, 0);
      box(0.1, 0.1, w * 0.9, DARK, m.x + 0.14, y - h / 2 - 0.04, 0);
    }
    // cordas (enxárcias) do alto do mastro até a borda
    const top = m.base + m.h - 0.5;
    for (const s of [-1, 1])
      for (const dx of [-0.35, 0.35]) {
        const y0 = m.base === 0.96 ? 1.4 : 2.5,
          z0 = s * 1.17,
          dy = top - y0,
          L = Math.hypot(dy, z0);
        box(0.035, L, 0.035, 0x3a2a1c, m.x + dx, (top + y0) / 2, z0 / 2, { rx: Math.atan2(z0, dy) });
      }
  }
  // cesto da gávea no mastro grande
  box(0.85, 0.32, 0.85, HULL_L, 0.1, 5.75, 0, { r: 0.05 });
  // bujarrona
  B.add(jibGeo(new THREE.Vector3(6.1, 1.85, 0), new THREE.Vector3(2.25, 5.3, 0), new THREE.Vector3(2.35, 1.6, 0)), SAIL, 0, 0, 0, 0, 0, 0, 1, 0);

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, side: THREE.DoubleSide });
  B.mesh(root, mat, true);
  G.mesh(root, new THREE.MeshBasicMaterial({ vertexColors: true }), false);

  // bandeirolas no alto dos mastros (balançam ao vento)
  const flags: THREE.Mesh[] = [];
  const flagGeo = new THREE.PlaneGeometry(0.9, 0.42, 4, 1).translate(-0.45, 0, 0);
  [
    [2.1, 0.96 + 4.6, 0xd23b3b],
    [0.1, 0.96 + 6, 0xf2c230],
    [-2.35, 2.08 + 3.5, NAVY],
  ].forEach(([x, y, c]) => {
    const f = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.7 }));
    f.position.set(x, y + 0.1, 0);
    root.add(f);
    flags.push(f);
  });
  const update = (t: number, speed: number) => {
    flags.forEach((f, i) => {
      f.rotation.y = Math.sin(t * (3 + speed * 0.3) + i) * 0.35;
      f.scale.x = 0.9 + Math.sin(t * 5 + i * 2) * 0.1;
    });
  };
  return { root, update };
}
