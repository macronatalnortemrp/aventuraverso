import * as THREE from 'three';
import { Gfx, FOG, FOG_COLOR, HORIZON, SKY_TOP } from '../engine/gfx';
import { Camp } from './camp';
import { lerp } from '../engine/math';
import { rnd, setSeed } from '../engine/math';

const DAY = { top: new THREE.Color(0x3f8fdc), hor: new THREE.Color(0xcfe9f5), fog: new THREE.Color(0xc4e2f0), hemi: 1.15, sun: 2.7, env: 0.35, near: 70, far: 210 };
const NIGHT = { top: new THREE.Color(0x040916), hor: new THREE.Color(0x101c36), fog: new THREE.Color(0x080f20), hemi: 0.05, sun: 0.0, env: 0.02, near: 6, far: 38 };

const DUSK = { hor: new THREE.Color(0xffb46a), top: new THREE.Color(0x5a74c8), fog: new THREE.Color(0xf2c49a), sun: new THREE.Color(0xffb070) };

/** Liga o dia e o escuro total, com estrelas e a lanterna que acompanha o personagem. */
export class Daylight {
  /** 0 = dia, 1 = escuro total */
  night = 0;
  private target = 0;
  private speed = 1;
  private stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private spot: THREE.SpotLight;
  private aura: THREE.PointLight;
  /** a lanterna aprimorada (recompensa do Dia 1) abre mais o facho */
  wideLantern = false;
  /** luz extra em volta do personagem (abertura: rostos visíveis à noite) */
  auraBoost = 1;
  /** pôr do sol (0 = luz normal, 1 = dourado), usado na abertura */
  private warm = 0;
  private sunBase = new THREE.Color();

  constructor(private gfx: Gfx, private camp: Camp) {
    setSeed(303);
    const n = 500,
      p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2,
        y = 0.12 + rnd() * 0.88,
        r = Math.sqrt(1 - y * y) * 420;
      p.set([Math.cos(a) * r, y * 420, Math.sin(a) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    gfx.scene.add(this.stars);

    // luzes criadas desde o início (intensidade 0) para não recompilar shaders no meio do jogo
    this.spot = new THREE.SpotLight(0xfff0c8, 0, 24, 0.5, 0.55, 1);
    this.aura = new THREE.PointLight(0xffe8c0, 0, 6, 1.5);
    this.spot.visible = this.aura.visible = false;
    gfx.scene.add(this.spot, this.spot.target, this.aura);
    this.sunBase.copy(gfx.sun.color);
  }

  /** Pôr do sol dourado (abertura). */
  setWarm(w: number) {
    this.warm = w;
    this.apply(this.night);
  }

  /** Vai até o nível n em s segundos (0 = na hora). */
  set(n: number, seconds = 0) {
    this.target = n;
    this.speed = seconds > 0 ? 1 / seconds : Infinity;
    if (seconds <= 0) this.apply(n);
  }

  get settled() {
    return this.night === this.target;
  }

  private apply(n: number) {
    this.night = n;
    const { gfx } = this;
    SKY_TOP.copy(DAY.top).lerp(NIGHT.top, n);
    HORIZON.copy(DAY.hor).lerp(NIGHT.hor, n);
    FOG_COLOR.copy(DAY.fog).lerp(NIGHT.fog, n);
    const w = this.warm * (1 - n);
    if (w > 0) {
      SKY_TOP.lerp(DUSK.top, w * 0.6);
      HORIZON.lerp(DUSK.hor, w);
      FOG_COLOR.lerp(DUSK.fog, w * 0.8);
    }
    gfx.sun.color.copy(this.sunBase).lerp(DUSK.sun, w);
    FOG.near = lerp(DAY.near, NIGHT.near, n);
    FOG.far = lerp(DAY.far, NIGHT.far, n);
    gfx.hemi.intensity = lerp(DAY.hemi, NIGHT.hemi, n);
    gfx.sun.intensity = lerp(DAY.sun, NIGHT.sun, n);
    gfx.sun.castShadow = n < 0.95;
    gfx.scene.environmentIntensity = lerp(DAY.env, NIGHT.env, n);
    this.stars.material.opacity = Math.max(0, n * 1.2 - 0.2);
    this.camp.setNight(n);
  }

  update(dt: number, x: number, y: number, z: number, face: number) {
    if (this.night !== this.target) {
      const step = Math.min(Math.abs(this.target - this.night), dt * this.speed);
      this.apply(this.night + Math.sign(this.target - this.night) * step);
    }
    const n = this.night;
    this.spot.angle = this.wideLantern ? 0.7 : 0.5;
    this.spot.intensity = n * 26;
    this.spot.visible = this.aura.visible = n > 0; // luz apagada não pesa no celular
    this.spot.position.set(x + Math.sin(face) * 0.3, y + 1.9, z + Math.cos(face) * 0.3);
    this.spot.target.position.set(x + Math.sin(face) * 7, y - 0.4, z + Math.cos(face) * 7);
    this.aura.intensity = n * 3 * this.auraBoost;
    this.aura.position.set(x, y + 2.4, z);
  }
}
