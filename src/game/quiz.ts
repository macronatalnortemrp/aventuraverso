/**
 * Respostas sem punição (docs/GAME_DESIGN.md):
 * 1º erro: resposta acolhedora; 2º erro: Tico dá uma pista; 3º erro: mostra a resposta e explica.
 */
export type QuizResult = 'right' | 'retry' | 'hint' | 'reveal';

export interface Question {
  enabled: boolean;
  status?: string;
  who: string;
  prompt: string;
  options: string[];
  answer: number;
  hint: string;
  explain: string;
}

export function judge(q: Pick<Question, 'answer'>, choice: number, wrongSoFar: number): QuizResult {
  if (choice === q.answer) return 'right';
  if (wrongSoFar === 0) return 'retry';
  if (wrongSoFar === 1) return 'hint';
  return 'reveal';
}

/** Embaralha as opções e devolve a nova posição da resposta certa (sem depender de Math.random nos testes). */
export function shuffled<T>(q: { options: T[]; answer: number }, rand: () => number = Math.random) {
  const idx = q.options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return { options: idx.map((i) => q.options[i]), answer: idx.indexOf(q.answer) };
}
