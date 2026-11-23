import { BREATH } from '../config/guidance';

/** Fôlego de 0 a 1. Debaixo d'água diminui; na superfície recarrega rápido. Nunca pune. */
export function breathStep(b: number, dt: number, underwater: boolean) {
  return underwater ? Math.max(0, b - dt / BREATH.seconds) : Math.min(1, b + dt / BREATH.refill);
}

/** Cor do círculo: azul, laranja perto da metade, vermelho depois da metade. */
export function breathColor(b: number) {
  const used = 1 - b;
  if (used < 0.4) return '#3aa0e0';
  if (used < 0.5) return '#f39a2b';
  return '#d92b2b';
}

/**
 * Fôlego em qualquer estado: em terra e no ar também recarrega (mais rápido), para o círculo encher
 * e sumir logo que a criança sai da água.
 */
export function breathOutside(b: number, dt: number) {
  return Math.min(1, b + dt / BREATH.refillLand);
}
