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

const norm = (w: string) => w.toLocaleLowerCase('pt-BR');

/**
 * Montar o versículo: a peça serve se tiver a mesma palavra da próxima posição, qualquer que seja a peça.
 * Em Gn 1:3 há duas peças "luz" (e "E" e "e"): tanto faz qual a criança toca, o texto bíblico fica igual,
 * porque o espaço sempre mostra a palavra do próprio versículo.
 * 'later' = a palavra está no versículo, mas mais adiante; 'out' = não faz parte dele.
 */
export function wordFits(phrase: string[], pos: number, word: string): 'ok' | 'later' | 'out' {
  if (pos < phrase.length && norm(phrase[pos]) === norm(word)) return 'ok';
  return phrase.slice(pos + 1).some((w) => norm(w) === norm(word)) ? 'later' : 'out';
}
