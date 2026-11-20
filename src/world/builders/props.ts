import * as THREE from 'three';
import { Batch } from '../batch';
import { Colliders } from '../colliders';
import { H } from '../terrain';
import { lerp, rnd, rr } from '../../engine/math';

export const WOOD = 0x8a5a34,
  WOOD_DARK = 0x5e3d22,
  STONE = 0xa9a59a,
  LEAF = [0x4f8a45, 0x5f9a4c, 0x3f7a44, 0x6aa652];

/** Ferramentas para montar peças de blocos já com colisão. */
export interface Kit {
  B: Batch;
  GLOW: Batch;
  col: Colliders;
}

export type TreeKind = 'round' | 'pine' | 'fruit';

export function tree({ B, col }: Kit, x: number, z: number, s = 1, kind: TreeKind = 'round') {
  const y = H(x, z);
  if (kind === 'pine') {
    B.box(0.5 * s, 1.4 * s, 0.5 * s, WOOD_DARK, x, y + 0.7 * s, z);
    [2.6, 2.0, 1.4, 0.8].forEach((w, i) => B.box(w * s, 0.9 * s, w * s, 0x3d7448, x, y + (1.6 + i * 0.75) * s, z, { ry: (Math.PI / 4) * (i % 2), r: 0.08 }));
  } else {
    B.box(0.62 * s, 2 * s, 0.62 * s, WOOD, x, y + 1 * s, z, { r: 0.06 });
    const c = LEAF[Math.floor(rnd() * 4)];
    B.box(2.7 * s, 1.8 * s, 2.7 * s, c, x, y + 2.6 * s, z, { r: 0.25, ry: rnd() * 0.4 });
    B.box(1.9 * s, 1.3 * s, 1.9 * s, c, x + 0.15 * s, y + 3.8 * s, z - 0.1 * s, { r: 0.22, ry: rnd() });
    if (kind === 'fruit')
      for (let i = 0; i < 5; i++) B.box(0.28, 0.28, 0.28, 0xf08a2c, x + rr(-1.2, 1.2) * s, y + rr(2, 3.2) * s, z + 1.36 * s * (rnd() < 0.5 ? 1 : -1), { r: 0.06 });
  }
  col.circle(x, z, 0.55 * s, y + 3 * s);
}

export function rock({ B, col }: Kit, x: number, z: number, s = 1, stand = true) {
  const y = H(x, z);
  B.box(1.4 * s, 0.9 * s, 1.2 * s, STONE, x, y + 0.3 * s, z, { r: 0.25 * s, ry: rnd() * 3 });
  B.box(0.8 * s, 0.6 * s, 0.7 * s, 0xbab6ab, x + 0.3 * s, y + 0.7 * s, z + 0.1, { r: 0.18 * s, ry: rnd() * 3 });
  if (stand) col.solid(x, z, 1.2 * s, 1.0 * s, y + 0.75 * s);
}

export function bush({ B }: Kit, x: number, z: number, s = 1) {
  const y = H(x, z),
    c = LEAF[Math.floor(rnd() * 4)];
  B.box(1.3 * s, 0.9 * s, 1.1 * s, c, x, y + 0.4 * s, z, { r: 0.3 * s, ry: rnd() * 3 });
  B.box(0.9 * s, 0.7 * s, 0.9 * s, c, x + 0.4 * s, y + 0.55 * s, z + 0.2, { r: 0.25 * s, ry: rnd() * 3 });
  if (rnd() < 0.5) for (let i = 0; i < 3; i++) B.box(0.16, 0.16, 0.16, [0xffffff, 0xf7d14c, 0xf29ab0][i], x + rr(-0.5, 0.5) * s, y + 0.92 * s, z + rr(-0.4, 0.4) * s);
}

export function lamp({ B, GLOW, col }: Kit, x: number, z: number) {
  const y = H(x, z);
  B.box(0.22, 2.6, 0.22, WOOD_DARK, x, y + 1.3, z);
  B.box(0.5, 0.12, 0.5, 0x3a2a1c, x, y + 2.65, z);
  GLOW.box(0.36, 0.42, 0.36, 0xffd27a, x, y + 2.38, z);
  B.box(0.5, 0.1, 0.5, 0x3a2a1c, x, y + 2.12, z);
  col.circle(x, z, 0.25, y + 2.7);
}

export function fence({ B }: Kit, x: number, z: number, ry: number, len: number) {
  const n = Math.round(len / 2);
  for (let i = 0; i <= n; i++) {
    const t = i / n - 0.5,
      px = x + Math.cos(ry) * len * t,
      pz = z - Math.sin(ry) * len * t;
    B.box(0.26, 1.3, 0.26, WOOD, px, H(px, pz) + 0.55, pz, { r: 0.05 });
  }
  const y = (H(x + (Math.cos(ry) * len) / 2, z - (Math.sin(ry) * len) / 2) + H(x - (Math.cos(ry) * len) / 2, z + (Math.sin(ry) * len) / 2)) / 2;
  B.box(len, 0.16, 0.12, 0xa2724a, x, y + 0.95, z, { ry });
  B.box(len, 0.16, 0.12, 0xa2724a, x, y + 0.5, z, { ry });
}

/** Bandeirolas vinho e brancas entre dois pontos. */
export function bunting({ B }: Kit, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, n = 10) {
  const g = new THREE.ConeGeometry(0.22, 0.42, 3);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n,
      x = lerp(x1, x2, t),
      z = lerp(z1, z2, t),
      y = lerp(y1, y2, t) - Math.sin(t * Math.PI) * 0.5;
    B.add(g, i % 2 ? 0xffffff : 0x6e2638, x, y - 0.2, z, Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2, Math.PI, 0, [1, 1, 0.25], 0);
  }
}
