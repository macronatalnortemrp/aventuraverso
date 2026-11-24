import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Batch, geoBox, staticMaterial, withBuild } from './batch';
import { Colliders } from './colliders';
import { Interactable, Interactables } from './interactables';
import { Fx, Sparkles } from './fx';
import { EMB, EmblemKey, FONT, canvasTex, decal, plate } from './textures';
import { BIG, H, HILL, ISLES, LAKE, REEF, WY, EDGE, ellD, pathD, worldOut } from './terrain';
import { BOAT_DOCK } from './lakeLayout';
import { buildBigLake } from './bigLake';
import { makeGalleon } from './builders/galleon';
import { Kit, LEAF, STONE, WOOD, WOOD_DARK, bunting, bush, fence, lamp, rock, tree } from './builders/props';
import { buildVegetation } from './vegetation';
import { FOG, FOG_COLOR, HORIZON, MOBILE, uTime } from '../engine/gfx';
import { rnd, rr, setSeed, sm } from '../engine/math';

/* O Acampamento do Livro Aberto (docs/THEME_AVENTUREIROS.md): portão, clareira das tendas,
   Colina do Globo, lago com cais, mata e observatório. */

export interface Portal {
  x: number;
  y: number;
  z: number;
  open: boolean;
  sp: Sparkles;
}

export interface Stump {
  x: number;
  y: number;
  z: number;
  ring: THREE.Mesh;
  used: boolean;
}

export const OBSERVATORY = { x: 24, z: -22 };
/** Degraus do observatório: [dx, dz, altura] */
export const OBS_STEPS: [number, number, number][] = [
  [-6, 3, 1],
  [-6, 1, 2],
  [-6, -1, 3],
  [-3.4, 0, 4],
];

/** Murais onde os convites do Dia 1 são pendurados. */
export const MURALS: [number, number, number][] = [
  [-11, -1, 0.9],
  [11, -1, -0.9],
  [-5.5, 14, 0.5],
];
/** Lampião central da clareira (acende no "Haja luz"). */
export const CENTRAL_LAMP = { x: -3, z: 5.5 };
export const GLOBE = { x: HILL.x, z: HILL.z - 1 };
/** Livro dos Sete Dias, no suporte de madeira diante do Globo. */
export const BOOK = { x: 0, z: HILL.z + 5 };
/** Mastro da bandeira do Clube. */
export const FLAG = { x: 9, z: 8 };
/** Tenda da classe i (0 a 3) na Clareira. */
/** lugar de descanso do barco do cais */
/** galeão amarrado no cais do Lago Grande (mesmo antes do Dia 2) */
export const BOAT_HOME = BOAT_DOCK;

/** quebra o texto de um ideal em linhas curtas para caber no quadro */
function wrapIdeal(t: string) {
  const out: string[] = [];
  let line = '';
  for (const w of t.split(' ')) {
    if ((line + ' ' + w).trim().length > 22) {
      out.push(line.trim());
      line = w;
    } else line += ' ' + w;
  }
  if (line.trim()) out.push(line.trim());
  return out.join('\n');
}

export function tentSpot(i: number) {
  const a = -0.95 + i * 0.633;
  return { x: Math.sin(a) * 12.5, z: 2 - Math.cos(a) * 12.5, a };
}

export interface Camp {
  terrain: THREE.Mesh;
  water: THREE.Mesh;
  col: Colliders;
  inter: Interactables;
  portals: Portal[];
  stumps: Stump[];
  update(dt: number, t: number): void;
  /** 0 = dia, 1 = escuro total */
  setNight(n: number): void;
  /** 0 = apagado, 1 = aceso */
  setGlobe(k: number): void;
  setCentralLamp(k: number): void;
  setInvite(i: number, on: boolean): void;
  /** barco do cais (o Dia 2 navega com ele) e onde ele fica parado */
  boat: THREE.Group;
  boatHome: { x: number; z: number; ry: number };
  /** Quadro dos Ideais i (0 Voto, 1 Lei, 2 Voto à Bíblia, 3 Hino): aceso com o texto conferido, ou apagado (null) */
  setIdeal(i: number, text: string | null): void;
  /** onde fica o quadro i e para onde ele olha */
  idealSpot(i: number): { x: number; z: number; ry: number };
  /** camada do Dia 2 dentro do Globo: céu azul em cima e águas embaixo (0 = sem, 1 = completa) */
  setGlobeSky(k: number): void;
}

const CLASSES: { k: EmblemKey; n: string; age: number; c: number; d: string }[] = [
  { k: 'abe', n: 'Abelhinhas', age: 6, c: 0x25aae1, d: 'organização, trabalho e dedicação na causa de Deus.' },
  { k: 'lum', n: 'Luminares', age: 7, c: 0xf26522, d: 'Jesus como direção e guia que ilumina e brilha na vida da criança.' },
  { k: 'edi', n: 'Edificadores', age: 8, c: 0x2e3192, d: 'edificação do caráter infantil para Jesus.' },
  { k: 'mao', n: 'Mãos Ajudadoras', age: 9, c: 0x6b0006, d: 'união, amizade e companheirismo.' },
];

function buildTerrain(scene: THREE.Scene) {
  // acampamento (x de -48 a 48) e o Lago Grande a oeste (até x = -126)
  const X0 = -126,
    X1 = 48,
    Z0 = -52,
    Z1 = 54,
    dens = MOBILE ? 1.15 : 1.6,
    g = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, Math.round((X1 - X0) * dens), Math.round((Z1 - Z0) * dens));
  g.rotateX(-Math.PI / 2);
  g.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
  const p = g.attributes.position,
    cl = new Float32Array(p.count * 3),
    c = new THREE.Color();
  const G1 = new THREE.Color(0x6f9a52),
    G2 = new THREE.Color(0x86ad5c),
    SAND = new THREE.Color(0xe6d29a),
    DIRT = new THREE.Color(0xc9a46c),
    DEEP = new THREE.Color(0x6d8f86),
    HILLC = new THREE.Color(0x7aa85a);
  const ss = sm;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      y = H(x, z);
    p.setY(i, y);
    const pd = pathD(x, z),
      cd = Math.hypot(x, z - 1),
      dl = Math.hypot(x - LAKE.x, (z - LAKE.z) * 1.12);
    const checker = (Math.floor(x / 2) + Math.floor(z / 2)) & 1 ? 0.025 : -0.025,
      nz = Math.sin(x * 0.9) * Math.cos(z * 0.8) * 0.5 + 0.5;
    c.copy(G1).lerp(G2, nz).offsetHSL(0, 0, checker);
    if (Math.hypot(x - HILL.x, z - HILL.z) < 14) c.lerp(HILLC, 0.35);
    if (cd < 7.5) c.lerp(DIRT, (1 - ss(5.5, 7.5, cd)) * 0.75);
    if (pd < 1.7) c.lerp(DIRT, 1 - ss(1.1, 1.7, pd));
    if (y < WY + 0.45) c.lerp(SAND, 1 - ss(WY + 0.1, WY + 0.45, y));
    if (y < WY - 0.3) c.lerp(DEEP, ss(WY - 0.3, -2.6, y));
    if (dl < LAKE.r + 2.2 && y >= WY + 0.45) c.lerp(SAND, (1 - ss(LAKE.r + 0.6, LAKE.r + 2.2, dl)) * 0.6);
    // praia do Lago Grande e das ilhas
    const sb = ellD(x, z, BIG);
    if (sb > -2 && sb < 6 && y >= WY + 0.45 && y < 2.6) c.lerp(SAND, (1 - ss(2.5, 6, sb)) * 0.75);
    for (const il of ISLES) {
      const di = Math.hypot(x - il.x, z - il.z);
      if (di < il.r + 4 && y >= WY + 0.45) c.lerp(SAND, ss(il.r - 3, il.r - 0.5, di) * 0.85);
    }
    if (y > 4.5 && worldOut(x, z) < 0 && x < -100) c.lerp(new THREE.Color(0x9a958a), ss(4.5, 7, y) * 0.7);
    cl[i * 3] = c.r;
    cl[i * 3 + 1] = c.g;
    cl[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

/** Água do lago em shader: raso turquesa, fundo azul, espuma na margem, brilho e reflexo do céu. */
function buildWater(scene: THREE.Scene) {
  // enseada da ilha suspensa e Lago Grande: de x = -122 a -12
  const g = new THREE.PlaneGeometry(110, 98, MOBILE ? 96 : 124, MOBILE ? 86 : 110);
  g.rotateX(-Math.PI / 2);
  g.translate(-67, WY, 4);
  const p = g.attributes.position,
    d = new Float32Array(p.count),
    cl = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i);
    d[i] = WY - H(x, z);
    cl[i] = 1 - sm(REEF.r, REEF.r + 6, Math.hypot(x - REEF.x, z - REEF.z));
  }
  g.setAttribute('depth', new THREE.BufferAttribute(d, 1));
  g.setAttribute('clr', new THREE.BufferAttribute(cl, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide, // a câmera também mergulha: a superfície precisa aparecer vista de baixo
    uniforms: {
      uT: uTime,
      sh: { value: new THREE.Color(0x5fd3d6) },
      dp: { value: new THREE.Color(0x1f6fb0) },
      fm: { value: new THREE.Color(0xffffff) },
      sk: { value: HORIZON },
      fc: { value: FOG_COLOR },
      fn: { value: FOG.near },
      ff: { value: FOG.far },
      lit: { value: 1 },
    },
    vertexShader: `attribute float depth,clr;varying float vD,vC;varying vec3 vP;uniform float uT;
void main(){vD=depth;vC=clr;vec4 w=modelMatrix*vec4(position,1.);w.y+=sin(w.x*.9+uT*1.4)*.03+cos(w.z*.8+uT*1.1)*.03;vP=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform float uT,fn,ff,lit;uniform vec3 sh,dp,fm,sk,fc;varying float vD,vC;varying vec3 vP;
void main(){if(vD<-.05)discard;vec2 q=vP.xz;
float n=sin(q.x*1.3+uT)*sin(q.y*1.1-uT*.8)+.5*sin((q.x+q.y)*2.3+uT*1.7)+.35*sin(q.x*3.7-q.y*2.9-uT*2.);
float d=clamp(vD/2.6,0.,1.);vec3 c=mix(sh,dp,smoothstep(0.,1.,d));
float fo=1.-smoothstep(.0,.28+.07*n,vD);c=mix(c,fm,fo*.9);c+=vec3(1.)*pow(max(0.,n*.55),5.)*.6*(1.-fo);
vec3 V=normalize(cameraPosition-vP);float fr=pow(1.-clamp(V.y,0.,1.),3.);c=mix(c,sk,fr*.55);
float a=mix(.5,.86,d);
/* recife: água clara e turquesa para ver os corais do barco */
c=mix(c,mix(sh,vec3(.3,.85,.85),.5),vC*.6);a=mix(a,.34,vC);a=max(a,fo*.95);
if(cameraPosition.y<vP.y){/* vista de baixo: espelho claro e ondulado da superfície */
c=mix(vec3(.55,.85,.92),vec3(.85,.97,1.),pow(max(0.,n*.5+.5),3.));a=.72;}
c*=lit;c=mix(c,fc,smoothstep(fn,ff,length(cameraPosition-vP)));
gl_FragColor=vec4(c,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
  });
  const w = new THREE.Mesh(g, m);
  w.renderOrder = 2;
  scene.add(w);
  return { mesh: w, uniforms: m.uniforms };
}

export function buildCamp(scene: THREE.Scene, fx: Fx): Camp {
  const B = new Batch(),
    GLOW = new Batch(),
    FAR = new Batch(),
    col = new Colliders(),
    inter = new Interactables(scene),
    kit: Kit = { B, GLOW, col };
  const terrain = buildTerrain(scene),
    { mesh: water, uniforms: waterU } = buildWater(scene);
  const animated: ((dt: number, t: number) => void)[] = [];
  let fireFlame: THREE.Group | null = null,
    fireLight: THREE.PointLight | null = null;

  /* portão de entrada com o emblema A1 */
  {
    const z = 36,
      y = H(0, z);
    for (const x of [-3.2, 3.2]) {
      B.box(0.7, 4.6, 0.7, WOOD, x, y + 2.3, z, { r: 0.12 });
      B.box(1, 0.35, 1, WOOD_DARK, x, y + 4.7, z, { r: 0.1 });
      col.solid(x, z, 0.8, 0.8, y + 5);
    }
    B.box(7.6, 0.9, 0.5, WOOD_DARK, 0, y + 4.1, z, { r: 0.12 });
    plate('aventuráVerso', 5.2, 0.75, '#172D49', '#ffe9b0', 0, y + 4.1, z + 0.27, 0, { border: '#D7A64D' });
    plate('aventuráVerso', 5.2, 0.75, '#172D49', '#ffe9b0', 0, y + 4.1, z - 0.27, Math.PI, { border: '#D7A64D' });
    decal('a1', 1.15, 0, y + 5.25, z + 0.05);
    B.box(1.5, 1.4, 0.12, 0xf6f0e2, 0, y + 5.25, z - 0.02, { r: 0.08 });
    bunting(kit, -3.2, y + 3.6, z, 3.2, y + 3.6, z, 9);
    fence(kit, -8.2, z, 0, 9.4);
    fence(kit, 8.2, z, 0, 9.4);
  }

  /* árvores, arbustos, pedras e lampiões */
  const avoid: [number, number, number][] = [
    [0, 1, 10],
    [0, 25, 7],
    [HILL.x, HILL.z, 13],
    [LAKE.x, LAKE.z, 12],
    [24, -22, 7],
    [0, 36, 6],
    [-9, -19, 4],
    [10, -19, 4],
  ];
  const free = (x: number, z: number, pad = 0) =>
    Math.hypot(x, z) <= EDGE - 3 && pathD(x, z) >= 3.2 + pad && avoid.every(([ax, az, r]) => Math.hypot(x - ax, z - az) >= r + pad);
  setSeed(21);
  for (let i = 0, n = 0; i < 900 && n < 50; i++) {
    const x = rr(14, 38),
      z = rr(-6, 28);
    if (!free(x, z, 0.8) || col.circles.some((c) => Math.hypot(c.x - x, c.z - z) < 4.3)) continue;
    tree(kit, x, z, rr(0.85, 1.25), rnd() < 0.25 ? 'pine' : rnd() < 0.12 ? 'fruit' : 'round');
    n++;
  }
  for (let i = 0, n = 0; i < 900 && n < 46; i++) {
    const a = rnd() * Math.PI * 2,
      d = rr(24, EDGE - 2),
      x = Math.cos(a) * d,
      z = Math.sin(a) * d;
    if (!free(x, z, 0.5) || (x > 14 && z > -6 && z < 28) || col.circles.some((c) => Math.hypot(c.x - x, c.z - z) < 3.4)) continue;
    tree(kit, x, z, rr(0.9, 1.35), rnd() < 0.35 ? 'pine' : 'round');
    n++;
  }
  for (let i = 0, n = 0; i < 600 && n < 34; i++) {
    const x = rr(-38, 38),
      z = rr(-38, 38);
    if (!free(x, z)) continue;
    bush(kit, x, z, rr(0.8, 1.3));
    n++;
  }
  for (let i = 0, n = 0; i < 400 && n < 14; i++) {
    const x = rr(-36, 36),
      z = rr(-36, 36);
    if (!free(x, z, 0.5)) continue;
    rock(kit, x, z, rr(0.7, 1.3));
    n++;
  }
  for (const [x, z] of [[-4, 26], [4, 20], [-4, 14], [4, -10], [-3, -16], [-11, 5], [11, 5], [15, -14]]) lamp(kit, x, z);

  /* cerca do limite e morros ao longe */
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2,
      a2 = ((i + 1) / 48) * Math.PI * 2,
      r = EDGE + 0.5,
      x = ((Math.cos(a) + Math.cos(a2)) / 2) * r,
      z = ((Math.sin(a) + Math.sin(a2)) / 2) * r;
    if (Math.abs(x) < 5 && z > 30) continue;
    if (worldOut(x, z) < -0.5) continue; // aberto para o Lago Grande
    fence(kit, x, z, -(a + a2) / 2 + Math.PI / 2, 2 * r * Math.sin(Math.PI / 48));
  }
  setSeed(5);
  for (let i = 0; i < 64; i++) {
    // morros em volta do acampamento e do Lago Grande, sempre fora da área de jogo
    const west = i >= 34,
      a = west ? Math.PI * 0.5 + ((i - 34) / 30) * Math.PI + rr(-0.04, 0.04) : (i / 34) * Math.PI * 2 + rr(-0.05, 0.05),
      d = west ? rr(1.35, 1.7) : rr(72, 96),
      s = rr(10, 22);
    const cx = west ? -70 + Math.cos(a) * 49 * d : Math.cos(a) * d,
      cz = west ? 4 + Math.sin(a) * 46 * d : Math.sin(a) * d;
    if (worldOut(cx, cz) < s * 0.9 + 6) continue;
    FAR.add(new THREE.ConeGeometry(s, s * rr(0.55, 0.9), 6), [0x6f9a5c, 0x5f8c58, 0x7da868, 0x8ab07a][i % 4], cx, s * 0.3 - 3 + Math.max(0, H(cx, cz) - 2) * 0.5, cz, rnd(), 0, 0, 1, 0.05);
  }
  for (let i = 0; i < 90; i++) {
    const a = rnd() * Math.PI * 2,
      d = rr(52, 66),
      west = i >= 40,
      x = west ? -70 + Math.cos(a) * rr(56, 66) : Math.cos(a) * d,
      z = west ? 4 + Math.sin(a) * rr(53, 62) : Math.sin(a) * d,
      s = rr(1.1, 1.8);
    if (worldOut(x, z) < 6) continue;
    FAR.add(geoBox(2.6, 2, 2.6, 0.3), LEAF[i % 4], x, H(x, z) + 2.2 * s, z, rnd(), 0, 0, s, 0.05);
    FAR.add(geoBox(0.6, 2, 0.6, 0), WOOD, x, H(x, z) + 0.8 * s, z, 0, 0, 0, s, 0);
  }

  /* Clareira das Tendas: uma tenda por classe, com emblema oficial e placa */
  CLASSES.forEach((k, i) => {
    const { a, x, z } = tentSpot(i),
      ry = -a,
      y = H(x, z);
    B.add(new THREE.ConeGeometry(3, 3.1, 4, 1), k.c, x, y + 1.55, z, ry + Math.PI / 4, 0, 0, 1, 0.02);
    B.add(new THREE.ConeGeometry(1.05, 1.9, 3, 1), 0x2a2230, x + Math.sin(ry) * 1.6, y + 0.95, z + Math.cos(ry) * 1.6, ry, 0, 0, [1, 1, 0.25], 0);
    B.box(0.16, 3.6, 0.16, WOOD_DARK, x, y + 1.8, z);
    B.box(3.6, 0.18, 3.6, 0xe8dcc0, x, y + 0.09, z, { ry: ry + Math.PI / 4 });
    col.solid(x, z, 3.3, 3.3, y + 3);
    const sx = x + Math.sin(ry) * 3.2,
      sz = z + Math.cos(ry) * 3.2,
      sy = H(sx, sz);
    B.box(0.2, 1.7, 0.2, WOOD_DARK, sx - Math.cos(ry) * 0.7, sy + 0.85, sz + Math.sin(ry) * 0.7);
    B.box(0.2, 1.7, 0.2, WOOD_DARK, sx + Math.cos(ry) * 0.7, sy + 0.85, sz - Math.sin(ry) * 0.7);
    B.box(1.9, 1.9, 0.14, 0xf6f0e2, sx, sy + 1.9, sz, { ry, r: 0.06 });
    decal(k.k, 1.5, sx + Math.sin(ry) * 0.08, sy + 2.05, sz + Math.cos(ry) * 0.08, ry);
    plate(k.n, 1.8, 0.36, '#' + new THREE.Color(k.c).getHexString(), '#fff', sx + Math.sin(ry) * 0.09, sy + 1.06, sz + Math.cos(ry) * 0.09, ry);
    inter.add({ x: sx, z: sz, w: 2.4, h: 3, name: 'Tenda dos ' + k.n, label: 'Ver a tenda', who: 'Clube de Aventureiros', text: `Classe para crianças de ${k.age} anos. O símbolo comunica ${k.d}` });
  });

  /* mastro e bandeira do Clube (tremula no shader) */
  {
    const { x, z } = FLAG,
      y = H(x, z);
    B.box(0.9, 0.5, 0.9, STONE, x, y + 0.25, z, { r: 0.12 });
    B.box(0.22, 8.4, 0.22, 0xeeeeee, x, y + 4.4, z, { r: 0.08 });
    B.box(0.4, 0.4, 0.4, 0xd7a64d, x, y + 8.7, z, { r: 0.18 });
    col.solid(x, z, 0.9, 0.9, y + 8);
    const a1 = new Image();
    a1.src = EMB.a1.src;
    const t = canvasTex(600, 400, () => {});
    const draw = () => {
      const g = (t.image as HTMLCanvasElement).getContext('2d');
      if (!g) return;
      g.fillStyle = '#6E2638';
      g.fillRect(0, 0, 300, 200);
      g.fillRect(300, 200, 300, 200);
      g.fillStyle = '#fff';
      g.fillRect(300, 0, 300, 200);
      g.fillRect(0, 200, 300, 200);
      const eh = 150,
        ew = (eh * EMB.a1.w) / EMB.a1.h;
      if (a1.complete && a1.naturalWidth) g.drawImage(a1, 300 - ew / 2, 200 - eh / 2, ew, eh);
      g.fillStyle = '#fff';
      g.font = `28px ${FONT}`;
      g.textAlign = 'right';
      g.fillText('NOME DO CLUBE', 585, 380);
      t.needsUpdate = true;
    };
    a1.onload = draw;
    void document.fonts?.ready.then(draw);
    const geo = new THREE.PlaneGeometry(3, 2, 16, 1);
    geo.translate(1.5, 0, 0);
    const m = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.8 });
    m.onBeforeCompile = (s) => {
      s.uniforms.uT = uTime;
      s.vertexShader =
        'uniform float uT;\n' +
        s.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nfloat k=position.x/3.;transformed.z+=sin(position.x*2.2-uT*4.)*.18*k;transformed.y+=sin(position.x*1.7-uT*3.)*.05*k;',
        );
    };
    const f = new THREE.Mesh(geo, m);
    f.position.set(x + 0.12, y + 7.3, z);
    f.castShadow = true;
    scene.add(f);
    inter.add({
      x,
      z,
      w: 2,
      h: 4,
      name: 'Bandeira do Clube',
      label: 'Ver a bandeira',
      who: 'Clube de Aventureiros',
      text: 'Quatro retângulos iguais, dois vinho e dois brancos, com o emblema no centro e o nome do Clube no canto. Aqui vai aparecer o nome do seu clube.',
    });
  }

  /* fogueira com bancos de tronco */
  {
    const y = H(0, 1);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      B.box(0.55, 0.4, 0.5, 0x8d8a82, Math.cos(a) * 1.05, y + 0.2, 1 + Math.sin(a) * 1.05, { r: 0.15, ry: a });
    }
    for (const a of [0, 1.05, 2.1]) B.box(1.5, 0.28, 0.28, 0x6b4226, 0, y + 0.3, 1, { ry: a, r: 0.08 });
    col.solid(0, 1, 2.2, 2.2, y + 0.4);
    const flame = new THREE.Group();
    flame.position.set(0, y + 0.35, 1);
    for (const [r, h, c] of [[0.55, 1.2, 0xff7a1a], [0.38, 0.9, 0xffb02e], [0.22, 0.6, 0xfff1a8]]) {
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 5), new THREE.MeshBasicMaterial({ color: c }));
      m.position.y = h / 2;
      flame.add(m);
    }
    scene.add(flame);
    fireFlame = flame;
    const light = new THREE.PointLight(0xffa040, 6, 10, 1.6);
    fireLight = light;
    light.position.set(0, y + 1.4, 1);
    scene.add(light);
    for (const [x, z, side] of [[0, 4.3, false], [-3.3, 1, true], [3.3, 1, true]] as [number, number, boolean][]) {
      const yy = H(x, z),
        w = side ? 0.6 : 2.6,
        d = side ? 2.6 : 0.6;
      B.box(w, 0.45, d, 0x7b4e2c, x, yy + 0.32, z, { r: 0.12 });
      col.solid(x, z, w, d, yy + 0.55);
    }
    animated.push((_dt, t) => {
      if (!flame.visible) return (light.intensity = 0);
      flame.children.forEach((f, i) => f.scale.set(1 + Math.sin(t * 9 + i) * 0.08, 1 + Math.sin(t * 11 + i * 2) * 0.15, 1 + Math.cos(t * 8 + i) * 0.08));
      light.intensity = 5.5 + Math.sin(t * 13) * 0.8 + Math.sin(t * 7.3) * 0.6;
    });
  }

  /* Mesa da Família */
  {
    const x = -9,
      z = 8,
      y = H(x, z);
    B.box(4.4, 0.22, 1.5, 0xa2724a, x, y + 1.05, z, { r: 0.06 });
    for (const [a, b] of [[-1.9, -0.55], [1.9, -0.55], [-1.9, 0.55], [1.9, 0.55]]) B.box(0.18, 1, 0.18, WOOD_DARK, x + a, y + 0.5, z + b);
    for (const b of [-1.25, 1.25]) {
      B.box(4.2, 0.18, 0.5, 0x9a6a40, x, y + 0.6, z + b, { r: 0.05 });
      col.solid(x, z + b, 4.2, 0.5, y + 0.69);
    }
    col.solid(x, z, 4.4, 1.5, y + 1.16);
    for (let i = 0; i < 4; i++) {
      const px = x - 1.5 + i;
      B.box(0.5, 0.05, 0.5, 0xffffff, px, y + 1.19, z - 0.35, { r: 0.02 });
      B.box(0.22, 0.28, 0.22, [0x6e2638, 0x25aae1, 0xf26522, 0x66845b][i], px + 0.1, y + 1.3, z + 0.35, { r: 0.05 });
    }
    B.box(0.5, 0.4, 0.4, 0xd9a24c, x, y + 1.36, z, { r: 0.12 });
    inter.add({ id: 'table', x, z, w: 4.6, h: 2, name: 'Mesa da Família', label: 'Ver a mesa', who: 'Clube de Aventureiros', text: 'Na Mesa da Família acontecem as missões feitas junto com a família.' });
  }

  /* placas das quatro trilhas */
  {
    const x = 2.4,
      z = 11,
      y = H(x, z);
    B.box(0.3, 3.6, 0.3, WOOD_DARK, x, y + 1.8, z, { r: 0.06 });
    col.solid(x, z, 0.4, 0.4, y + 3.6);
    const arrow = new THREE.Shape();
    arrow.moveTo(0, -0.24);
    arrow.lineTo(2, -0.24);
    arrow.lineTo(2.35, 0);
    arrow.lineTo(2, 0.24);
    arrow.lineTo(0, 0.24);
    const ag = new THREE.ExtrudeGeometry(arrow, { depth: 0.12, bevelEnabled: false });
    ag.translate(0.1, 0, -0.06);
    const am = new THREE.MeshStandardMaterial({ color: 0x9a6a40, roughness: 0.8 });
    const trails: [string, string, number, number][] = [
      ['MEU DEUS', '#1d4f9c', 3.1, 0.5],
      ['MEU EU', '#2f8a3e', 2.55, -0.6],
      ['MINHA FAMÍLIA', '#6E2638', 2.0, 0.9],
      ['MEU MUNDO', '#c98f1f', 1.45, -1.2],
    ];
    for (const [t, c, h, ry] of trails) {
      const g = new THREE.Group();
      g.position.set(x, y + h, z);
      g.rotation.y = ry;
      scene.add(g);
      const m = new THREE.Mesh(ag, am);
      m.castShadow = true;
      g.add(m);
      plate(t, 1.9, 0.36, c, '#fff', 1.15, 0, 0.07, 0, { parent: g });
      plate(t, 1.9, 0.36, c, '#fff', 1.15, 0, -0.07, Math.PI, { parent: g });
    }
    inter.add({ x, z, w: 2.5, h: 4, name: 'As quatro trilhas', label: 'Ler as placas', who: 'Clube de Aventureiros', text: 'Meu Deus, Meu Eu, Minha Família e Meu Mundo. Cada missão do acampamento segue uma dessas trilhas.' });
  }

  /* bandeirolas da clareira */
  {
    const poles: [number, number][] = [[-7, -1], [-4.5, -6], [4.5, -6], [7, -1], [6, 6]];
    for (const [x, z] of poles) {
      B.box(0.2, 3.4, 0.2, WOOD_DARK, x, H(x, z) + 1.7, z);
      col.circle(x, z, 0.2, H(x, z) + 3.4);
    }
    for (let i = 0; i < poles.length - 1; i++) {
      const [a, b] = [poles[i], poles[i + 1]];
      bunting(kit, a[0], H(...a) + 3.3, a[1], b[0], H(...b) + 3.3, b[1], 8);
    }
  }

  const boat = new THREE.Group();
  let skyK = 0,
    skySet: (k: number) => void = () => {};
  let globeLit = 0,
    globeSet: (k: number) => void = () => {};
  /* Colina do Globo: Globo (apagado), Livro dos Sete Dias e Quadros dos Ideais */
  const HY = H(HILL.x, HILL.z);
  {
    const x = HILL.x,
      z = HILL.z - 1;
    for (let i = 0; i < 3; i++) B.box(3.6 - i * 0.9, 0.5, 3.6 - i * 0.9, i % 2 ? 0xd9d2c0 : 0xbdb6a6, x, HY + 0.25 + i * 0.5, z, { r: 0.1 });
    col.solid(x, z, 3.6, 3.6, HY + 1.5);
    const g = new THREE.Group();
    g.position.set(x, HY + 3.6, z);
    scene.add(g);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 2), new THREE.MeshStandardMaterial({ color: 0xd7a64d, emissive: 0xd7a64d, emissiveIntensity: 0.15, roughness: 0.4 }));
    g.add(core);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, emissive: 0xfff1b0, emissiveIntensity: 0, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, envMapIntensity: 2.2, depthWrite: false });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.75, 40, 24), glassMat));
    const glow = new THREE.PointLight(0xffe7a0, 0, 26, 1.2); // sempre visível: ver Daylight (recompilação)
    g.add(glow);
    globeSet = (k) => {
      globeLit = k;
      glassMat.emissiveIntensity = k * 0.9;
      glassMat.opacity = 0.28 + k * 0.3;
      glow.intensity = k * 30;
    };
    // Dia 2: o céu (cúpula azul com nuvens de bloco) em cima e as águas embaixo, dentro do vidro
    const skyMat = new THREE.MeshStandardMaterial({ color: 0x5fb3ff, emissive: 0x3f8fdc, emissiveIntensity: 0.6, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1.45, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2.3), skyMat);
    const seaMat = new THREE.MeshStandardMaterial({ color: 0x1f6fb8, emissive: 0x1f5f9e, emissiveIntensity: 0.5, transparent: true, opacity: 0, roughness: 0.2 });
    const sea = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.3, 0.26, 32), seaMat);
    sea.position.y = -0.95;
    const puffMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5, transparent: true, opacity: 0 });
    const puffs = new THREE.Group();
    for (const [px, py, pz, sc] of [[0.7, 0.95, 0.3, 0.32], [-0.6, 1.05, -0.4, 0.28], [0.1, 1.2, -0.7, 0.24], [-0.3, 0.9, 0.8, 0.26]]) {
      const c = new THREE.Mesh(new RoundedBoxGeometry(sc * 2, sc, sc * 1.3, 1, sc * 0.3), puffMat);
      c.position.set(px, py, pz);
      puffs.add(c);
    }
    const skyG = new THREE.Group();
    skyG.add(sky, sea, puffs);
    skyG.visible = false;
    g.add(skyG);
    skySet = (k) => {
      skyK = k;
      skyG.visible = k > 0;
      skyMat.opacity = k * 0.42;
      seaMat.opacity = k * 0.85;
      puffMat.opacity = k * 0.95;
      sky.scale.setScalar(0.6 + k * 0.4);
    };
    animated.push((dt) => {
      if (skyK > 0) puffs.rotation.y += dt * 0.25;
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.07, 8, 64), new THREE.MeshStandardMaterial({ color: 0xd7a64d, roughness: 0.35, metalness: 0.6 }));
    ring.rotation.x = Math.PI / 2.4;
    g.add(ring);
    inter.add({ id: 'globe', x, z, w: 3.6, h: 6, y: HY, name: 'Globo do Éden', label: 'Ver o Globo', who: 'Tico', text: 'O Globo do Éden está apagado. Ele vai se acender aos poucos, a cada dia da jornada.' });
    animated.push((dt, t) => {
      core.material.emissiveIntensity = 0.12 + Math.sin(t * 1.5) * 0.06 + globeLit * 2.2;
      ring.rotation.z += dt * 0.3;
      g.rotation.y += dt * 0.15;
    });
  }
  {
    const { x, z } = BOOK,
      y = H(x, z);
    B.box(0.5, 1.1, 0.5, WOOD_DARK, x, y + 0.55, z, { r: 0.06 });
    B.box(1.5, 0.12, 1, WOOD, x, y + 1.15, z, { rx: -0.35, r: 0.04 });
    for (const s of [-1, 1]) B.box(0.66, 0.08, 0.84, 0xfaf6ea, x + s * 0.36, y + 1.27, z + 0.02, { rx: -0.35, rz: s * 0.1, r: 0.03 });
    B.box(0.06, 0.1, 0.86, 0x6e2638, x, y + 1.27, z + 0.02, { rx: -0.35 });
    col.solid(x, z, 0.6, 0.6, y + 1.2);
    inter.add({ id: 'book', x, z, w: 1.6, h: 2.2, name: 'Livro dos Sete Dias', label: 'Ver o Livro', who: 'Tico', text: 'As páginas do Livro dos Sete Dias sumiram! Cada missão vai ajudar a encontrá-las de novo.' });
  }
  /* Quadros apagados: os textos só entram de arquivo conferido (public/data/content/club-texts.json). */
  const idealBoards: { t: string; x: number; y: number; z: number; ry: number; off: THREE.Mesh; lit: THREE.Mesh | null; it: Interactable; dark: string }[] = [];
  const ideals: [string, string][] = [['Voto', 'Acende no Dia 2.'], ['Lei', 'Acende no Dia 3.'], ['Voto à Bíblia', 'Acende no Dia 7.'], ['Hino', 'Em breve.']];
  ideals.forEach(([t, w], i) => {
    const a = -0.95 + i * 0.63,
      r = 6.4,
      x = HILL.x + Math.sin(a) * r,
      z = HILL.z - 1 - Math.cos(a) * r * 0.75,
      y = H(x, z),
      ry = -a * 0.8;
    B.box(0.2, 2.2, 0.2, WOOD_DARK, x - Math.cos(ry) * 0.95, y + 1.1, z + Math.sin(ry) * 0.95);
    B.box(0.2, 2.2, 0.2, WOOD_DARK, x + Math.cos(ry) * 0.95, y + 1.1, z - Math.sin(ry) * 0.95);
    B.box(2.2, 1.6, 0.16, 0x7a5634, x, y + 1.9, z, { ry, r: 0.06 });
    col.solid(x, z, 2.2, 0.4, y + 2.7);
    const off = plate(t + '\n·  ·  ·', 1.85, 1.25, '#dcd3c0', '#8b8170', x + Math.sin(ry) * 0.09, y + 1.9, z + Math.cos(ry) * 0.09, ry, { fs: 44 });
    const dark = `Este quadro ainda está apagado. ${w} Quando acender, você poderá ler e ouvir o texto aqui.`;
    const it = inter.add({ id: 'ideal' + i, x, z, w: 2.4, h: 2.6, name: 'Quadro: ' + t, label: 'Ver o quadro', who: 'Quadros dos Ideais', text: dark });
    idealBoards.push({ t, x, y, z, ry, off, lit: null, it, dark });
  });

  /* portais: Jornada do Éden (aberto, leva aos sete dias) e Mundo 2 (trancado) */
  const portal = (x: number, z: number, c1: number, c2: number, title: string, open: boolean): Portal => {
    const y = H(x, z),
      g = new THREE.Group();
    g.position.set(x, y, z);
    scene.add(g);
    const st = open ? 0xe9e1cf : 0xd8c08c;
    for (let i = 0; i < 9; i++) {
      const a = (Math.PI * i) / 8;
      B.box(1, 1, 0.9, i % 2 ? st : 0xcfc4a8, x + Math.cos(a) * 2.4, y + 2.4 + Math.sin(a) * 2.4, z, { rz: a, r: 0.12 });
    }
    for (const dx of [-2.4, 2.4]) {
      B.box(1.1, 2.4, 1, st, x + dx, y + 1.2, z, { r: 0.12 });
      col.solid(x + dx, z, 1.1, 1, y + 2.4);
    }
    B.box(6.4, 0.3, 2.6, 0xbdb6a6, x, y + 0.15, z, { r: 0.08 });
    const m = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: { uT: uTime, a: { value: new THREE.Color(c1) }, b: { value: new THREE.Color(c2) }, op: { value: open ? 1 : 0.45 } },
      vertexShader: 'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uT,op;uniform vec3 a,b;varying vec2 vU;
void main(){vec2 p=vU*2.-1.;float r=length(p);if(r>1.)discard;float an=atan(p.y,p.x);float s=sin(an*5.+r*10.-uT*3.)*.5+.5;
vec3 c=mix(a,b,s*(1.-r));c+=pow(1.-r,3.)*.7;float al=(1.-smoothstep(.85,1.,r))*(.55+.35*s)*op;gl_FragColor=vec4(c,al);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.95, 48), m);
    disc.position.y = 2.4;
    disc.scale.y = 1.18;
    g.add(disc);
    plate(title, 4.2, 0.62, open ? '#172D49' : '#6b5a3c', '#ffe9b0', 0, 5.6, 0.47, 0, { parent: g, border: '#D7A64D' });
    const sp = fx.sparkles(x, y + 2.4, z, open ? 0xfff1b0 : 0xe8c98a, open ? 40 : 16, 2.2);
    if (!open) {
      const lock = new THREE.Group();
      lock.position.set(0, 2.4, 0.6);
      g.add(lock);
      const lm = new THREE.MeshStandardMaterial({ color: 0xd7a64d, metalness: 0.6, roughness: 0.35 });
      lock.add(new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.75, 0.3, 2, 0.1), lm));
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 8, 16, Math.PI), lm);
      shackle.position.y = 0.38;
      lock.add(shackle);
    }
    return { x, z, y, open, sp };
  };
  const portals = [portal(-9, -19, 0x7fd4ff, 0xfff1a8, 'Jornada do Éden', true), portal(10, -19, 0xf2c46d, 0xc98a3c, 'Mundo 2', false)];
  {
    // miniatura do próximo mundo: pirâmide e palmeira
    const x = 14.2,
      z = -17.2,
      y = H(x, z);
    for (let i = 0; i < 4; i++) B.box(2.4 - i * 0.6, 0.5, 2.4 - i * 0.6, 0xe3c27a, x, y + 0.25 + i * 0.5, z, { r: 0.04 });
    col.solid(x, z, 2.4, 2.4, y + 1);
    const px = 6,
      pz = -17,
      py = H(px, pz);
    for (let i = 0; i < 5; i++) B.box(0.32, 0.6, 0.32, 0xa77a48, px + i * 0.05, py + 0.3 + i * 0.58, pz, { r: 0.06 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      B.box(1.6, 0.12, 0.5, 0x5aa34c, px + 0.2 + Math.cos(a) * 0.75, py + 3, pz + Math.sin(a) * 0.75, { ry: -a, rz: -0.35, r: 0.04 });
    }
    col.circle(px, pz, 0.3, py + 3);
  }

  /* Lago: cais, barco, vitórias-régias, juncos e plantas no fundo */
  {
    const z = LAKE.z + 1,
      x0 = -14.5,
      x1 = -22.5,
      y = WY + 0.42;
    for (let x = x0; x >= x1; x -= 0.62) B.box(0.56, 0.14, 2.2, 0xb4875a, x, y, z, { r: 0.03, j: 0.08 });
    for (let x = x0; x >= x1 - 0.1; x -= 2) for (const s of [-1, 1]) B.box(0.24, 2.6, 0.24, 0x6b4a2e, x, y - 1, z + s * 1.05, { r: 0.05 });
    col.boxes.push({ x0: x1 - 0.3, x1: x0 + 0.3, z0: z - 1.1, z1: z + 1.1, top: y + 0.07 });
    for (const s of [-1, 1]) {
      for (let x = x0; x >= x1; x -= 2) B.box(0.14, 0.7, 0.14, 0x6b4a2e, x, y + 0.42, z + s * 1.05);
      B.box(Math.abs(x1 - x0), 0.12, 0.1, 0x8a6040, (x0 + x1) / 2, y + 0.78, z + s * 1.05);
    }
    // galeão da Capitã Marina, amarrado no cais do Lago Grande (o casco é comprido em x)
    boat.position.set(BOAT_HOME.x, WY + 0.02, BOAT_HOME.z);
    boat.rotation.y = BOAT_HOME.ry - Math.PI / 2;
    scene.add(boat);
    const gal = makeGalleon();
    boat.add(gal.root);
    let last = { x: boat.position.x, z: boat.position.z, v: 0 };
    animated.push((dt, t) => {
      const v = Math.hypot(boat.position.x - last.x, boat.position.z - last.z) / Math.max(dt, 1e-3);
      last = { x: boat.position.x, z: boat.position.z, v: last.v + (v - last.v) * 0.1 };
      gal.update(t, last.v);
    });
    animated.push((_dt, t) => {
      boat.position.y = WY + 0.02 + Math.sin(t * 1.3) * 0.05;
      gal.root.rotation.x = Math.sin(t * 1.1) * 0.025;
    });
    setSeed(33);
    const pad = new THREE.CylinderGeometry(0.62, 0.62, 0.06, 10);
    for (let i = 0; i < 11; i++) {
      const a = rnd() * Math.PI * 2,
        d = rr(3, 8),
        px = LAKE.x + Math.cos(a) * d,
        pz = LAKE.z + Math.sin(a) * d * 0.9;
      if (Math.abs(pz - LAKE.z - 1) < 1.6 && px > x1 - 1) continue;
      B.add(pad, 0x4f9a4a, px, WY + 0.04, pz, rnd() * 6, 0, 0, 1, 0.06);
      if (rnd() < 0.4) B.box(0.22, 0.16, 0.22, 0xf6a9c8, px + 0.15, WY + 0.12, pz, { r: 0.07 });
      col.boxes.push({ x0: px - 0.5, x1: px + 0.5, z0: pz - 0.5, z1: pz + 0.5, top: WY + 0.07 });
    }
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2,
        d = rr(9.2, 10.6),
        px = LAKE.x + Math.cos(a) * d,
        pz = LAKE.z + Math.sin(a) * d * 0.9;
      if (Math.abs(pz - LAKE.z - 1) < 2 && px > -23) continue;
      const yy = H(px, pz);
      for (let k = 0; k < 3; k++) B.box(0.08, rr(0.8, 1.4), 0.08, 0x5c8a3a, px + rr(-0.2, 0.2), yy + 0.5, pz + rr(-0.2, 0.2), { rz: rr(-0.15, 0.15) });
      if (rnd() < 0.5) B.box(0.13, 0.36, 0.13, 0x6b4426, px, yy + 1.1, pz, { r: 0.05 });
    }
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2,
        d = rr(1, 6),
        px = LAKE.x + Math.cos(a) * d,
        pz = LAKE.z + Math.sin(a) * d * 0.9,
        yy = H(px, pz);
      for (let k = 0; k < 3; k++) B.box(0.14, rr(0.6, 1.5), 0.1, 0x3d8c5c, px + k * 0.15, yy + 0.5, pz, { rz: rr(-0.2, 0.2) });
    }
    rock(kit, LAKE.x + 3, LAKE.z - 2.5, 0.8, false);
    rock(kit, LAKE.x - 2, LAKE.z + 3, 1, false);
  }

  /* Observatório: degraus para praticar o pulo e plataforma com telescópio */
  {
    const { x, z } = OBSERVATORY,
      y = H(x, z);
    for (const [dx, dz, k] of OBS_STEPS) {
      const t = y + k;
      B.box(1.6, t - y + 0.1, 1.6, k % 2 ? 0xd2c3a0 : 0xc1b08a, x + dx, (t + y) / 2, z + dz, { r: 0.1 });
      col.solid(x + dx, z + dz, 1.6, 1.6, t + 0.05);
    }
    for (const [a, b] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
      B.box(0.4, 5, 0.4, 0x7a5634, x + a, y + 2.5, z + b, { r: 0.06 });
      col.solid(x + a, z + b, 0.4, 0.4, y + 4.9);
    }
    B.box(4.2, 0.35, 4.2, 0x9a6a40, x, y + 5.05, z, { r: 0.08 });
    col.boxes.push({ x0: x - 2.1, x1: x + 2.1, z0: z - 2.1, z1: z + 2.1, top: y + 5.22 });
    for (const [a, b] of [[0, -2], [0, 2], [2, 0]]) B.box(a ? 0.12 : 4.2, 0.8, b ? 0.12 : 4.2, 0x7a5634, x + a, y + 5.6, z + b);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 0.5, metalness: 0.15 }));
    dome.position.set(x + 0.6, y + 5.22, z + 0.6);
    dome.castShadow = true;
    scene.add(dome);
    const tel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2, 12), new THREE.MeshStandardMaterial({ color: 0x172d49, roughness: 0.35, metalness: 0.5 }));
    tel.position.set(x + 0.9, y + 6.5, z + 0.9);
    tel.rotation.set(-0.6, 0, 0.5);
    tel.castShadow = true;
    scene.add(tel);
    plate('Observatório', 2.4, 0.45, '#172D49', '#ffe9b0', x, y + 4.4, z + 2.15, 0, { border: '#D7A64D' });
    inter.add({
      x: x - 1,
      z: z - 1,
      y: y + 5.2,
      w: 2.6,
      h: 2.5,
      name: 'Observatório',
      label: 'Olhar o céu',
      who: 'Tico',
      text: 'Daqui de cima dá para ver o acampamento inteiro! Mais tarde, à noite, este telescópio vai mostrar as estrelas.',
    });
  }

  /* Mata: cogumelos, troncos caídos e tocos dourados (marretada solta moedas) */
  setSeed(77);
  for (let i = 0; i < 14; i++) {
    const x = rr(16, 36),
      z = rr(-4, 26);
    if (!free(x, z)) continue;
    const y = H(x, z);
    B.box(0.18, 0.4, 0.18, 0xf3ead6, x, y + 0.2, z);
    B.box(0.5, 0.26, 0.5, rnd() < 0.5 ? 0xd8463c : 0xe8a23c, x, y + 0.48, z, { r: 0.12 });
    B.box(0.1, 0.1, 0.1, 0xffffff, x + 0.12, y + 0.62, z + 0.1);
  }
  for (const [x, z, r] of [[20, 14, 0], [30, 4, 1.2], [26, 22, 0.4]]) {
    const y = H(x, z);
    B.add(new THREE.CylinderGeometry(0.55, 0.55, 3.6, 10), 0x7b5434, x, y + 0.5, z, r, 0, Math.PI / 2, 1, 0.04);
    col.solid(x, z, r > 0.6 ? 1.4 : 3.6, r > 0.6 ? 3.6 : 1.1, y + 1.02);
  }
  const stumps: Stump[] = ([[18.5, 10], [31, 15], [-12, -4]] as [number, number][]).map(([x, z]) => {
    const y = H(x, z);
    B.add(new THREE.CylinderGeometry(0.9, 1, 1, 12), 0x8a5a34, x, y + 0.5, z, 0, 0, 0, 1, 0);
    B.add(new THREE.CylinderGeometry(0.82, 0.82, 0.05, 12), 0xe8c27a, x, y + 1.01, z, 0, 0, 0, 1, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffd85c }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y + 1.06, z);
    scene.add(ring);
    col.solid(x, z, 1.8, 1.8, y + 1.02);
    return { x, z, y: y + 1.02, ring, used: false };
  });
  animated.push((_dt, t) => stumps.forEach((s) => s.used || s.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08)));

  /* lampião central (Dia 1, etapa 4) */
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff1c0, emissive: 0xffd27a, emissiveIntensity: 0, roughness: 0.4 });
  const lampLight = new THREE.PointLight(0xffd690, 0, 20, 1.3); // sempre visível, intensidade 0 apagado
  {
    const { x, z } = CENTRAL_LAMP,
      y = H(x, z);
    B.box(0.5, 0.4, 0.5, STONE, x, y + 0.2, z, { r: 0.1 });
    B.box(0.26, 3.6, 0.26, WOOD_DARK, x, y + 2, z, { r: 0.06 });
    B.box(0.9, 0.16, 0.9, 0x3a2a1c, x, y + 4.62, z, { r: 0.05 });
    B.box(0.9, 0.14, 0.9, 0x3a2a1c, x, y + 3.82, z, { r: 0.05 });
    const glass = new THREE.Mesh(geoBox(0.7, 0.66, 0.7, 0.08), lampMat);
    glass.position.set(x, y + 4.22, z);
    scene.add(glass);
    lampLight.position.set(x, y + 4.2, z);
    scene.add(lampLight);
    col.circle(x, z, 0.3, y + 4.7);
    inter.add({ id: 'lamp', off: true, x, z, w: 1.6, h: 5, name: 'Lampião central', label: 'Ver o lampião', who: 'Tico', text: 'O lampião central da clareira.' });
  }

  /* murais para os convites */
  const inviteMeshes: THREE.Mesh[] = [];
  const inviteTex = canvasTex(256, 320, (g) => {
    g.fillStyle = '#fffaf0';
    g.fillRect(0, 0, 256, 320);
    g.strokeStyle = '#6E2638';
    g.lineWidth = 14;
    g.strokeRect(10, 10, 236, 300);
    g.fillStyle = '#6E2638';
    g.font = `44px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('Convite', 128, 90);
    g.fillStyle = '#172D49';
    g.font = `800 26px Nunito, sans-serif`;
    ['Venha para o', 'Clube de', 'Aventureiros!'].forEach((l, i) => g.fillText(l, 128, 160 + i * 36));
    g.fillStyle = '#D7A64D';
    g.beginPath();
    g.arc(128, 278, 14, 0, Math.PI * 2);
    g.fill();
  });
  MURALS.forEach(([x, z, ry], mi) => {
    const y = H(x, z);
    inter.add({ id: 'mural' + mi, off: true, x: x + Math.sin(ry) * 1.2, z: z + Math.cos(ry) * 1.2, w: 2.8, h: 3, name: 'Mural ' + (mi + 1), label: 'Pendurar o convite', who: 'Acampante', text: '' });
    B.box(0.22, 2.6, 0.22, WOOD_DARK, x - Math.cos(ry) * 1.1, y + 1.3, z + Math.sin(ry) * 1.1);
    B.box(0.22, 2.6, 0.22, WOOD_DARK, x + Math.cos(ry) * 1.1, y + 1.3, z - Math.sin(ry) * 1.1);
    B.box(2.5, 1.7, 0.14, 0xc9a46c, x, y + 1.75, z, { ry, r: 0.05 });
    B.box(2.7, 0.18, 0.3, 0x7a5634, x, y + 2.68, z, { ry, r: 0.05 });
    col.solid(x, z, 2.4, 0.5, y + 2.6);
    const inv = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.06), new THREE.MeshStandardMaterial({ map: inviteTex, roughness: 0.8 }));
    inv.position.set(x + Math.sin(ry) * 0.09, y + 1.75, z + Math.cos(ry) * 0.09);
    inv.rotation.set(0, ry, 0.04);
    inv.visible = false;
    scene.add(inv);
    inviteMeshes.push(inv);
  });

  buildVegetation(scene, free);

  /* nuvens */
  let cloudMatRef: THREE.MeshStandardMaterial | null = null;
  const clouds: THREE.Group[] = [];
  setSeed(4);
  const cloudMat = (cloudMatRef = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.25 }));
  for (let i = 0; i < 11; i++) {
    const g = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(rr(3, 6), rr(1.6, 2.6), rr(3, 5), 2, 0.8), cloudMat);
      b.position.set(k * 2.2 - 3, rr(-0.3, 0.6), rr(-1, 1));
      g.add(b);
    }
    const a = rnd() * Math.PI * 2,
      d = rr(35, 110);
    g.position.set(Math.cos(a) * d, rr(26, 40), Math.sin(a) * d);
    g.scale.setScalar(rr(1, 1.8));
    scene.add(g);
    clouds.push(g);
  }
  animated.push((dt) =>
    clouds.forEach((c, i) => {
      c.position.x += dt * (0.4 + (i % 3) * 0.15);
      if (c.position.x > 130) c.position.x = -130;
    }),
  );

  const lakeB = buildBigLake(kit, scene, inter, fx, animated);

  const mat = staticMaterial();
  B.mesh(scene, mat);
  lakeB.mesh(scene, mat);
  const glowMat = withBuild(new THREE.MeshBasicMaterial({ vertexColors: true }));
  GLOW.mesh(scene, glowMat, false);
  FAR.mesh(scene, mat, false);

  return {
    terrain,
    water,
    col,
    inter,
    portals,
    stumps,
    update(dt, t) {
      for (const f of animated) f(dt, t);
    },
    setNight(n) {
      waterU.lit.value = 1 - n * 0.88;
      waterU.fn.value = FOG.near;
      waterU.ff.value = FOG.far;
      glowMat.color.setScalar(1 - n * 0.85); // lampiões quase apagados no escuro total
      if (fireFlame) fireFlame.visible = n < 0.5; // fogueira apagada à noite
      if (fireLight) fireLight.intensity = n < 0.5 ? 6 : 0; // apagar pela intensidade não recompila os materiais
      if (cloudMatRef) cloudMatRef.emissiveIntensity = 0.25 * (1 - n);
    },
    setGlobe: (k) => globeSet(k),
    setCentralLamp(k) {
      lampMat.emissiveIntensity = k * 3;
      lampLight.intensity = k * 22;
    },
    setInvite(i, on) {
      if (inviteMeshes[i]) inviteMeshes[i].visible = on;
    },
    boat,
    boatHome: BOAT_HOME,
    setIdeal(i, text) {
      const b = idealBoards[i];
      if (!b) return;
      if (text && !b.lit) {
        b.lit = plate(`${b.t}\n${wrapIdeal(text)}`, 1.85, 1.25, '#fff6dc', '#172D49', b.x + Math.sin(b.ry) * 0.1, b.y + 1.9, b.z + Math.cos(b.ry) * 0.1, b.ry, { border: '#D7A64D' });
        const m = b.lit.material as THREE.MeshStandardMaterial;
        m.emissive.set(0xfff1c0);
        m.emissiveMap = m.map;
        m.emissiveIntensity = 0.55;
      }
      if (b.lit) b.lit.visible = !!text;
      b.off.visible = !text;
      b.it.text = text ? text : b.dark;
      b.it.label = text ? 'Ler o quadro' : 'Ver o quadro';
    },
    idealSpot: (i) => ({ x: idealBoards[i].x, z: idealBoards[i].z, ry: idealBoards[i].ry }),
    setGlobeSky: (k) => skySet(k),
  };
}
