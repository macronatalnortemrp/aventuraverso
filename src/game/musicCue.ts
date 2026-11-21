import type { CueId } from '../engine/musicScore';

/** O que o jogo está fazendo agora (para escolher a música de fundo). */
export interface MusicState {
  /** saiu da tela de título */
  started: boolean;
  /** acampamento no escuro (Dia 1, etapas 1 a 3) */
  night: boolean;
}

/** Música de fundo do momento (fora da abertura, que escolhe a sua). */
export function cueFor(s: MusicState): CueId {
  if (!s.started) return 'festa';
  return s.night ? 'escuro' : 'explorar';
}
