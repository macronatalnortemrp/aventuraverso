import * as THREE from 'three';
import { angLerp, clamp, lerp, rnd } from './math';
import { H, WY } from '../world/terrain';
import { Colliders } from '../world/colliders';
import { REDUCED_MOTION } from './gfx';

export const ZOOM = { min: 7, max: 22 };

/** Câmera em órbita do personagem: arrastar gira 360°, pinça ou roda aproxima. */
export class OrbitCamera {
  yaw = 0;
  pitch = 0.58;
  dist = 13;
  /** distância desejada (zoom) */
  zoom = 13;
  tx = 0;
  ty = 0;
  tz = 0;
  shake = 0;
  /** ângulo para onde a câmera vai sozinha (conversas) */
  want: number | null = null;

  constructor(private cam: THREE.PerspectiveCamera) {}

  rotate(dx: number, dy: number) {
    this.yaw -= dx * 0.0065;
    this.pitch = clamp(this.pitch + dy * 0.0045, 0.12, 1.25);
    this.want = null;
  }

  setZoom(z: number) {
    this.zoom = clamp(z, ZOOM.min, ZOOM.max);
  }

  snap(x: number, y: number, z: number) {
    this.tx = x;
    this.ty = y + 1.6;
    this.tz = z;
  }

  /** 0 = câmera normal, 1 = câmera dentro do lago (mergulho) */
  private uw = 0;

  /** A câmera está debaixo d'água (para a névoa azul e a superfície vista de baixo)? */
  get underwater() {
    return this.cam.position.y < WY - 0.05;
  }

  /**
   * Segue o personagem. `under`: a criança está mergulhada; a câmera chega perto e desce para dentro do lago,
   * entre o fundo e a superfície (sem ficar cortada pela linha da água), e volta para cima ao subir.
   */
  follow(dt: number, x: number, y: number, z: number, col: Colliders, under = false) {
    if (this.want != null) this.yaw = angLerp(this.yaw, this.want, Math.min(1, dt * 4));
    this.uw = lerp(this.uw, under ? 1 : 0, Math.min(1, dt * (under ? 3 : 5)));
    if (this.uw < 0.01) this.uw = 0;
    this.dist = lerp(this.dist, this.zoom * (this.cam.aspect < 1 ? 1.25 : 1), Math.min(1, dt * 6));
    this.tx = lerp(this.tx, x, Math.min(1, dt * 7));
    this.ty = lerp(this.ty, y + (under ? 0.9 : 1.6), Math.min(1, dt * 5));
    this.tz = lerp(this.tz, z, Math.min(1, dt * 7));
    // câmera de sempre (acima da água)
    let cx = this.tx + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist,
      cz = this.tz + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist;
    let cy = this.ty + Math.sin(this.pitch) * this.dist;
    cy = Math.max(cy, H(cx, cz) + 1.2, WY + 1);
    cy = col.minCameraY(cx, cz, cy);
    if (this.uw > 0) {
      const u = this.underPos();
      cx = lerp(cx, u.x, this.uw);
      cy = lerp(cy, u.y, this.uw);
      cz = lerp(cz, u.z, this.uw);
    }
    this.shake = Math.max(0, this.shake - dt);
    const sh = this.shake > 0 && !REDUCED_MOTION ? this.shake : 0;
    this.cam.position.set(cx + (rnd() - 0.5) * sh, cy + (rnd() - 0.5) * sh, cz);
    this.cam.lookAt(this.tx, this.ty, this.tz);
  }

  /** Lugar da câmera dentro do lago: perto, quase na altura do personagem, sem sair da água nem entrar no fundo. */
  private underPos() {
    const top = WY - 0.4,
      pitch = 0.12;
    for (let d = 4.8; d >= 1.4; d -= 0.4) {
      const x = this.tx + Math.sin(this.yaw) * Math.cos(pitch) * d,
        z = this.tz + Math.cos(this.yaw) * Math.cos(pitch) * d,
        floor = H(x, z) + 0.45,
        y = Math.min(top, Math.max(floor, this.ty + Math.sin(pitch) * d));
      if (floor < top) return { x, y, z }; // ainda dentro do lago: serve
    }
    return { x: this.tx, y: Math.min(top, this.ty + 0.3), z: this.tz + 0.01 };
  }

  /** Volta lenta em volta do acampamento, atrás da tela de título. */
  attract(dt: number) {
    this.yaw += dt * 0.06;
    this.tx = lerp(this.tx, 0, 0.05);
    this.tz = lerp(this.tz, -2, 0.05);
    this.ty = lerp(this.ty, 2, 0.05);
    this.pitch = 0.62;
    this.dist = lerp(this.dist, 34, 0.05);
    this.cam.position.set(
      this.tx + Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist,
      this.ty + Math.sin(this.pitch) * this.dist,
      this.tz + Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist,
    );
    this.cam.lookAt(this.tx, this.ty, this.tz);
  }
}
