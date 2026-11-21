/**
 * O Caminho da Luz: trajetória real do feixe no plano do topo da ilha (coordenadas locais u, v).
 * Reflexão geométrica: r = d - 2 (d·n) n, com n a normal do espelho. Sem Three.js: testável no Node.
 */

export interface Vec {
  u: number;
  v: number;
}

/** Retângulo que bloqueia a luz (pedra, coluna). */
export interface Block {
  u: number;
  v: number;
  /** meia largura e meia profundidade */
  hu: number;
  hv: number;
}

export interface Puzzle {
  /** fonte de luz e direção do feixe (graus; 0 = +u, 90 = +v) */
  source: Vec & { dir: number };
  /** suportes fixos onde os espelhos encaixam */
  supports: Vec[];
  blocks: Block[];
  receiver: Vec;
  /** solução conhecida (ângulo de cada espelho, em graus), usada nos testes */
  solution: number[];
}

/** Espelho encaixado: suporte e ângulo da linha do espelho (graus, 0 a 180). */
export interface Mirror {
  support: number;
  angle: number;
}

export interface Trace {
  /** pontos do feixe, da fonte até onde ele para */
  points: Vec[];
  /** suportes atingidos, na ordem */
  hits: number[];
  /** o feixe chegou ao receptor */
  lit: boolean;
}

/** meio comprimento do espelho */
export const MIRROR_HALF = 0.6;
/** raio do receptor (tolerância: a criança não precisa de um ângulo exato) */
export const RECEIVER_R = 0.6;
/** meia largura do topo: o feixe some na borda */
export const TOP_HALF = 4.6;
/** cada toque gira o espelho este tanto */
export const STEP_DEG = 15;
const MAX_BOUNCES = 8;
const EPS = 1e-6;

const rad = (d: number) => (d * Math.PI) / 180;

/** Reflete a direção d na superfície de normal n (unitária). */
export function reflect(d: Vec, n: Vec): Vec {
  const k = 2 * (d.u * n.u + d.v * n.v);
  return { u: d.u - k * n.u, v: d.v - k * n.v };
}

/** Distância ao longo do raio até o segmento (a, b), ou Infinity. */
function raySegment(o: Vec, d: Vec, a: Vec, b: Vec) {
  const eu = b.u - a.u,
    ev = b.v - a.v,
    den = d.u * ev - d.v * eu;
  if (Math.abs(den) < EPS) return Infinity;
  const wu = a.u - o.u,
    wv = a.v - o.v,
    t = (wu * ev - wv * eu) / den,
    s = (wu * d.v - wv * d.u) / den;
  return t > EPS && s >= -EPS && s <= 1 + EPS ? t : Infinity;
}

/** Distância ao longo do raio até a caixa, ou Infinity (método das placas). */
function rayBlock(o: Vec, d: Vec, b: Block) {
  let t0 = -Infinity,
    t1 = Infinity;
  for (const [oc, dc, c, h] of [
    [o.u, d.u, b.u, b.hu],
    [o.v, d.v, b.v, b.hv],
  ]) {
    if (Math.abs(dc) < EPS) {
      if (oc < c - h || oc > c + h) return Infinity;
      continue;
    }
    let a = (c - h - oc) / dc,
      z = (c + h - oc) / dc;
    if (a > z) [a, z] = [z, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, z);
  }
  return t1 >= t0 && t1 > EPS ? Math.max(t0, EPS) : Infinity;
}

/** Distância até o círculo do receptor, ou Infinity. */
function rayCircle(o: Vec, d: Vec, c: Vec, r: number) {
  const wu = c.u - o.u,
    wv = c.v - o.v,
    t = wu * d.u + wv * d.v;
  if (t <= EPS) return Infinity;
  const pu = o.u + d.u * t - c.u,
    pv = o.v + d.v * t - c.v;
  return pu * pu + pv * pv <= r * r ? t : Infinity;
}

/** Até a borda do topo. */
function rayEdge(o: Vec, d: Vec) {
  let t = Infinity;
  for (const [oc, dc] of [
    [o.u, d.u],
    [o.v, d.v],
  ]) {
    if (dc > EPS) t = Math.min(t, (TOP_HALF - oc) / dc);
    else if (dc < -EPS) t = Math.min(t, (-TOP_HALF - oc) / dc);
  }
  return t;
}

export function mirrorEnds(p: Vec, angle: number): [Vec, Vec] {
  const a = rad(angle),
    cu = Math.cos(a) * MIRROR_HALF,
    cv = Math.sin(a) * MIRROR_HALF;
  return [
    { u: p.u - cu, v: p.v - cv },
    { u: p.u + cu, v: p.v + cv },
  ];
}

/** Calcula o caminho do feixe com os espelhos encaixados. */
export function trace(pz: Puzzle, mirrors: Mirror[]): Trace {
  let o: Vec = { u: pz.source.u, v: pz.source.v },
    d: Vec = { u: Math.cos(rad(pz.source.dir)), v: Math.sin(rad(pz.source.dir)) };
  const points: Vec[] = [{ ...o }],
    hits: number[] = [];
  let from = -1;
  for (let bounce = 0; bounce <= MAX_BOUNCES; bounce++) {
    let best = rayEdge(o, d),
      kind: 'edge' | 'block' | 'mirror' | 'receiver' = 'edge',
      which = -1;
    for (const b of pz.blocks) {
      const t = rayBlock(o, d, b);
      if (t < best) [best, kind] = [t, 'block'];
    }
    for (const m of mirrors) {
      if (m.support === from) continue; // não reflete de novo no espelho de onde saiu
      const [a, b] = mirrorEnds(pz.supports[m.support], m.angle);
      const t = raySegment(o, d, a, b);
      if (t < best) [best, kind, which] = [t, 'mirror', m.support];
    }
    const tr = rayCircle(o, d, pz.receiver, RECEIVER_R);
    if (tr < best) [best, kind] = [tr, 'receiver'];
    const hit = { u: o.u + d.u * best, v: o.v + d.v * best };
    points.push(hit);
    if (kind !== 'mirror') return { points, hits, lit: kind === 'receiver' };
    hits.push(which);
    const m = mirrors.find((x) => x.support === which)!,
      a = rad(m.angle);
    d = reflect(d, { u: -Math.sin(a), v: Math.cos(a) });
    o = hit;
    from = which;
  }
  return { points, hits, lit: false };
}

/** Ângulo normalizado em [0, 180), sempre múltiplo do passo. */
export const turn = (angle: number, dir: 1 | -1) => (((angle + dir * STEP_DEG) % 180) + 180) % 180;
