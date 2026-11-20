import * as THREE from 'three';

export type EmblemKey = 'a1' | 'la1' | 'abe' | 'lum' | 'edi' | 'mao' | 'macro';

/**
 * Emblemas oficiais: cópias reduzidas de public/assets/official (mesma proporção, sem alteração).
 * Caminho relativo ao documento, então funciona no Pages (/aventuraverso/) e no dev.
 */
export const EMB: Record<EmblemKey, { src: string; w: number; h: number }> = {
  a1: { src: 'assets/official/web/a1.webp', w: 236, h: 220 },
  la1: { src: 'assets/official/web/la1.webp', w: 320, h: 227 },
  abe: { src: 'assets/official/web/abe.webp', w: 200, h: 200 },
  lum: { src: 'assets/official/web/lum.webp', w: 200, h: 200 },
  edi: { src: 'assets/official/web/edi.webp', w: 200, h: 200 },
  mao: { src: 'assets/official/web/mao.webp', w: 200, h: 200 },
  macro: { src: 'assets/official/web/macro.webp', w: 215, h: 220 },
};

export const FONT = '"Fredoka","Trebuchet MS",sans-serif';

/** Onde decalques e placas entram quando nenhum pai é informado. */
export const ROOT: { o: THREE.Object3D } = { o: new THREE.Object3D() };

const loader = new THREE.TextureLoader();
const cache = new Map<EmblemKey, THREE.Texture>();

export function tex(k: EmblemKey) {
  let t = cache.get(k);
  if (!t) {
    t = loader.load(EMB[k].src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    cache.set(k, t);
  }
  return t;
}

/** Emblema oficial como decalque plano, com a proporção original da imagem. */
export function decal(k: EmblemKey, h: number, x: number, y: number, z: number, ry = 0, parent: THREE.Object3D = ROOT.o) {
  const i = EMB[k],
    w = (h * i.w) / i.h;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: tex(k), transparent: true, alphaTest: 0.04, roughness: 0.7 }),
  );
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (g) draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export interface PlateOpts {
  border?: string;
  fs?: number;
  parent?: THREE.Object3D;
}

/** Placa com texto (nome de tenda, trilha, portal). Diminui a fonte até caber. */
export function plate(txt: string, w: number, h: number, bg: string, fg: string, x: number, y: number, z: number, ry = 0, o: PlateOpts = {}) {
  const px = 128;
  const t = canvasTex(Math.round(w * px), Math.round(h * px), (g, W, Hh) => {
    g.fillStyle = bg;
    const r = Hh * 0.18;
    g.beginPath();
    g.roundRect(0, 0, W, Hh, r);
    g.fill();
    if (o.border) {
      g.lineWidth = Hh * 0.08;
      g.strokeStyle = o.border;
      g.beginPath();
      g.roundRect(g.lineWidth / 2, g.lineWidth / 2, W - g.lineWidth, Hh - g.lineWidth, r);
      g.stroke();
    }
    g.fillStyle = fg;
    const lines = txt.split('\n');
    let fs = o.fs || ((Hh * 0.5) / lines.length) * 1.15;
    g.font = `600 ${fs}px ${FONT}`;
    while (lines.some((l) => g.measureText(l).width > W * 0.9) && fs > 8) {
      fs -= 2;
      g.font = `600 ${fs}px ${FONT}`;
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, W / 2, Hh / 2 + (i - (lines.length - 1) / 2) * fs * 1.15));
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, transparent: true }));
  m.position.set(x, y, z);
  m.rotation.y = ry;
  (o.parent || ROOT.o).add(m);
  return m;
}

/** Textura radial para faíscas e poeira. */
export function radialTex(stops: [number, string][]) {
  return canvasTex(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    stops.forEach(([p, c]) => r.addColorStop(p, c));
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  });
}
