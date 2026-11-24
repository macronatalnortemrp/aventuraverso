import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch } from './batch';
import { BIG, EDGE, FALLS, H, LIGHT_ISLE, PALM_ISLE, REEF, SHORE, WY, pathD, worldOut } from './terrain';
import { LIGHTHOUSE, LIGHT_STEPS, LIGHT_STEP_R, PIER, PIER_TOP } from './lakeLayout';
import { Kit, LEAF, STONE, WOOD_DARK, bush, rock, tree } from './builders/props';
import { Interactables } from './interactables';
import { Fx } from './fx';
import { plate } from './textures';
import { uTime } from '../engine/gfx';
import { rnd, rr, setSeed } from '../engine/math';

/*
 * Lago Grande (docs/MAPA.md): cais da Capitã Marina, Ilha das Palmeiras, Ilha do Farol,
 * recife de coral com peixes e tartaruga, e a cachoeira no paredão oeste.
 * Tudo estático vai para os Batches do acampamento (poucas chamadas de desenho no celular).
 */

/** pedras ao lado da cachoeira, subindo o paredão até o mirante: x, z e altura do piso */
export const CLIFF_STEPS: [number, number, number][] = Array.from({ length: 9 }, (_, i) => {
  const x = FALLS.x + 3.4 - i * 0.55,
    z = FALLS.z + 7.6 + (i % 2) * 1.9;
  return [x, z, Math.max(0.9 + i * 0.95, H(x, z) + 0.45)];
});

function palm({ B, col }: Kit, x: number, z: number, s = 1, lean = 0.3, dir = 0) {
  const y = H(x, z);
  let px = x,
    pz = z,
    py = y;
  for (let i = 0; i < 6; i++) {
    const k = i / 5;
    B.box(0.42 * s, 0.75 * s, 0.42 * s, i % 2 ? 0xa0784a : 0x8a6440, px, py + 0.37 * s, pz, { r: 0.06 });
    py += 0.72 * s;
    px += Math.sin(dir) * lean * k * s;
    pz += Math.cos(dir) * lean * k * s;
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd() * 0.3;
    const len = rr(1.8, 2.3) * s;
    B.box(len, 0.1, 0.55 * s, LEAF[i % 4], px + Math.cos(a) * len * 0.45, py + 0.05, pz - Math.sin(a) * len * 0.45, { ry: a, rz: -0.35, r: 0.03 });
  }
  for (let i = 0; i < 3; i++) B.box(0.26, 0.26, 0.26, 0x6b4a2a, px + Math.cos(i * 2.1) * 0.28, py - 0.25, pz + Math.sin(i * 2.1) * 0.28, { r: 0.08 });
  col.circle(x, z, 0.32 * s, y + 4 * s);
}

/** Cachoeira: lâmina de água que desce o paredão, em shader (listras que correm para baixo). */
function waterfall(scene: THREE.Scene) {
  const top = 9.2,
    bot = WY,
    run = 4.2,
    L = Math.hypot(run, top - bot),
    w = 6.5;
  const g = new THREE.PlaneGeometry(w, L, 1, 10);
  g.rotateY(Math.PI / 2);
  g.rotateZ(Math.atan2(run, top - bot));
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uT: uTime },
    vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uT;varying vec2 vU;
void main(){float s=sin(vU.x*41.+sin(vU.x*9.)*2.)*.5+.5;float f=fract(vU.y*3.+uT*1.6+s*.6);
vec3 c=mix(vec3(.55,.82,.95),vec3(1.),smoothstep(.55,1.,f)*.8+(1.-vU.y)*.25);
float a=.78*smoothstep(0.,.08,vU.x)*smoothstep(1.,.92,vU.x);gl_FragColor=vec4(c,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
  });
  const fall = new THREE.Mesh(g, m);
  fall.position.set(FALLS.x + 1.4, (top + bot) / 2, FALLS.z);
  fall.renderOrder = 3;
  scene.add(fall);
  // riacho no alto do paredão
  const st = new THREE.Mesh(new THREE.PlaneGeometry(5.5, w * 0.8).rotateX(-Math.PI / 2), m);
  st.position.set(FALLS.x - 3.6, top - 0.02, FALLS.z);
  scene.add(st);
  return fall;
}

/** Peixinhos do recife: uma malha instanciada, nadando em roda. */
function fishSchool(scene: THREE.Scene) {
  const body = new THREE.BoxGeometry(0.34, 0.2, 0.1).toNonIndexed(),
    tail = new THREE.BoxGeometry(0.12, 0.18, 0.04).translate(-0.22, 0, 0).toNonIndexed(),
    fin = new THREE.BoxGeometry(0.1, 0.08, 0.04).translate(0.02, 0.13, 0).toNonIndexed();
  const geo = mergeGeometries([body, tail, fin]);
  const N = 30;
  const fish = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), N);
  const C = [0xffa53a, 0xffd93d, 0x3fb8ff, 0xff6f91, 0x7be0c3];
  const sch: { r: number; y: number; sp: number; a: number; cx: number; cz: number }[] = [];
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const g = i % 5;
    sch.push({ r: 2 + g * 1.3 + rnd() * 0.6, y: -1.35 - rnd() * 0.6, sp: (0.5 + g * 0.08) * (g % 2 ? 1 : -1), a: rnd() * 6.3, cx: REEF.x + (g - 2) * 1.2, cz: REEF.z + (g % 3) - 1 });
    fish.setColorAt(i, c.setHex(C[g]));
  }
  fish.frustumCulled = false;
  scene.add(fish);
  const o = new THREE.Object3D();
  return (t: number) => {
    sch.forEach((f, i) => {
      const a = f.a + t * f.sp;
      o.position.set(f.cx + Math.cos(a) * f.r, f.y + Math.sin(t * 2 + i) * 0.08, f.cz + Math.sin(a) * f.r);
      o.rotation.set(0, -a + (f.sp > 0 ? -Math.PI / 2 : Math.PI / 2), Math.sin(t * 9 + i) * 0.15);
      o.updateMatrix();
      fish.setMatrixAt(i, o.matrix);
    });
    fish.instanceMatrix.needsUpdate = true;
  };
}

/** Tartaruga marinha de blocos, nadando devagar em volta do recife. */
function turtle(scene: THREE.Scene) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x5f8a3a, roughness: 0.7 }),
    skin = new THREE.MeshStandardMaterial({ color: 0x9cc46c, roughness: 0.8 }),
    pat = new THREE.MeshStandardMaterial({ color: 0x3f6a2a, roughness: 0.7 });
  const add = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  };
  add(1.1, 0.34, 0.9, shell, 0, 0.1, 0);
  add(0.8, 0.12, 0.6, pat, 0, 0.32, 0);
  add(0.36, 0.26, 0.32, skin, 0.7, 0.08, 0);
  const fl = [add(0.5, 0.06, 0.24, skin, 0.25, 0, 0.55), add(0.5, 0.06, 0.24, skin, 0.25, 0, -0.55), add(0.3, 0.06, 0.18, skin, -0.45, 0, 0.42), add(0.3, 0.06, 0.18, skin, -0.45, 0, -0.42)];
  g.scale.setScalar(1.1);
  scene.add(g);
  return (t: number) => {
    const a = t * 0.12;
    g.position.set(REEF.x + Math.cos(a) * 6.5, -1.55 + Math.sin(t * 0.7) * 0.15, REEF.z + Math.sin(a) * 5.5);
    g.rotation.y = -a - Math.PI / 2;
    fl.forEach((f, i) => (f.rotation.x = Math.sin(t * 2.4 + (i % 2) * Math.PI) * 0.5));
  };
}

/** onde a criança está (main.ts atualiza a cada quadro): peixes e espuma só se mexem quando ela está perto */
export const FOCUS = { x: 0, z: 0 };
const player = () => FOCUS;

/** Devolve o Batch das peças do lago (malha separada: sai da tela e da sombra quando a criança está no acampamento). */
export function buildBigLake(camp: Kit, scene: THREE.Scene, inter: Interactables, fx: Fx, animated: ((dt: number, t: number) => void)[]) {
  const kit: Kit = { B: new Batch(), GLOW: camp.GLOW, col: camp.col };
  const { B, GLOW, col } = kit;
  setSeed(77);

  /* cais da Capitã Marina */
  {
    const y = PIER_TOP;
    for (let x = PIER.x0; x >= PIER.x1; x -= 0.62) B.box(0.56, 0.14, PIER.w, 0xb4875a, x, y, PIER.z, { r: 0.03, j: 0.08 });
    for (let x = PIER.x0 - 0.3; x >= PIER.x1 - 0.1; x -= 1.95)
      for (const s of [-1, 1]) {
        B.box(0.24, 2.8, 0.24, WOOD_DARK, x, y - 1.1, PIER.z + (s * PIER.w) / 2, { r: 0.05 });
        B.box(0.16, 0.18, 0.16, 0x8a6040, x, y + 0.36, PIER.z + (s * PIER.w) / 2);
      }
    col.boxes.push({ x0: PIER.x1 - 0.3, x1: PIER.x0 + 0.3, z0: PIER.z - PIER.w / 2, z1: PIER.z + PIER.w / 2, top: y + 0.07 });
    // poste com lanterna e placa
    const px = PIER.x1 + 0.4,
      pz = PIER.z - PIER.w / 2 + 0.15;
    B.box(0.2, 1.6, 0.2, WOOD_DARK, px, y + 0.8, pz);
    GLOW.box(0.34, 0.4, 0.34, 0xffd76a, px, y + 1.75, pz);
    B.box(0.44, 0.08, 0.44, 0x3a2a1c, px, y + 2.0, pz);
    const sx = PIER.x0 + 1.2,
      sz = PIER.z - PIER.w / 2 - 0.5,
      sy = H(sx, sz);
    for (const d of [-0.8, 0.8]) B.box(0.16, 1.5, 0.16, WOOD_DARK, sx + d, sy + 0.75, sz);
    plate('Cais da Capitã Marina', 2, 0.6, '#fff6dc', '#172D49', sx, sy + 1.35, sz - 0.05, Math.PI, { border: '#D7A64D' });
    // cordas e bóias penduradas
    for (const x of [PIER.x1 + 2, PIER.x1 + 5]) B.box(0.5, 0.5, 0.12, 0xe0482f, x, y + 0.35, PIER.z + PIER.w / 2 + 0.05, { r: 0.2 });
    // caixotes e um barril no começo
    B.box(0.7, 0.6, 0.7, 0xa8703f, PIER.x0 - 0.6, y + 0.37, PIER.z + 0.55, { r: 0.04 });
    B.box(0.55, 0.5, 0.55, 0xc28a52, PIER.x0 - 0.6, y + 0.92, PIER.z + 0.55, { r: 0.04, ry: 0.3 });
  }

  /* árvores, arbustos e pedras na margem do Lago Grande */
  const nearPier = (x: number, z: number) => x < PIER.x0 + 4 && x > PIER.x1 - 2 && Math.abs(z - PIER.z) < 5;
  const shoreFree = (x: number, z: number, pad = 0) => {
    const y = H(x, z);
    return (
      y > WY + 0.7 &&
      y < 7.5 &&
      worldOut(x, z) < -2.5 - pad &&
      Math.hypot(x, z) > EDGE - 2 &&
      pathD(x, z) > 2.5 &&
      !nearPier(x, z) &&
      !(x < FALLS.x + 6 && Math.abs(z - FALLS.z) < 18) &&
      col.circles.every((c) => Math.hypot(c.x - x, c.z - z) > 3.2)
    );
  };
  for (let i = 0, n = 0; i < 2200 && n < 78; i++) {
    const a = rnd() * Math.PI * 2,
      k = rr(0.86, 1.05),
      x = SHORE.x + Math.cos(a) * SHORE.rx * k,
      z = SHORE.z + Math.sin(a) * SHORE.rz * k;
    if (!shoreFree(x, z)) continue;
    tree(kit, x, z, rr(0.9, 1.35), rnd() < 0.4 ? 'pine' : rnd() < 0.15 ? 'fruit' : 'round');
    n++;
  }
  for (let i = 0, n = 0; i < 1500 && n < 30; i++) {
    const a = rnd() * Math.PI * 2,
      k = rr(0.83, 1.02),
      x = SHORE.x + Math.cos(a) * SHORE.rx * k,
      z = SHORE.z + Math.sin(a) * SHORE.rz * k;
    if (!shoreFree(x, z)) continue;
    if (rnd() < 0.5) bush(kit, x, z, rr(0.9, 1.3));
    else rock(kit, x, z, rr(0.7, 1.2));
    n++;
  }
  // palmeiras na praia da margem leste
  for (let i = 0, n = 0; i < 600 && n < 10; i++) {
    const a = rr(-1.2, 1.2),
      x = BIG.x + Math.cos(a) * (BIG.rx + rr(2, 4.5)),
      z = BIG.z + Math.sin(a) * (BIG.rz + rr(2, 4.5));
    if (H(x, z) < WY + 0.5 || H(x, z) > 2 || nearPier(x, z) || pathD(x, z) < 2.5 || Math.hypot(x, z) < EDGE - 2 || col.circles.some((c) => Math.hypot(c.x - x, c.z - z) < 3.5)) continue;
    palm(kit, x, z, rr(0.9, 1.15), 0.35, Math.atan2(BIG.x - x, BIG.z - z));
    n++;
  }
  // vitórias-régias e juncos perto da margem
  const pad = new THREE.CylinderGeometry(0.62, 0.62, 0.06, 10);
  for (let i = 0, n = 0; i < 800 && n < 26; i++) {
    const a = rnd() * Math.PI * 2,
      k = rr(0.84, 0.95),
      x = BIG.x + Math.cos(a) * BIG.rx * k,
      z = BIG.z + Math.sin(a) * BIG.rz * k,
      y = H(x, z);
    if (y > WY - 0.5 || y < -2.4 || Math.hypot(x - REEF.x, z - REEF.z) < REEF.r + 3 || nearPier(x, z) || x > -38) continue;
    B.add(pad, 0x4f9a4a, x, WY + 0.04, z, rnd() * 6, 0, 0, 1, 0.06);
    if (rnd() < 0.4) B.box(0.22, 0.16, 0.22, 0xf6a9c8, x + 0.15, WY + 0.12, z, { r: 0.07 });
    n++;
  }
  for (let i = 0, n = 0; i < 900 && n < 40; i++) {
    const a = rnd() * Math.PI * 2,
      k = rr(0.97, 1.03),
      x = BIG.x + Math.cos(a) * BIG.rx * k,
      z = BIG.z + Math.sin(a) * BIG.rz * k,
      yy = H(x, z);
    if (yy > WY + 0.2 || yy < WY - 0.9 || nearPier(x, z) || x > -36 || x < FALLS.x + 5) continue;
    for (let q = 0; q < 3; q++) B.box(0.08, rr(0.8, 1.4), 0.08, 0x5c8a3a, x + rr(-0.2, 0.2), yy + 0.5, z + rr(-0.2, 0.2), { rz: rr(-0.15, 0.15) });
    n++;
  }

  /* Ilha das Palmeiras: praia, palmeiras e um baú */
  {
    const { x, z } = PALM_ISLE;
    [[-3, -2, 0.3], [2.6, -3, 2], [-1.5, 3, 4], [3.5, 1.5, 1.2], [0.5, -4.6, 3], [-4.3, 1, 5.2]].forEach(([dx, dz, d]) => palm(kit, x + dx, z + dz, rr(1, 1.2), 0.45, d));
    const cy = H(x + 0.6, z - 0.4);
    B.box(1.2, 0.6, 0.8, 0x8a5a34, x + 0.6, cy + 0.3, z - 0.4, { r: 0.05 });
    B.box(1.24, 0.3, 0.84, 0x6b4426, x + 0.6, cy + 0.72, z - 0.4, { r: 0.1 });
    for (const dx of [-0.35, 0.35]) B.box(0.12, 0.92, 0.86, 0xe0b040, x + 0.6 + dx, cy + 0.46, z - 0.4);
    col.solid(x + 0.6, z - 0.4, 1.2, 0.8, cy + 0.87);
    rock(kit, x - 2.5, z + 4.6, 0.8);
    rock(kit, x + 4.8, z - 2, 0.9);
    for (let i = 0; i < 6; i++) B.box(0.3, 0.06, 0.3, [0xff8f6b, 0xffd27a, 0xf6a9c8][i % 3], x + rr(-4, 4), H(x, z + 5) + 0.05, z + rr(4.3, 5.6), { ry: rnd() * 3 });
    const s = plate('Ilha das Palmeiras', 1.8, 0.55, '#fff6dc', '#172D49', x + 1.6, H(x + 1.6, z + 4) + 1.2, z + 4, 0, { border: '#D7A64D' });
    void s;
    for (const d of [-0.7, 0.7]) B.box(0.14, 1.3, 0.14, WOOD_DARK, x + 1.6 + d, H(x + 1.6, z + 4) + 0.65, z + 3.95);
    inter.add({ x: x + 1.6, z: z + 4, name: 'Ilha das Palmeiras', label: 'Ler a placa', who: 'Tico', text: 'Ilha das Palmeiras! Dá para chegar de barco ou nadando. Procure as moedas perto do baú.' });
  }

  /* Ilha do Farol: torre listrada com degraus em volta e um mirante no alto */
  {
    const { x, z, r, h } = LIGHTHOUSE,
      gy = H(x, z);
    const seg = 6;
    for (let i = 0; i < seg; i++) {
      const k = i / seg,
        rr0 = r * (1 - k * 0.22),
        rr1 = r * (1 - (k + 1 / seg) * 0.22);
      B.add(new THREE.CylinderGeometry(rr1, rr0, h / seg, 16), i % 2 ? 0xfafafa : 0xd23b3b, x, gy + (i + 0.5) * (h / seg), z, 0, 0, 0, 1, 0.02);
    }
    B.box(0.7, 1.1, 0.12, 0x5a3a22, x, gy + 0.55, z + r - 0.02);
    // mirante
    const top = gy + h + 0.3;
    B.box(4.2, 0.3, 4.2, 0xbfb6a6, x, top - 0.15, z, { r: 0.05 });
    col.boxes.push({ x0: x - 2.1, x1: x + 2.1, z0: z - 2.1, z1: z + 2.1, top, bottom: top - 0.5 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const px = x + Math.cos(a) * 1.95,
        pz = z + Math.sin(a) * 1.95;
      B.box(0.12, 0.7, 0.12, 0x3a3a44, px, top + 0.35, pz);
    }
    for (const [dx, dz, w, d] of [[0, 1.95, 3.9, 0.1], [0, -1.95, 3.9, 0.1], [1.95, 0, 0.1, 3.9], [-1.95, 0, 0.1, 3.9]]) B.box(w, 0.08, d, 0x3a3a44, x + dx, top + 0.7, z + dz);
    // sala da luz: vidro aceso e telhado vermelho
    B.add(new THREE.CylinderGeometry(1.05, 1.05, 0.25, 14), 0x3a3a44, x, top + 0.12, z, 0, 0, 0, 1, 0);
    GLOW.add(new THREE.CylinderGeometry(0.85, 0.85, 1.2, 12), 0xfff0a8, x, top + 0.85, z, 0, 0, 0, 1, 0);
    B.add(new THREE.ConeGeometry(1.25, 1.1, 14), 0xd23b3b, x, top + 2.0, z, 0, 0, 0, 1, 0);
    B.box(0.12, 0.6, 0.12, 0x3a3a44, x, top + 2.8, z);
    col.circle(x, z, r, top + 2.6);
    // degraus em espiral
    LIGHT_STEPS.forEach(([a, k], i) => {
      const px = x + Math.cos(a) * LIGHT_STEP_R,
        pz = z + Math.sin(a) * LIGHT_STEP_R,
        fy = gy + k;
      B.box(1.5, 0.36, 1.5, i % 2 ? 0xcfc6b4 : 0xb8ae9c, px, fy - 0.18, pz, { r: 0.06, ry: -a });
      if (i > 0) B.box(0.2, fy - gy - 0.36, 0.2, 0x8a8478, px, gy + (fy - gy - 0.36) / 2, pz);
      col.boxes.push({ x0: px - 0.72, x1: px + 0.72, z0: pz - 0.72, z1: pz + 0.72, top: fy, bottom: fy - 0.5 });
    });
    // facho de luz que gira (suave de dia)
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Group();
    for (const s of [0, Math.PI]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(1.6, 14, 10, 1, true).translate(0, -7, 0).rotateZ(Math.PI / 2), beamMat);
      c.rotation.y = s;
      beam.add(c);
    }
    beam.position.set(x, top + 0.85, z);
    scene.add(beam);
    animated.push((dt) => (beam.rotation.y += dt * 0.6));
    for (const [dx, dz] of [[-3.6, 2.8], [2.6, -3.4], [-3.2, -3]]) rock(kit, x + dx, z + dz, rr(0.8, 1.1));
    const sx = LIGHT_ISLE.x + 3.4,
      sz = LIGHT_ISLE.z + 3,
      sy = H(sx, sz);
    for (const d of [-0.7, 0.7]) B.box(0.14, 1.3, 0.14, WOOD_DARK, sx, sy + 0.65, sz + d);
    plate('Ilha do Farol', 1.6, 0.55, '#fff6dc', '#172D49', sx + 0.05, sy + 1.2, sz, Math.PI / 2, { border: '#D7A64D' });
    inter.add({ x: sx, z: sz, name: 'Ilha do Farol', label: 'Ler a placa', who: 'Tico', text: 'O farol ajuda os barcos a acharem o caminho. Suba pelos degraus em volta da torre!' });
  }

  /* recife de coral: corais, leques, algas e estrelas-do-mar no fundo raso */
  {
    const CORAL = [0xff6f91, 0xff9a3c, 0x9b6bd6, 0xffd24a, 0x3cc8b4, 0xff5a5a];
    for (let i = 0, n = 0; i < 400 && n < 64; i++) {
      const a = rnd() * Math.PI * 2,
        d = Math.sqrt(rnd()) * (REEF.r + 2),
        x = REEF.x + Math.cos(a) * d,
        z = REEF.z + Math.sin(a) * d,
        y = H(x, z);
      if (y > -1.9 || y < -2.8) continue;
      const c = CORAL[n % CORAL.length],
        t = n % 4;
      if (t === 0) {
        // coral cérebro: blocos empilhados
        B.box(0.8, 0.45, 0.8, c, x, y + 0.2, z, { r: 0.18, ry: rnd() });
        B.box(0.5, 0.3, 0.5, c, x + 0.1, y + 0.5, z - 0.05, { r: 0.12 });
      } else if (t === 1) {
        // coral galho
        const hh = rr(0.6, 0.95);
        B.box(0.16, hh, 0.16, c, x, y + hh / 2, z);
        for (const s of [-1, 1]) B.box(0.12, hh * 0.6, 0.12, c, x + s * 0.2, y + hh * 0.55, z, { rz: s * 0.5 });
      } else if (t === 2) {
        // leque
        B.box(0.06, rr(0.6, 0.9), rr(0.7, 1), c, x, y + 0.4, z, { ry: rnd() * 3, r: 0.02 });
      } else {
        // algas
        for (let q = 0; q < 3; q++) B.box(0.1, rr(0.5, 0.9), 0.06, 0x3d9c5c, x + q * 0.14, y + 0.35, z, { rz: rr(-0.25, 0.25) });
      }
      n++;
    }
    for (let i = 0; i < 10; i++) {
      const a = rnd() * 6.3,
        d = rr(1, REEF.r),
        x = REEF.x + Math.cos(a) * d,
        z = REEF.z + Math.sin(a) * d,
        y = H(x, z);
      for (let k = 0; k < 5; k++) B.box(0.26, 0.05, 0.08, 0xff8a3c, x + Math.cos((k * 2 * Math.PI) / 5) * 0.12, y + 0.04, z + Math.sin((k * 2 * Math.PI) / 5) * 0.12, { ry: (-k * 2 * Math.PI) / 5 });
    }
    // conchas e pedras do recife
    for (let i = 0; i < 8; i++) {
      const a = rnd() * 6.3,
        d = rr(REEF.r - 2, REEF.r + 3),
        x = REEF.x + Math.cos(a) * d,
        z = REEF.z + Math.sin(a) * d;
      B.box(rr(0.8, 1.4), rr(0.5, 0.9), rr(0.8, 1.2), STONE, x, H(x, z) + 0.2, z, { r: 0.25, ry: rnd() * 3 });
    }
    const fish = fishSchool(scene),
      tur = turtle(scene);
    animated.push((_dt, t) => {
      const p = player();
      if (Math.hypot(p.x - REEF.x, p.z - REEF.z) > 70) return;
      fish(t);
      tur(t);
    });
  }

  /* cachoeira no paredão oeste, com pedras para subir até o mirante */
  {
    waterfall(scene);
    CLIFF_STEPS.forEach(([x, z, fy], i) => {
      const g = Math.min(H(x, z), WY);
      B.box(1.6, Math.max(0.5, fy - g + 0.3), 1.5, i % 2 ? 0xa9a59a : 0x948f84, x, (fy + g - 0.3) / 2, z, { r: 0.12, ry: i * 0.4 });
      col.boxes.push({ x0: x - 0.78, x1: x + 0.78, z0: z - 0.75, z1: z + 0.75, top: fy });
    });
    for (const [dz, s] of [[-4.6, 1.2], [4.3, 1], [-3.2, 0.8], [5.8, 1.3]]) rock(kit, FALLS.x + 2.5, FALLS.z + dz, s, false);
    const sx = FALLS.x - 3.8,
      sz = FALLS.z + 9,
      sy = H(sx, sz);
    for (const d of [-0.7, 0.7]) B.box(0.14, 1.3, 0.14, WOOD_DARK, sx + d, sy + 0.65, sz);
    plate('Mirante da Cachoeira', 1.9, 0.55, '#fff6dc', '#172D49', sx, sy + 1.2, sz + 0.05, 0, { border: '#D7A64D' });
    inter.add({ x: sx, z: sz, name: 'Mirante da Cachoeira', label: 'Ler a placa', who: 'Tico', text: 'Que vista! Daqui dá para ver o lago inteiro, as ilhas e o farol.' });
    let foam = 0;
    animated.push((dt) => {
      const p = player();
      if (Math.hypot(p.x - FALLS.x, p.z - FALLS.z) > 60) return;
      foam -= dt;
      if (foam > 0) return;
      foam = 0.14;
      fx.puff(FALLS.x + 3.3 + rr(-0.4, 0.6), WY + 0.15, FALLS.z + rr(-3, 3), { n: 2, color: 0xffffff, sp: 1.4, up: 2.2, g: 3, s: 0.8, life: 0.9 });
    });
  }
  return B;
}
