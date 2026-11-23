import { angLerp, clamp, lerp, rnd, rr } from '../engine/math';
import { H, WY, SURF, isDeep } from '../world/terrain';
import { Colliders } from '../world/colliders';
import { breathOutside, breathStep } from './breath';

export type PlayerState = 'ground' | 'air' | 'swim' | 'dive';

export interface Player {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  vy: number;
  face: number;
  st: PlayerState;
  /** 1 = primeiro pulo, 2 = depois do B */
  jn: number;
  /** já usou o B neste pulo */
  bUsed: boolean;
  pound: boolean;
  boost: [number, number] | null;
  bDown: boolean;
  bT: number;
  breath: number;
  rise: boolean;
  /** esmagar/esticar (game feel) */
  sq: number;
  stepT: number;
  /** tolerância para pular logo depois de sair de uma beirada */
  coy: number;
}

/** Valores de movimento (ajustados no teste da demo). */
export const MOVE = {
  speed: { ground: 6.8, air: 6.4, swim: 4.2, dive: 3.8 } as Record<PlayerState, number>,
  shallowFactor: 0.75,
  accel: 13,
  airAccel: 7,
  brake: 10,
  airBrake: 2,
  jump: 10.8,
  highJump: 13.4,
  diveJumpUp: 8.5,
  diveJumpBoost: 9,
  poundSpeed: -34,
  /** quanto tempo segurando B no ar vira marretada */
  poundHold: 0.2,
  gravityUp: 28,
  gravityDown: 34,
  swimY: WY - 0.75,
  floorDive: -2.9,
};

/** O que a física avisa para som, partículas e câmera. */
export interface PlayerEvents {
  splash(x: number, z: number, big: boolean): void;
  land(x: number, y: number, z: number, pound: boolean): void;
  step(x: number, y: number, z: number, wet: boolean): void;
  wake(x: number, z: number): void;
  bubble(x: number, y: number, z: number): void;
  outOfBreath(): void;
}

export function createPlayer(x: number, z: number): Player {
  return { x, y: H(x, z), z, vx: 0, vz: 0, vy: 0, face: Math.PI, st: 'ground', jn: 0, bUsed: false, pound: false, boost: null, bDown: false, bT: 0, breath: 1, rise: false, sq: 0, stepT: 0, coy: 0 };
}

/** Botão A: pulo; na água, mergulha; mergulhando, alterna subir e descer. Devolve o efeito. */
export function pressA(P: Player): 'jump' | 'dive' | 'toggle' | null {
  if (P.st === 'ground' || P.coy > 0) {
    Object.assign(P, { vy: MOVE.jump, st: 'air', jn: 1, bUsed: false, pound: false, sq: -0.25, coy: 0 });
    return 'jump';
  }
  if (P.st === 'swim') {
    Object.assign(P, { st: 'dive', rise: false, vy: -3.2 });
    return 'dive';
  }
  if (P.st === 'dive') {
    P.rise = !P.rise;
    return 'toggle';
  }
  return null;
}

export function pressB(P: Player) {
  P.bDown = true;
  P.bT = 0;
}

/** Soltar B logo depois do A: pulo alto, ou pulo-mergulho se estiver andando. */
export function releaseB(P: Player): 'high' | 'diveJump' | null {
  let r: 'high' | 'diveJump' | null = null;
  if (P.bDown && P.st === 'air' && !P.bUsed && P.jn === 1 && P.bT < MOVE.poundHold) {
    P.bUsed = true;
    P.jn = 2;
    if (Math.hypot(P.vx, P.vz) > 2.5) {
      P.vy = MOVE.diveJumpUp;
      P.boost = [Math.sin(P.face), Math.cos(P.face)];
      r = 'diveJump';
    } else {
      P.vy = MOVE.highJump;
      r = 'high';
    }
    P.sq = -0.35;
  }
  P.bDown = false;
  P.bT = 0;
  return r;
}

/**
 * Um passo de física. (ix, iz) é a direção desejada no mundo, m a intensidade (0 a 1).
 * Sem biblioteca de física: terreno, caixas com topo e círculos.
 */
export function stepPlayer(P: Player, ix: number, iz: number, m: number, dt: number, t: number, col: Colliders, ev: PlayerEvents) {
  if (P.st === 'ground' || P.st === 'air') P.breath = breathOutside(P.breath, dt); // fora d'água o fôlego volta inteiro
  const shallow = P.st === 'ground' && H(P.x, P.z) < WY;
  const maxS = MOVE.speed[P.st] * (shallow ? MOVE.shallowFactor : 1);
  const air = P.st === 'air';
  const acc = m > 0 ? (air ? MOVE.airAccel : MOVE.accel) : air ? MOVE.airBrake : MOVE.brake,
    k = 1 - Math.exp(-acc * dt);
  P.vx += (ix * maxS * m - P.vx) * k;
  P.vz += (iz * maxS * m - P.vz) * k;
  const sp = Math.hypot(P.vx, P.vz);
  if (sp > 0.3) P.face = angLerp(P.face, Math.atan2(P.vx, P.vz), 1 - Math.exp(-14 * dt));
  P.x += P.vx * dt;
  P.z += P.vz * dt;
  if (P.boost) {
    P.x += P.boost[0] * MOVE.diveJumpBoost * dt;
    P.z += P.boost[1] * MOVE.diveJumpBoost * dt;
  }
  col.pushOut(P);

  const deep = isDeep(P.x, P.z);
  let g = col.groundAt(P.x, P.z, P.y);

  if (P.st === 'ground') {
    if (deep && g < SURF) {
      P.st = 'swim';
      ev.splash(P.x, P.z, false);
    } else if (g < P.y - 0.45) {
      Object.assign(P, { st: 'air', vy: 0, jn: 1, bUsed: true, coy: 0.12 }); // caiu de uma beirada
    } else {
      P.y = lerp(P.y, g, Math.min(1, dt * 18));
      if (Math.abs(P.y - g) < 0.02) P.y = g;
    }
    if (sp > 1.5 && P.st === 'ground') {
      P.stepT -= dt * sp;
      if (P.stepT < 0) {
        P.stepT = 2.2;
        ev.step(P.x - Math.sin(P.face) * 0.3, P.y, P.z - Math.cos(P.face) * 0.3, H(P.x, P.z) < WY + 0.05);
      }
    }
  } else if (P.st === 'air') {
    P.coy = Math.max(0, P.coy - dt);
    if (P.bDown && !P.bUsed && P.jn === 1) {
      P.bT += dt;
      if (P.bT >= MOVE.poundHold) Object.assign(P, { pound: true, bUsed: true, vy: MOVE.poundSpeed, boost: null, vx: P.vx * 0.2, vz: P.vz * 0.2 });
    }
    P.vy -= (P.vy > 0 ? MOVE.gravityUp : MOVE.gravityDown) * dt;
    P.y += P.vy * dt;
    g = col.groundAt(P.x, P.z, P.y + (P.vy < 0 ? 0.4 : 0));
    if (deep && g < SURF && P.y <= WY - 0.4 && P.vy < 0) {
      ev.splash(P.x, P.z, true);
      Object.assign(P, { st: 'dive', rise: !P.pound, vy: P.pound ? -8 : -5, boost: null, jn: 0, bUsed: false, pound: false });
    } else if (P.y <= g && P.vy <= 0) {
      P.y = g;
      P.sq = 0.3;
      ev.land(P.x, g, P.z, P.pound);
      Object.assign(P, { st: 'ground', boost: null, jn: 0, bUsed: false, pound: false });
    }
  } else if (P.st === 'swim') {
    P.y = lerp(P.y, MOVE.swimY + Math.sin(t * 3) * 0.05, Math.min(1, dt * 6));
    P.vy = 0;
    P.breath = breathStep(P.breath, dt, false);
    if (!deep) {
      P.st = 'ground';
      P.y = Math.max(P.y, H(P.x, P.z));
    }
    if (sp > 1 && rnd() < dt * 8) ev.wake(P.x, P.z);
  } else {
    const floor = H(P.x, P.z) + 0.1,
      want = P.rise ? MOVE.swimY : Math.max(floor, MOVE.floorDive),
      vt = clamp((want - P.y) * 3, -3.6, 4.2);
    P.vy += (vt - P.vy) * Math.min(1, 8 * dt);
    P.y = Math.max(floor, P.y + P.vy * dt);
    const under = P.y < WY - 0.95;
    P.breath = breathStep(P.breath, dt, under);
    if (under) {
      if (rnd() < dt * 3) ev.bubble(P.x + rr(-0.2, 0.2), P.y + 2.2, P.z);
      if (P.breath <= 0 && !P.rise) {
        P.rise = true; // uma bolha leva para cima: sem punição
        ev.outOfBreath();
      }
    }
    if (!deep) P.st = 'ground';
    else if (P.rise && P.y >= MOVE.swimY - 0.05) P.st = 'swim';
  }
}
