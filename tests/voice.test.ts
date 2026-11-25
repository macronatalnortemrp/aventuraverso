import { describe, expect, test } from 'vitest';
import { clipsFor, lineKey, splitSentences, voiceOf } from '../src/engine/voiceText';

describe('falas gravadas', () => {
  test('quebra em frases mantendo a pontuação', () => {
    expect(splitSentences('Ai, que escuro! Eu tenho um pouco de medo...')).toEqual(['Ai, que escuro!', 'Eu tenho um pouco de medo...']);
  });
  test('a chave ignora maiúsculas e pontos finais', () => {
    expect(lineKey('Dia.')).toBe(lineKey('dia'));
    expect(lineKey('Medo...')).toBe('medo');
  });
  test('pergunta com alternativas embaralhadas encontra os áudios de cada frase', () => {
    const m = { version: 1, voices: { pedrito: { 'que cor?': 'p/1.mp3', azul: 'p/2.mp3', vinho: 'p/3.mp3' } } };
    expect(clipsFor(m, 'Pedrito', 'Que cor? Vinho. Azul.')).toEqual(['p/1.mp3', 'p/3.mp3', 'p/2.mp3']);
    expect(clipsFor(m, 'Pedrito', 'Que cor? Verde.')).toBeNull();
    expect(clipsFor(m, 'Tico', 'Que cor?')).toBeNull();
  });
  test('cada personagem tem sua voz; o resto é narrador', () => {
    expect(voiceOf('Diretora Cecília')).toBe('sol');
    expect(voiceOf('A Voz')).toBe('narrador');
    expect(voiceOf('Bandeira do Clube')).toBe('narrador');
  });
});
