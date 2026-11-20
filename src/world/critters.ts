import * as THREE from 'three';
import { mat, rg } from './builders/kid';
import { H, LAKE } from './terrain';
import { clamp, rnd, rr } from '../engine/math';

/* Vida no acampamento: peixes no lago, borboletas, coelhos que fogem e pássaros no céu. */

interface Fish {
  k: 'fish';
  o: THREE.Group;
  a: number;
  r: number;
  y: number;
  s: number;
}
interface Butterfly {
  k: 'bf';
  o: THREE.Group;
  cx: number;
  cz: number;
  a: number;
  s: number;
}
interface Rabbit {
  k: 'rab';
  o: THREE.Group;
  x: number;
  z: number;
  tx: number;
  tz: number;
  t: number;
  hop: number;
}
interface Bird {
  k: 'bird';
  o: THREE.Group;
  a: number;
  r: number;
  y: number;
}
type Critter = Fish | Butterfly | Rabbit | Bird;

function wings(g: THREE.Group, make: () => THREE.Mesh, offset: number) {
  for (const s of [-1, 1]) {
    const w = make();
    w.position.x = s * offset;
    const p = new THREE.Group();
    p.add(w);
    g.add(p);
  }
}

export function createCritters(scene: THREE.Scene) {
  const list: Critter[] = [];
  const fishMat = mat(0xff8a3c, 0.5);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Group();
    f.add(new THREE.Mesh(rg(0.5, 0.28, 0.16, 0.06), fishMat));
    const tail = new THREE.Mesh(rg(0.08, 0.24, 0.2, 0.03), mat(0xffb36b, 0.5));
    tail.position.x = -0.3;
    f.add(tail);
    scene.add(f);
    list.push({ k: 'fish', o: f, a: rnd() * 6, r: rr(2, 6), y: rr(-2.4, -1.4), s: rr(0.4, 0.8) });
  }
  const bfColors = [0xf7d14c, 0xf29ab0, 0x9ec9ff, 0xffffff];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const m = new THREE.MeshBasicMaterial({ color: bfColors[i % 4], side: THREE.DoubleSide });
    wings(g, () => new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.22), m), 0.13);
    scene.add(g);
    list.push({ k: 'bf', o: g, cx: rr(-30, 32), cz: rr(-30, 30), a: rnd() * 6, s: rr(0.5, 1) });
  }
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group(),
      w = 0xf4efe6;
    const b = new THREE.Mesh(rg(0.42, 0.36, 0.6, 0.14), mat(w));
    b.position.y = 0.24;
    b.castShadow = true;
    g.add(b);
    const h = new THREE.Mesh(rg(0.32, 0.3, 0.32, 0.12), mat(w));
    h.position.set(0, 0.5, 0.28);
    g.add(h);
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(rg(0.08, 0.34, 0.1, 0.04), mat(w));
      e.position.set(s * 0.08, 0.78, 0.24);
      g.add(e);
    }
    const eyes = new THREE.Mesh(rg(0.34, 0.06, 0.06, 0.02), mat(0x221111));
    eyes.position.set(0, 0.55, 0.44);
    g.add(eyes);
    const x = rr(18, 34),
      z = rr(0, 24);
    g.position.set(x, H(x, z), z);
    scene.add(g);
    list.push({ k: 'rab', o: g, x, z, tx: x, tz: z, t: rr(0, 3), hop: 0 });
  }
  const birdMat = mat(0x3a3a48);
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    wings(g, () => new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.22), birdMat), 0.35);
    scene.add(g);
    list.push({ k: 'bird', o: g, a: (i / 6) * Math.PI * 2, r: rr(16, 26), y: rr(16, 22) });
  }

  const flap = (o: THREE.Group, f: number) => {
    o.children[0].rotation.z = f;
    o.children[1].rotation.z = -f;
  };

  return function update(dt: number, t: number, px: number, pz: number) {
    for (const c of list) {
      if (c.k === 'fish') {
        c.a += dt * c.s;
        c.o.position.set(LAKE.x + Math.cos(c.a) * c.r, c.y + Math.sin(t * 2 + c.r) * 0.1, LAKE.z + Math.sin(c.a) * c.r * 0.85);
        c.o.rotation.y = Math.atan2(-Math.cos(c.a) * 0.85, -Math.sin(c.a));
        c.o.children[1].rotation.y = Math.sin(t * 10) * 0.4;
      } else if (c.k === 'bf') {
        c.a += dt * c.s;
        const x = c.cx + Math.sin(c.a * 1.3) * 3,
          z = c.cz + Math.cos(c.a) * 3;
        c.o.position.set(x, H(x, z) + 1 + Math.sin(t * 3 + c.cx) * 0.4, z);
        c.o.rotation.y = c.a;
        flap(c.o, Math.sin(t * 22 + c.cx));
      } else if (c.k === 'bird') {
        c.a += dt * 0.25;
        c.o.position.set(Math.cos(c.a) * c.r, c.y + Math.sin(t + c.r) * 0.5, Math.sin(c.a) * c.r - 4);
        c.o.rotation.y = -c.a;
        flap(c.o, Math.sin(t * 8 + c.r) * 0.5);
      } else {
        c.t -= dt;
        if (Math.hypot(px - c.x, pz - c.z) < 3.5 && c.t > 0.3) {
          const a = Math.atan2(c.x - px, c.z - pz); // foge do jogador
          c.tx = c.x + Math.sin(a) * 4;
          c.tz = c.z + Math.cos(a) * 4;
          c.t = 0;
        }
        if (c.t < 0) {
          c.tx = clamp(c.x + rr(-4, 4), 16, 36);
          c.tz = clamp(c.z + rr(-4, 4), -2, 26);
          c.t = rr(1.5, 4);
        }
        const dx = c.tx - c.x,
          dz = c.tz - c.z,
          d = Math.hypot(dx, dz);
        if (d > 0.2) {
          const s = Math.min(d, 4.5 * dt);
          c.x += (dx / d) * s;
          c.z += (dz / d) * s;
          c.hop += dt * 14;
          c.o.rotation.y = Math.atan2(dx, dz);
        } else c.hop = 0;
        c.o.position.set(c.x, H(c.x, c.z) + Math.abs(Math.sin(c.hop)) * 0.35, c.z);
      }
    }
  };
}
