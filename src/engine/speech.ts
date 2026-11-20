/**
 * Vozes dos personagens. Primeiro tenta os áudios gravados (gerados com Kokoro, ver
 * scripts/voices/); se faltar alguma frase, usa a voz do aparelho (SpeechSynthesis).
 * Todo texto falado também aparece na tela; o áudio é sempre opcional.
 */
import { VoiceManifest, clipsFor } from './voiceText';

const synthOk = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
const audioOk = () => typeof Audio !== 'undefined';
export const canSpeak = () => synthOk() || audioOk();

const BASE = `${import.meta.env?.BASE_URL ?? '/'}audio/voices/`;
let manifest: VoiceManifest | null = null;
if (audioOk() && typeof fetch !== 'undefined') {
  fetch(BASE + 'manifest.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((m) => (manifest = m))
    .catch(() => {
      /* sem áudios gravados: fica a voz do aparelho */
    });
}

let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (!synthOk()) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find((v) => v.lang === 'pt-BR') || vs.find((v) => v.lang.startsWith('pt')) || null;
}
if (synthOk()) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
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

function synth(text: string, pitch: number) {
  if (!synthOk()) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.pitch = pitch;
    speechSynthesis.speak(u);
  } catch {
    /* sem voz: o texto segue na tela */
  }
}

/** Fala o texto com a voz de quem fala. Sem áudio gravado, usa a voz do aparelho. */
export function speak(text: string, who = 'Tico', pitch = 1.05) {
  stopSpeaking();
  const files = audioOk() ? clipsFor(manifest, who, text) : null;
  if (files) playClips(files);
  else synth(text, pitch);
}

/** Só fala se houver áudio gravado (falas automáticas dos diálogos, sem voz robótica). */
export function speakRecorded(text: string, who: string) {
  const files = audioOk() ? clipsFor(manifest, who, text) : null;
  if (!files) return false;
  stopSpeaking();
  playClips(files);
  return true;
}

export function stopSpeaking() {
  token++;
  if (player) {
    player.onended = null;
    player.pause();
  }
  if (synthOk()) speechSynthesis.cancel();
}
