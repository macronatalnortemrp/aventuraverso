/**
 * Vozes dos personagens: só os áudios gravados do jogo (gerados com Kokoro, ver scripts/voices/).
 * Decisão de 21/11/2026: nunca usar a voz do aparelho (SpeechSynthesis, VoiceOver, TalkBack).
 * Todo texto falado também aparece na tela; o áudio é sempre opcional.
 */
import { VoiceManifest, clipsFor, lineKey, splitSentences, voiceOf } from './voiceText';

const audioOk = () => typeof Audio !== 'undefined';

const BASE = `${import.meta.env?.BASE_URL ?? '/'}audio/voices/`;
let manifest: VoiceManifest | null = null;
if (audioOk() && typeof fetch !== 'undefined') {
  fetch(BASE + 'manifest.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => (manifest = m))
    .catch(() => {
      /* sem áudios gravados: o texto segue só na tela */
    });
}

/* um único elemento de áudio: depois do primeiro toque, o iOS deixa tocar os seguintes */
let player: HTMLAudioElement | null = null;
let token = 0;

function playClips(files: string[]) {
  player = player || new Audio();
  const p = player,
    my = ++token;
  let i = 0;
  const next = () => {
    if (my !== token || i >= files.length) return;
    p.src = BASE + files[i++];
    p.play().catch(() => {
      /* bloqueado pelo navegador: o texto segue na tela */
    });
  };
  p.onended = next;
  next();
}

/** arquivos gravados das frases do texto que têm áudio (as outras ficam só na tela) */
function available(text: string, who: string): string[] {
  const table = audioOk() ? manifest?.voices[voiceOf(who)] : null;
  if (!table) return [];
  return splitSentences(text)
    .map((s) => table[lineKey(s)])
    .filter((f): f is string => !!f);
}

/** Há alguma frase gravada para este texto? (o botão "Ouvir" só aparece quando há) */
export function hasVoice(text: string, who = 'Tico') {
  return available(text, who).length > 0;
}

/**
 * Fala o texto com as vozes gravadas do jogo. Nunca usa a voz do aparelho
 * (SpeechSynthesis / leitor do celular): o que não tem gravação fica só na tela.
 */
export function speak(text: string, who = 'Tico') {
  const files = available(text, who);
  if (!files.length) return false;
  stopSpeaking();
  playClips(files);
  return true;
}

/** Só fala se houver áudio gravado (falas automáticas dos diálogos, sem voz robótica). */
export function speakRecorded(text: string, who: string) {
  const files = audioOk() ? clipsFor(manifest, who, text) : null;
  if (!files) return false;
  stopSpeaking();
  playClips(files);
  return true;
}

/** Mesmo que `speak` (mantido para a abertura). */
export const speakAvailable = speak;

export function stopSpeaking() {
  token++;
  if (player) {
    player.onended = null;
    player.pause();
  }
}
