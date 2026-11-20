import * as THREE from 'three';
import { radialTex } from './textures';
import { rnd, rr } from '../engine/math';

export const sparkTex = radialTex([
  [0, 'rgba(255,255,255,1)'],
  [0.25, 'rgba(255,245,200,.9)'],
  [1, 'rgba(255,220,120,0)'],
]);
export const dustTex = radialTex([
  [0, 'rgba(255,255,255,.95)'],
  [1, 'rgba(255,255,255,0)'],
]);

export interface PuffOpts {
  n?: number;
  tex?: THREE.Texture;
  color?: number;
  op?: number;
  /** soma de luz (brilhos) */
  add?: boolean;
  /** velocidade horizontal */
  sp?: number;
  /** velocidade para cima */
  up?: number;
  /** gravidade */
  g?: number;
  s?: number;
  life?: number;
  grow?: number;
}

interface Particle {
  m: THREE.Sprite;
  vx: number;
  vy: number;
  vz: number;
  t: number;
  life: number;
  g: number;
  grow: number;
  s: number;
}

export interface Sparkles {
  pts: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  seeds: [number, number, number, number][];
  rad: number;
  /** intensidade (1 normal, 3 chamando atenção) */
  boost: number;
}

/** Poeira, brilhos, respingos, ondas de choque e faíscas em volta de portais. */
export class Fx {
  private parts: Particle[] = [];
  private rings: { m: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; t: number }[] = [];
  private sparks: Sparkles[] = [];

  constructor(private scene: THREE.Scene) {}

  puff(x: number, y: number, z: number, o: PuffOpts = {}) {
    for (let i = 0; i < (o.n || 6); i++) {
      const m = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: o.tex || dustTex,
          color: o.color ?? 0xf3e6cc,
          transparent: true,
          depthWrite: false,
          opacity: o.op ?? 0.8,
          blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
        }),
      );
      const a = rnd() * Math.PI * 2,
        sp = rr(0.6, 1) * (o.sp || 2.4),
        s = o.s || 0.5;
      m.position.set(x, y, z);
      m.scale.setScalar(s);
      this.scene.add(m);
      this.parts.push({ m, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: rr(0.4, 1) * (o.up ?? 1.5), t: 0, life: o.life || 0.6, g: o.g ?? 0, grow: o.grow ?? 1.6, s });
    }
  }

  shock(x: number, y: number, z: number, c = 0xffffff) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.85, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false }));
    m.position.set(x, y + 0.06, z);
    this.scene.add(m);
    this.rings.push({ m, t: 0 });
  }

  sparkles(x: number, y: number, z: number, color: number, n: number, rad: number): Sparkles {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const seeds: Sparkles['seeds'] = [];
    for (let i = 0; i < n; i++) seeds.push([rnd() * Math.PI * 2, rr(0.3, 1) * rad, rnd(), rr(0.4, 1)]);
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: sparkTex, color, size: 0.35, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.position.set(x, y, z);
    pts.frustumCulled = false;
    this.scene.add(pts);
    const o = { pts, seeds, rad, boost: 1 };
    this.sparks.push(o);
    return o;
  }

  update(dt: number, t: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      p.vy -= p.g * dt;
      p.m.position.x += p.vx * dt;
      p.m.position.y += p.vy * dt;
      p.m.position.z += p.vz * dt;
      p.vx *= 0.96;
      p.vz *= 0.96;
      const k = p.t / p.life;
      p.m.scale.setScalar(p.s * (1 + k * p.grow));
      p.m.material.opacity = (1 - k) * 0.85;
      if (k >= 1) {
        this.scene.remove(p.m);
        p.m.material.dispose();
        this.parts.splice(i, 1);
      }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      r.m.scale.setScalar(1 + r.t * 9);
      r.m.material.opacity = Math.max(0, 1 - r.t * 2.2);
      if (r.t > 0.45) {
        this.scene.remove(r.m);
        r.m.geometry.dispose();
        r.m.material.dispose();
        this.rings.splice(i, 1);
      }
    }
    for (const o of this.sparks) {
      const p = o.pts.geometry.attributes.position as THREE.BufferAttribute;
      o.seeds.forEach((s, i) => {
        const k = (s[2] + t * 0.18 * s[3] * o.boost) % 1,
          a = s[0] + t * 0.5 * s[3];
        p.setXYZ(i, Math.cos(a) * s[1], (k - 0.5) * o.rad * 2.2, Math.sin(a) * s[1] * 0.4);
      });
      p.needsUpdate = true;
      o.pts.material.size = 0.3 + 0.15 * Math.min(o.boost, 3);
    }
  }
}
