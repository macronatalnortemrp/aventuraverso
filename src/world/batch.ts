import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rnd } from '../engine/math';

const _o = new THREE.Object3D(),
  _c = new THREE.Color(),
  _v = new THREE.Vector3();
const boxes = new Map<string, THREE.BufferGeometry>();

/** Caixa (com cantos arredondados quando r > 0), sempre não indexada para poder agrupar. */
export function geoBox(w: number, h: number, d: number, r = 0) {
  const k = [w, h, d, r].join();
  let g = boxes.get(k);
  if (!g) {
    g = r > 0 ? new RoundedBoxGeometry(w, h, d, 1, Math.min(r, Math.min(w, h, d) / 2 - 0.005)) : new THREE.BoxGeometry(w, h, d).toNonIndexed();
    boxes.set(k, g);
  }
  return g;
}

export interface BoxOpts {
  r?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  /** variação de brilho por peça */
  j?: number;
}

/**
 * Junta muitas peças estáticas em uma única malha com cores por vértice:
 * o acampamento inteiro sai em poucas chamadas de desenho (meta: celular de entrada).
 */
export class Batch {
  private parts: THREE.BufferGeometry[] = [];

  add(geo: THREE.BufferGeometry, color: number, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | [number, number, number] = 1, jit = 0.035) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    _o.position.set(x, y, z);
    _o.rotation.set(rx, ry, rz);
    if (typeof s === 'number') _o.scale.setScalar(s);
    else _o.scale.set(...s);
    _o.updateMatrix();
    g.applyMatrix4(_o.matrix);
    _c.set(color);
    if (jit) _c.offsetHSL(0, 0, (rnd() - 0.5) * jit);
    const n = g.attributes.position.count,
      a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = _c.r;
      a[i * 3 + 1] = _c.g;
      a[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    // centro da peça: a abertura monta o acampamento peça por peça a partir dele
    g.computeBoundingBox();
    const c = g.boundingBox!.getCenter(_v),
      pv = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pv.set([c.x, g.boundingBox!.min.y, c.z], i * 3);
    g.setAttribute('piv', new THREE.BufferAttribute(pv, 3));
    this.parts.push(g);
    return g;
  }

  box(w: number, h: number, d: number, c: number, x: number, y: number, z: number, o: BoxOpts = {}) {
    return this.add(geoBox(w, h, d, o.r || 0), c, x, y, z, o.ry || 0, o.rx || 0, o.rz || 0, 1, o.j);
  }

  mesh(scene: THREE.Object3D, material: THREE.Material, shadow = true) {
    const g = mergeGeometries(this.parts, false);
    this.parts.forEach((x) => x.dispose());
    this.parts = [];
    const m = new THREE.Mesh(g, material);
    m.castShadow = m.receiveShadow = shadow;
    if (shadow) m.customDepthMaterial = buildDepthMaterial();
    scene.add(m);
    return m;
  }
}

/**
 * Montagem do acampamento (abertura, Quadro 1): cada peça cresce a partir do chão, com um pulinho,
 * quando a onda (raio BUILD.r a partir de BUILD.o) passa por ela. Fora da abertura, BUILD.r é enorme e nada muda.
 * Tudo no shader de vértices: nenhum custo extra no celular depois da abertura.
 */
export const BUILD = { r: { value: 1e6 }, o: { value: new THREE.Vector3(0, 0, 36) } };
/** largura da onda: distância em que a peça vai de 0 ao tamanho final */
export const BUILD_WIDTH = 6;

/** Fator de escala (0 a ~1.1, com pulinho) de uma peça à distância d da origem da onda. */
export function buildScale(r: number, d: number) {
  const k = Math.min(1, Math.max(0, (r - d) / BUILD_WIDTH));
  if (k <= 0) return 0;
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}

/** Acrescenta a montagem a um material cujo modelo tem o atributo `piv` (malhas de Batch). */
export function withBuild<T extends THREE.Material>(m: T, prev?: (s: THREE.WebGLProgramParametersWithUniforms) => void): T {
  m.onBeforeCompile = (s) => {
    prev?.(s);
    s.uniforms.uBuild = BUILD.r;
    s.uniforms.uBuildO = BUILD.o;
    s.vertexShader =
      'attribute vec3 piv;uniform float uBuild;uniform vec3 uBuildO;\n' +
      s.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
 {float bk=clamp((uBuild-distance(piv.xz,uBuildO.xz))/${BUILD_WIDTH.toFixed(1)},0.,1.);
  float bm=bk-1.;float be=bk<=0.?0.:1.+2.70158*bm*bm*bm+1.70158*bm*bm;
  transformed=piv+(transformed-piv)*be;}`,
      );
  };
  return m;
}

let depthMat: THREE.MeshDepthMaterial | null = null;
/** Sombras seguem a montagem (peça ainda não montada não faz sombra). */
function buildDepthMaterial() {
  return (depthMat ??= withBuild(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })));
}

/** Posição do jogador na tela: o que estiver na frente dele fica vazado. */
export const SEE = { p: { value: new THREE.Vector2() }, d: { value: 0 }, r: { value: 0 } };

/**
 * Material do cenário. Duas regras de visibilidade, sem pós-processamento:
 * peças coladas na câmera somem em pontilhado, e árvores ou tendas entre a câmera
 * e o personagem ficam vazadas num círculo em volta dele.
 */
export function staticMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  withBuild(m, (s) => {
    s.uniforms.uSeeP = SEE.p;
    s.uniforms.uSeeD = SEE.d;
    s.uniforms.uSeeR = SEE.r;
    s.fragmentShader =
      'uniform vec2 uSeeP;uniform float uSeeD,uSeeR;\n' +
      s.fragmentShader.replace(
        'void main() {',
        `void main() {
 float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
 if(vViewPosition.z<1.8&&ign>(vViewPosition.z-.6)/1.2)discard;
 if(uSeeR>0.&&vViewPosition.z<uSeeD-1.1){float k=length(gl_FragCoord.xy-uSeeP)/uSeeR;if(k<1.&&ign>smoothstep(.45,1.,k)*1.05)discard;}`,
      );
  });
  return m;
}
