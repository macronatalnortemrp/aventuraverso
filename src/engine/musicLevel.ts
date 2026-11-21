/** Onde a criança está: normal, alguém falando, ou lendo a Bíblia / respondendo pergunta. */
export type MusicContext = 'normal' | 'speech' | 'reading';

/** Volume relativo do loop (docs/superpowers/specs/2026-11-21-trilha-sonora-design.md, seção 3). */
export function musicLevel(ctx: MusicContext, stinging: boolean): number {
  const base = ctx === 'reading' ? 0.15 : ctx === 'speech' ? 0.4 : 1;
  return stinging ? Math.min(base, 0.3) : base;
}
