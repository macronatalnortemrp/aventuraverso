/**
 * Um único AudioContext para trilha, efeitos e sons das faíscas, destravado no primeiro toque.
 *
 * iPhone e iPad (Safari): o Web Audio fica mudo com a chave lateral no silencioso e só começa a tocar
 * se o contexto for retomado dentro de um toque. O site não consegue saber a posição da chave, então o jogo
 * pede ao Safari a sessão de áudio de mídia (como um vídeo), que toca mesmo no silencioso:
 * - iOS 16.4 ou mais novo: `navigator.audioSession.type = 'playback'`;
 * - iOS mais antigo: um elemento <audio> com silêncio em laço, que coloca a página na mesma categoria.
 * O volume continua nos botões do aparelho e nos botões Som e Música do jogo.
 */

type Ctor = typeof AudioContext;
let ctx: AudioContext | null = null;
let keepAlive: HTMLAudioElement | null = null;
let unlocked = false;
let hidden = false;

const AC = (): Ctor | null => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext || null;
};

/** O contexto compartilhado (criado na primeira chamada). Nulo quando o aparelho não tem Web Audio. */
export function sharedAudio(): AudioContext | null {
  if (ctx) return ctx;
  const C = AC();
  if (!C) return null;
  try {
    ctx = new C();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** WAV curto de silêncio (gerado aqui, sem arquivo extra). */
function silentWav(seconds = 0.5, rate = 8000) {
  const n = Math.floor(seconds * rate),
    b = new ArrayBuffer(44 + n),
    v = new DataView(b);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n, true);
  str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true); // 8 bits
  str(36, 'data');
  v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128); // 128 = silêncio em 8 bits
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}

let silence: string | null = null;
/** Endereço de um áudio silencioso, para destravar elementos <audio> dentro de um toque. */
export function silentSrc() {
  return (silence = silence || silentWav());
}

const isIOS = () =>
  typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/**
 * Chamar dentro de um toque ou clique (síncrono). Retoma o contexto, pede a sessão de mídia e, no iOS antigo,
 * liga o laço de silêncio. Pode ser chamado de novo sem problema.
 */
export function unlockAudio() {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    /* Safari antigo */
  }
  const c = sharedAudio();
  if (c) {
    if (c.state !== 'running') void c.resume().catch(() => {});
    if (!unlocked) {
      // um buffer vazio tocado dentro do toque libera o Web Audio no iOS antigo
      try {
        const s = c.createBufferSource();
        s.buffer = c.createBuffer(1, 1, 22050);
        s.connect(c.destination);
        s.start(0);
      } catch {
        /* sem problema */
      }
    }
  }
  if (isIOS() && !nav.audioSession && !keepAlive) {
    keepAlive = new Audio(silentSrc());
    keepAlive.loop = true;
    keepAlive.setAttribute('playsinline', '');
    keepAlive.setAttribute('x-webkit-airplay', 'deny');
  }
  if (keepAlive && !hidden) void keepAlive.play().catch(() => {});
  unlocked = true;
}

/** Aba escondida: pausa tudo; ao voltar, retoma (o iOS também "interrompe" o áudio em ligações). */
export function pauseAudio(on: boolean) {
  hidden = on;
  const c = ctx;
  if (on) {
    keepAlive?.pause();
    if (c) void c.suspend().catch(() => {});
  } else if (unlocked) {
    if (keepAlive) void keepAlive.play().catch(() => {});
    if (c) void c.resume().catch(() => {});
  }
}

if (typeof document !== 'undefined') {
  // qualquer toque depois de uma interrupção (ligação, outro app tocando) religa o áudio
  const again = () => {
    if (unlocked && !hidden && ctx && ctx.state !== 'running') unlockAudio();
  };
  document.addEventListener('touchend', again, { passive: true });
  document.addEventListener('pointerup', again, { passive: true });
  document.addEventListener('keydown', again);
}
