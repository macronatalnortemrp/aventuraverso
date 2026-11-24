import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FALLS, H, HILL, LAKE, PALM_ISLE, REEF, WY } from './terrain';
import { LIGHTHOUSE, LIGHT_STEPS, LIGHT_STEP_R } from './lakeLayout';
import { CLIFF_STEPS } from './bigLake';
import { OBSERVATORY, OBS_STEPS, Stump } from './camp';
import { Colliders } from './colliders';
import { rnd } from '../engine/math';

export interface Coin {
  x: number;
  y: number;
  z: number;
  /** id fixo (salvo no progresso); negativo para moedas que saem dos tocos */
  id: number;
  got: boolean;
  fly: boolean;
  vx: number;
  vy: number;
  vz: number;
}

/** Onde ficam as moedas: trilhas, fundo do lago, cais, colina, observatório e mata. */
export function coinSpots(): [number, number, number][] {
  const L: [number, number, number][] = [];
  const g = (x: number, z: number, dy = 1) => L.push([x, H(x, z) + dy, z]);
  [33, 30, 18, 15, 12.4].forEach((z) => g(0, z));
  for (let i = 0; i < 4; i++) g(-6 - i * 2.6, 3.6 + i * 0.6);
  for (let i = 0; i < 4; i++) g(7 + i * 2.6, 3.6 + i * 0.8);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    L.push([LAKE.x + Math.cos(a) * 2.6, -2.1, LAKE.z + Math.sin(a) * 2.4]);
  }
  L.push([LAKE.x, -2.4, LAKE.z]);
  L.push([-22.3, WY + 1.6, LAKE.z + 1]);
  for (let i = 0; i < 4; i++) g(0, -8 - i * 3.2);
  g(-3.5, HILL.z + 4, 1.2);
  g(3.5, HILL.z + 4, 1.2);
  const { x, z } = OBSERVATORY,
    y = H(x, z);
  for (const [dx, dz, k] of OBS_STEPS) L.push([x + dx, y + k + 1.1, z + dz]);
  L.push([x, y + 6.4, z]);
  L.push([x - 1.2, y + 6.4, z - 1.2]);
  L.push([0, H(0, 1) + 3.6, 1]);
  L.push([-9, H(-9, 8) + 2.4, 8]);
  for (const [cx, cz] of [[28, 8], [22, 20], [33, -2], [-14, -14], [-20, -24], [16, 28]]) g(cx, cz);
  // Lago Grande (depois das antigas: os ids salvos continuam valendo)
  for (const t of [0.25, 0.5, 0.75]) g(-12 - 18 * t, -1 - 10 * t);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g(PALM_ISLE.x + 0.6 + Math.cos(a) * 1.9, PALM_ISLE.z - 0.4 + Math.sin(a) * 1.7);
  }
  const lx = LIGHTHOUSE.x,
    lz = LIGHTHOUSE.z,
    ly = H(lx, lz);
  for (const i of [2, 4, 6, 8]) {
    const [a, k] = LIGHT_STEPS[i];
    L.push([lx + Math.cos(a) * LIGHT_STEP_R, ly + k + 1.1, lz + Math.sin(a) * LIGHT_STEP_R]);
  }
  L.push([lx + 1.5, ly + LIGHTHOUSE.h + 1.4, lz + 1.5]);
  L.push([lx - 1.5, ly + LIGHTHOUSE.h + 1.4, lz - 1.5]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4,
      x = REEF.x + Math.cos(a) * 4.2,
      z = REEF.z + Math.sin(a) * 3.6;
    L.push([x, H(x, z) + 0.6, z]);
  }
  for (const i of [3, 6]) L.push([CLIFF_STEPS[i][0], CLIFF_STEPS[i][2] + 1.1, CLIFF_STEPS[i][1]]);
  g(FALLS.x - 4.5, FALLS.z + 5, 1.1);
  g(FALLS.x - 4.5, FALLS.z - 1, 1.1);
  return L;
}

export const COINS_PER_STUMP = 3;

/** Moeda com borda em relevo dos dois lados. */
export const coinGeometry = () =>
  mergeGeometries([
    new THREE.CylinderGeometry(0.48, 0.48, 0.14, 24).rotateX(Math.PI / 2).toNonIndexed(),
    new THREE.TorusGeometry(0.34, 0.05, 6, 24).translate(0, 0, 0.07).toNonIndexed(),
    new THREE.TorusGeometry(0.34, 0.05, 6, 24).translate(0, 0, -0.07).toNonIndexed(),
  ]);
export const coinMaterial = () => new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.75, roughness: 0.28, emissive: 0x7a4a00, emissiveIntensity: 0.35 });

/** Todas as moedas em uma única malha instanciada. */
export class Coins {
  list: Coin[];
  readonly total: number;
  readonly im: THREE.InstancedMesh;
  private o = new THREE.Object3D();
  private nextExtra = -1;

  constructor(scene: THREE.Scene, stumps: number, saved: readonly number[]) {
    this.list = coinSpots().map(([x, y, z], id) => ({ x, y, z, id, got: saved.includes(id), fly: false, vx: 0, vy: 0, vz: 0 }));
    this.total = this.list.length + stumps * COINS_PER_STUMP;
    this.im = new THREE.InstancedMesh(coinGeometry(), coinMaterial(), this.total);
    this.im.castShadow = true;
    this.im.frustumCulled = false;
    scene.add(this.im);
  }

  get collected() {
    return this.list.filter((c) => c.got).length;
  }

  /** Marretada no toco: três moedas pulam para fora. */
  popFrom(s: Stump) {
    s.used = true;
    s.ring.visible = false;
    for (let i = 0; i < COINS_PER_STUMP; i++) {
      const a = (i / COINS_PER_STUMP) * Math.PI * 2 + rnd();
      this.list.push({ x: s.x, y: s.y + 0.6, z: s.z, id: this.nextExtra--, got: false, fly: true, vx: Math.cos(a) * 2.4, vz: Math.sin(a) * 2.4, vy: 7 });
    }
  }

  /** Física das moedas que pulam e coleta perto do corpo do jogador. */
  step(dt: number, col: Colliders, px: number, py: number, pz: number, onCollect: (c: Coin) => void) {
    for (const c of this.list) {
      if (c.got) continue;
      if (c.fly) {
        c.vy -= 20 * dt;
        c.x += c.vx * dt;
        c.z += c.vz * dt;
        c.y += c.vy * dt;
        const floor = col.groundAt(c.x, c.z, c.y) + 0.8;
        if (c.y < floor) {
          c.y = floor;
          c.vy = Math.abs(c.vy) > 2 ? -c.vy * 0.4 : 0;
          c.vx *= 0.6;
          c.vz *= 0.6;
          if (Math.abs(c.vy) < 0.1) c.fly = false;
        }
      }
      if (Math.hypot(px - c.x, py + 1.2 - c.y, pz - c.z) < 1.45 && !(c.fly && c.vy > 0)) {
        c.got = true;
        onCollect(c);
      }
    }
  }

  draw(t: number) {
    this.list.forEach((c, i) => {
      this.o.position.set(c.x, c.y + (c.fly ? 0 : Math.sin(t * 2 + i) * 0.12), c.z);
      this.o.rotation.set(0, t * 2.4 + i, 0);
      this.o.scale.setScalar(c.got ? 0 : 1);
      this.o.updateMatrix();
      this.im.setMatrixAt(i, this.o.matrix);
    });
    this.im.count = this.list.length;
    this.im.instanceMatrix.needsUpdate = true;
  }
}
