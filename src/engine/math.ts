export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** smoothstep entre a e b */
export const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** interpola ângulos pelo caminho mais curto */
export const angLerp = (a: number, b: number, t: number) => {
  let d = b - a;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return a + d * t;
};

/** Gerador pseudoaleatório com semente: o cenário sai igual em todo aparelho. */
let seed = 11;
export const setSeed = (s: number) => {
  seed = s;
};
export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
export const rr = (a: number, b: number) => a + (b - a) * rnd();
