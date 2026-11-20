/**
 * Sons posicionais das faíscas do Dia 1 (sino, água corrente, grilo), sintetizados com Web Audio.
 * O volume cresce quando a criança se aproxima e o som vai para a esquerda ou direita conforme a câmera.
 * Opcional: sem som, as faíscas continuam visíveis e o Tico aponta o caminho.
 */
export type AmbientKind = 'bell' | 'water' | 'cricket';

interface Source {
  kind: AmbientKind;
  x: number;
  z: number;
  gain: GainNode;
  pan: StereoPannerNode;
  next: number;
  stop: () => void;
}

/** Volume pela distância: alto perto, some depois de ~32 m. Exportado para teste. */
export function loudness(d: number, reach = 32) {
  const k = Math.max(0, 1 - d / reach);
  return k * k;
}

export class Ambient {
  private ctx: AudioContext | null = null;
  private sources: Source[] = [];
  private noise: AudioBuffer | null = null;
  enabled = true;

  private audio() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    const len = this.ctx.sampleRate * 2,
      b = this.ctx.createBuffer(1, len, this.ctx.sampleRate),
      ch = b.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    this.noise = b;
    return this.ctx;
  }

  add(kind: AmbientKind, x: number, z: number) {
    try {
      const ctx = this.audio();
      void ctx.resume();
      const gain = ctx.createGain(),
        pan = ctx.createStereoPanner();
      gain.gain.value = 0;
      gain.connect(pan).connect(ctx.destination);
      let stop = () => {};
      if (kind === 'water' && this.noise) {
        // ruído filtrado com ondulação lenta = água corrente
        const src = ctx.createBufferSource(),
          bp = ctx.createBiquadFilter(),
          lfo = ctx.createOscillator(),
          lg = ctx.createGain();
        src.buffer = this.noise;
        src.loop = true;
        bp.type = 'bandpass';
        bp.frequency.value = 900;
        bp.Q.value = 0.8;
        lfo.frequency.value = 0.35;
        lg.gain.value = 400;
        lfo.connect(lg).connect(bp.frequency);
        src.connect(bp).connect(gain);
        src.start();
        lfo.start();
        stop = () => {
          src.stop();
          lfo.stop();
        };
      }
      this.sources.push({ kind, x, z, gain, pan, next: 0, stop });
    } catch {
      /* áudio indisponível */
    }
  }

  private ping(s: Source, ctx: AudioContext) {
    const t = ctx.currentTime;
    if (s.kind === 'bell') {
      for (const [f, v] of [[880, 0.5], [1760, 0.2], [2640, 0.08]]) {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
        o.connect(g).connect(s.gain);
        o.start(t);
        o.stop(t + 1.7);
      }
      s.next = t + 2.4;
    } else if (s.kind === 'cricket') {
      for (let i = 0; i < 4; i++) {
        const o = ctx.createOscillator(),
          g = ctx.createGain(),
          t0 = t + i * 0.07;
        o.type = 'square';
        o.frequency.value = 4400;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.12, t0 + 0.01);
        g.gain.linearRampToValueAtTime(0, t0 + 0.045);
        o.connect(g).connect(s.gain);
        o.start(t0);
        o.stop(t0 + 0.05);
      }
      s.next = t + 0.9 + Math.random() * 0.5;
    }
  }

  /** Atualiza volume e lado de cada som a partir da posição do jogador e da direção da câmera. */
  update(px: number, pz: number, yaw: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const s of this.sources) {
      const d = Math.hypot(s.x - px, s.z - pz);
      const v = this.enabled ? loudness(d) * (s.kind === 'water' ? 0.5 : 0.8) : 0;
      s.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
      // ângulo da fonte em relação à direção para onde a câmera olha
      const a = Math.atan2(s.x - px, s.z - pz) - (yaw + Math.PI);
      s.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, -Math.sin(a))), ctx.currentTime, 0.1);
      if (v > 0.001 && s.kind !== 'water' && ctx.currentTime >= s.next) this.ping(s, ctx);
    }
  }

  remove(kind: AmbientKind) {
    this.sources = this.sources.filter((s) => {
      if (s.kind !== kind) return true;
      s.gain.disconnect();
      s.stop();
      return false;
    });
  }

  clear() {
    for (const s of this.sources) {
      s.gain.disconnect();
      s.stop();
    }
    this.sources = [];
  }
}
