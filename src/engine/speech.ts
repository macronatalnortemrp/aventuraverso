/**
 * Leitura em voz com a voz do aparelho (SpeechSynthesis), opcional.
 * Todo texto falado também aparece na tela; sem suporte, o botão "Ouvir" some.
 */
export const canSpeak = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';

let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (!canSpeak()) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find((v) => v.lang === 'pt-BR') || vs.find((v) => v.lang.startsWith('pt')) || null;
}
if (canSpeak()) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function speak(text: string, pitch = 1.05) {
  if (!canSpeak()) return;
  try {
    speechSynthesis.cancel();
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

export function stopSpeaking() {
  if (canSpeak()) speechSynthesis.cancel();
}
