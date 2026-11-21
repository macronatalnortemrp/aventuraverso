import { clamp } from '../engine/math';
import { H, EDGE } from './terrain';

/** Caixa no chão: bloqueia por baixo do topo; dá para ficar em pé em cima. */
export interface Box {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  top: number;
  /** base de uma plataforma flutuante: quem está embaixo passa livre */
  bottom?: number;
}

/** Tronco de árvore, poste: bloqueio redondo. */
export interface Circle {
  x: number;
  z: number;
  r: number;
  top: number;
}

export interface Body {
  x: number;
  y: number;
  z: number;
}

/** degrau que o personagem sobe sem pular */
export const STEP_UP = 0.42;
export const BODY_RADIUS = 0.42;
/** altura do corpo (para passar por baixo de plataformas flutuantes) */
export const BODY_HEIGHT = 2.4;

export class Colliders {
  boxes: Box[] = [];
  circles: Circle[] = [];

  solid(x: number, z: number, w: number, d: number, top: number) {
    this.boxes.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, top });
  }

  /** Tira caixas (plataformas que somem). */
  removeBoxes(list: Box[]) {
    this.boxes = this.boxes.filter((b) => !list.includes(b));
  }

  circle(x: number, z: number, r: number, top: number) {
    this.circles.push({ x, z, r, top });
  }

  /** Altura do chão em (x, z) para quem está na altura y: terreno ou topo de caixa alcançável. */
  groundAt(x: number, z: number, y: number) {
    let g = H(x, z);
    for (const c of this.boxes) {
      if (x > c.x0 - 0.15 && x < c.x1 + 0.15 && z > c.z0 - 0.15 && z < c.z1 + 0.15 && c.top <= y + STEP_UP && c.top > g) g = c.top;
    }
    return g;
  }

  /** Empurra o corpo para fora de caixas e círculos mais altos que ele, e mantém dentro do acampamento. */
  pushOut(p: Body, r = BODY_RADIUS) {
    for (const c of this.boxes) {
      if (p.y >= c.top - 0.05) continue;
      if (c.bottom !== undefined && p.y + BODY_HEIGHT < c.bottom) continue;
      const nx = clamp(p.x, c.x0, c.x1),
        nz = clamp(p.z, c.z0, c.z1),
        dx = p.x - nx,
        dz = p.z - nz,
        d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d > 1e-4) {
        p.x = nx + (dx / d) * r;
        p.z = nz + (dz / d) * r;
      } else {
        const px = Math.min(p.x - c.x0, c.x1 - p.x),
          pz = Math.min(p.z - c.z0, c.z1 - p.z);
        if (px < pz) p.x = p.x - c.x0 < c.x1 - p.x ? c.x0 - r : c.x1 + r;
        else p.z = p.z - c.z0 < c.z1 - p.z ? c.z0 - r : c.z1 + r;
      }
    }
    for (const c of this.circles) {
      if (p.y >= c.top) continue;
      const dx = p.x - c.x,
        dz = p.z - c.z,
        d = Math.hypot(dx, dz),
        m = c.r + r;
      if (d < m && d > 0) {
        p.x = c.x + (dx / d) * m;
        p.z = c.z + (dz / d) * m;
      }
    }
    const rr = Math.hypot(p.x, p.z),
      lim = EDGE - 1.2;
    if (rr > lim) {
      p.x *= lim / rr;
      p.z *= lim / rr;
    }
  }

  /** Câmera não entra em caixas altas (tendas, plataformas). */
  minCameraY(x: number, z: number, y: number) {
    let m = y;
    const ground = H(x, z);
    for (const c of this.boxes) {
      if (c.bottom !== undefined && m < c.bottom - 0.3) continue; // por baixo de plataforma flutuante
      if (x > c.x0 - 0.4 && x < c.x1 + 0.4 && z > c.z0 - 0.4 && z < c.z1 + 0.4 && m < c.top + 0.6 && c.top - ground < 7) m = c.top + 0.6;
    }
    return m;
  }
}
