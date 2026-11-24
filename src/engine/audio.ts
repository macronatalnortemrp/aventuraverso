/** Efeitos sintetizados com Web Audio. Opcionais: o jogo nunca depende de som. */
import { sharedAudio } from './audioContext';
export type Sfx = 'coin' | 'jump' | 'jump2' | 'dive' | 'pound' | 'splash' | 'ui' | 'yay' | 'plim' | 'page' | 'horn';

let enabled = true;

export const setSoundEnabled = (on: boolean) => {
  enabled = on;
};

export function sfx(k: Sfx) {
  if (!enabled) return;
  try {
    const ctx = sharedAudio();
    if (!ctx) return;
    const t = ctx.currentTime,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    const tone = (type: OscillatorType, f1: number, f2: number, d: number, v = 0.12) => {
      o.type = type;
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.start(t);
      o.stop(t + d + 0.02);
    };
    if (k === 'coin') {
      tone('sine', 988, 1976, 0.18, 0.13);
      const o2 = ctx.createOscillator(),
        g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.type = 'sine';
      o2.frequency.setValueAtTime(1319, t + 0.07);
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.setValueAtTime(0.11, t + 0.07);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o2.start(t);
      o2.stop(t + 0.32);
    } else if (k === 'jump') tone('triangle', 330, 660, 0.16);
    else if (k === 'jump2') tone('triangle', 330, 990, 0.24);
    else if (k === 'dive') tone('triangle', 600, 300, 0.25);
    else if (k === 'pound') tone('sine', 160, 40, 0.35, 0.3);
    else if (k === 'splash') tone('sawtooth', 300, 80, 0.25, 0.05);
    else if (k === 'ui') tone('sine', 660, 880, 0.08, 0.08);
    else if (k === 'yay') tone('square', 523, 1046, 0.4, 0.06);
    else if (k === 'plim') tone('sine', 1320, 1980, 0.16, 0.09);
    else if (k === 'page') tone('triangle', 520, 1560, 0.5, 0.07);
    else if (k === 'horn') tone('square', 233, 220, 0.45, 0.05); // buzina do barco
  } catch {
    /* áudio indisponível */
  }
}
