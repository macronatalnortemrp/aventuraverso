import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BIG, H, ISLES, WY, EDGE, ellD, pathD, worldOut } from './terrain';
import { MOBILE, uTime } from '../engine/gfx';
import { rnd, rr, setSeed } from '../engine/math';

/** Balanço de vento no vertex shader (sem custo de CPU). */
function windy<M extends THREE.Material>(m: M) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uT = uTime;
    s.vertexShader =
      'uniform float uT;\n' +
      s.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvec4 ip=instanceMatrix*vec4(0.,0.,0.,1.);float sw=sin(uT*1.8+ip.x*.6+ip.z*.4)*.12*max(position.y,0.);transformed.x+=sw;transformed.z+=sw*.6;',
      );
  };
  return m;
}

/** Tufo de grama: lâminas triangulares baratas (9 vértices por lâmina dupla-face). */
function bladeTuft(n: number, height: number) {
  const p: number[] = [],
    nn: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI + rr(-0.3, 0.3),
      c = Math.cos(a) * 0.07,
      s = Math.sin(a) * 0.07,
      lx = rr(-0.12, 0.12),
      lz = rr(-0.12, 0.12),
      h = height * rr(0.7, 1.15);
    p.push(-c + lx, 0, -s + lz, c + lx, 0, s + lz, lx * 1.8 + rr(-0.08, 0.08), h, lz * 1.8);
    nn.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
  return g;
}

/** Grama e flores instanciadas (uma chamada de desenho cada). */
export function buildVegetation(scene: THREE.Scene, free: (x: number, z: number, pad?: number) => boolean) {
  const o = new THREE.Object3D(),
    c = new THREE.Color();
  const GRASS = [0x86b85e, 0x93c266, 0x79ad57, 0x9cc46c];
  const N = MOBILE ? 2200 : 4200,
    N2 = MOBILE ? 900 : 1800;
  const grass = new THREE.InstancedMesh(bladeTuft(5, 0.42), windy(new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide })), N + N2);
  let k = 0;
  setSeed(91);
  for (let i = 0; i < N * 4 && k < N; i++) {
    const x = rr(-39, 39),
      z = rr(-39, 39);
    if (Math.hypot(x, z) > EDGE - 1 || pathD(x, z) < 1.6 || Math.hypot(x, z - 1) < 7 || H(x, z) < WY + 0.35) continue;
    o.position.set(x, H(x, z), z);
    o.rotation.set(0, rnd() * 6, 0);
    o.scale.setScalar(rr(0.7, 1.5));
    o.updateMatrix();
    grass.setMatrixAt(k, o.matrix);
    grass.setColorAt(k, c.setHex(GRASS[k % 4]).offsetHSL(rr(-0.02, 0.02), 0, rr(-0.04, 0.05)));
    k++;
  }
  // margem do Lago Grande (sem grama na praia nem no topo de areia das ilhas)
  for (let i = 0, k2 = 0; i < N2 * 6 && k2 < N2; i++) {
    const x = rr(-118, -26),
      z = rr(-44, 52),
      y = H(x, z);
    if (Math.hypot(x, z) < EDGE - 1 || worldOut(x, z) > -1 || y < WY + 0.5 || y > 9.5 || ellD(x, z, BIG) < 4 || pathD(x, z) < 1.6) continue;
    if (ISLES.some((il) => Math.hypot(x - il.x, z - il.z) < il.r + 4)) continue;
    o.position.set(x, y, z);
    o.rotation.set(0, rnd() * 6, 0);
    o.scale.setScalar(rr(0.7, 1.5));
    o.updateMatrix();
    grass.setMatrixAt(k, o.matrix);
    grass.setColorAt(k, c.setHex(GRASS[k % 4]).offsetHSL(rr(-0.02, 0.02), 0, rr(-0.04, 0.05)));
    k++;
    k2++;
  }
  grass.count = k;
  grass.receiveShadow = true;
  scene.add(grass);

  const stemAndHead = [new THREE.BoxGeometry(0.04, 0.5, 0.04).translate(0, 0.25, 0).toNonIndexed(), new THREE.OctahedronGeometry(0.13, 0).translate(0, 0.54, 0).toNonIndexed()];
  stemAndHead.forEach((g) => g.deleteAttribute('uv'));
  const FN = MOBILE ? 260 : 480,
    FC = [0xffffff, 0xf7d14c, 0xf29ab0, 0x9ec9ff, 0xff9a52];
  const flowers = new THREE.InstancedMesh(mergeGeometries(stemAndHead), windy(new THREE.MeshStandardMaterial({ roughness: 0.7 })), FN);
  k = 0;
  for (let i = 0; i < FN * 5 && k < FN; i++) {
    const x = rr(-39, 39),
      z = rr(-39, 39);
    if (!free(x, z, -1.2) || H(x, z) < WY + 0.4) continue;
    o.position.set(x, H(x, z), z);
    o.rotation.set(0, rnd() * 6, 0);
    o.scale.setScalar(rr(0.8, 1.3));
    o.updateMatrix();
    flowers.setMatrixAt(k, o.matrix);
    flowers.setColorAt(k, c.setHex(FC[k % 5]));
    k++;
  }
  flowers.count = k;
  scene.add(flowers);
}
