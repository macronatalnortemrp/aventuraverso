/**
 * Regras de texto compartilhadas entre o jogo e o gerador de vozes (scripts/voices).
 * Sem imports: o coletor roda este arquivo direto no Node.
 *
 * Cada fala é quebrada em frases; cada frase vira um áudio por voz. Assim, textos montados
 * em tempo de execução (pergunta + alternativas embaralhadas) ainda encontram seus áudios.
 */
export type VoiceId = 'narrador' | 'sol' | 'pedrito' | 'tico' | 'acampante' | 'marina' | 'flora' | 'estrelino' | 'ze';

/** quem fala (como aparece na interface) -> perfil de voz em scripts/voices/voices.json */
export const SPEAKERS: Record<string, VoiceId> = {
  Tico: 'tico',
  Pedrito: 'pedrito',
  'Diretora Cecília': 'sol',
  Acampante: 'acampante',
  'Capitã Marina': 'marina',
  'Dona Flora': 'flora',
  'Seu Estrelino': 'estrelino',
  'Tio Zé Bichos': 'ze',
  'A Voz': 'narrador',
  'Clube de Aventureiros': 'narrador',
  'Pergaminho da Palavra': 'narrador',
  'Bíblia na Mão': 'narrador',
  'Quadros dos Ideais': 'narrador',
  'Mundo 1': 'narrador',
};

export const voiceOf = (who: string): VoiceId => SPEAKERS[who] ?? 'narrador';

export const normalize = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();

/** quebra em frases, mantendo a pontuação final (?, !, ...) que muda a entonação */
export function splitSentences(text: string): string[] {
  return normalize(text)
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

/** chave de busca: ignora maiúsculas e pontos finais ("Dia" e "Dia." são a mesma fala) */
export const lineKey = (sentence: string) =>
  normalize(sentence)
    .replace(/[.\s]+$/, '')
    .toLowerCase();

/** FNV-1a 32 bits, para nomes de arquivo estáveis */
export function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface VoiceManifest {
  version: number;
  /** voz -> chave da frase -> arquivo relativo a public/audio/voices/ */
  voices: Partial<Record<VoiceId, Record<string, string>>>;
}

/** arquivos para falar o texto inteiro com a voz de quem fala, ou null se faltar alguma frase */
export function clipsFor(m: VoiceManifest | null, who: string, text: string): string[] | null {
  const table = m?.voices[voiceOf(who)];
  if (!table) return null;
  const files: string[] = [];
  for (const s of splitSentences(text)) {
    const f = table[lineKey(s)];
    if (!f) return null;
    files.push(f);
  }
  return files.length ? files : null;
}
