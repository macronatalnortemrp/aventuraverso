import { sfx } from '../engine/audio';
import { hasVoice, speak, stopSpeaking } from '../engine/speech';
import { ICONS } from './icons';

/**
 * Tutorial curto (decisão de 23/11/2026): aparece uma vez, depois da abertura e antes do Dia 1, e pode ser
 * revisto no botão "?" da barra de cima. Mostra o que cada botão de cima faz e todos os movimentos, com
 * texto sempre visível e a voz gravada do Tico quando houver (as falas entram no gerador de vozes).
 */
export interface TutorialStep {
  /** botão destacado na tela (id do elemento); sem alvo, o cartão fica sozinho */
  target?: string;
  title: string;
  text: string;
}

/** Passos do tutorial. `touch`: celular ou tablet (toques e joystick); sem toque, teclado e mouse. */
export function tutorialSteps(touch: boolean): TutorialStep[] {
  const steps: TutorialStep[] = [
    { title: 'Como jogar', text: 'Oi! Antes de começar, vou mostrar os botões e os movimentos.' },
    { target: 'bh', title: 'Bússola de ajuda', text: 'Esta é a bússola de ajuda. Toque nela quando não souber para onde ir. Eu mostro uma trilha de faíscas até a coluna de luz.' },
    { target: 'bs', title: 'Som', text: 'Este botão liga e desliga as vozes e os efeitos.' },
    { target: 'bm', title: 'Música', text: 'Este botão liga e desliga a música.' },
  ];
  if (touch) steps.push({ target: 'bc', title: 'Joystick', text: 'Este botão mostra o joystick e os botões A e B, para pular e mergulhar.' });
  steps.push(
    { target: 'bq', title: 'Rever o tutorial', text: 'E este botão mostra estas dicas de novo, quando você quiser.' },
    { title: 'Sua missão', text: 'Durante a missão, o que você precisa fazer aparece no alto da tela.' },
  );
  if (touch)
    steps.push(
      { title: 'Andar e olhar', text: 'Toque no chão para andar até lá. Arraste o dedo na tela para olhar em volta. Use dois dedos para aproximar ou afastar.' },
      { title: 'Pular', text: 'Com o joystick ligado, o botão A pula. Aperte A e depois B para dar um pulo alto. Segure B no ar para dar uma marretada no chão.' },
      { title: 'Nadar e mergulhar', text: 'Na água você nada. No meio do lago, aperte A para mergulhar. A bolha azul mostra o seu fôlego, e ela enche de novo quando você sai da água.' },
      { title: 'Conversar e usar', text: 'Perto de alguém ou de algo especial aparece um botão amarelo. Toque nele para conversar ou usar.' },
    );
  else
    steps.push(
      { title: 'Andar e olhar', text: 'Use as setas ou as teclas W, A, S e D para andar. Você também pode clicar no chão. Arraste com o mouse para olhar em volta, e a rodinha aproxima ou afasta.' },
      { title: 'Pular', text: 'A barra de espaço pula. Aperte espaço e depois Shift para dar um pulo alto. Segure Shift no ar para dar uma marretada no chão.' },
      { title: 'Nadar e mergulhar', text: 'Na água você nada. No meio do lago, aperte espaço para mergulhar. A bolha azul mostra o seu fôlego, e ela enche de novo quando você sai da água.' },
      { title: 'Conversar e usar', text: 'Perto de alguém ou de algo especial aparece um botão amarelo. Clique nele ou aperte Enter para conversar ou usar.' },
    );
  steps.push({ title: 'Pronto!', text: 'Pronto! Agora é com você. Vamos começar a aventura!' });
  return steps;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', txt = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt) e.textContent = txt;
  return e;
};

export class Tutorial {
  open = false;
  /** a voz só toca com o botão Som ligado */
  voice = () => true;
  /** retrato do Tico para o cartão */
  portrait = '';

  /** Mostra o tutorial. Termina no último passo ou em "Pular". */
  play(touch: boolean): Promise<void> {
    if (this.open) return Promise.resolve();
    const steps = tutorialSteps(touch);
    this.open = true;
    const root = el('div', 'tut');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Como jogar');
    const ring = el('div', 'tut-ring');
    const card = el('div', 'panel tut-card');
    const dims = [0, 1, 2, 3].map(() => el('div', 'tut-dim'));
    root.append(...dims, ring, card);
    document.body.append(root);
    let i = 0;

    return new Promise((done) => {
      const finish = () => {
        stopSpeaking();
        removeEventListener('resize', place);
        root.remove();
        this.open = false;
        done();
      };
      const place = () => {
        const t = steps[i].target ? document.getElementById(steps[i].target!) : null;
        const r = t && t.offsetParent !== null ? t.getBoundingClientRect() : null;
        ring.hidden = !r;
        const pad = 6,
          W = innerWidth,
          Hh = innerHeight + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 0);
        // furo retangular em volta do botão: faixas de cima, de baixo, da esquerda e da direita
        const [x0, y0, x1, y1] = r ? [r.left - pad, r.top - pad, r.right + pad, r.bottom + pad] : [0, 0, 0, 0];
        const rects = r
          ? [
              [0, 0, W, y0],
              [0, y1, W, Hh - y1],
              [0, y0, x0, y1 - y0],
              [x1, y0, W - x1, y1 - y0],
            ]
          : [[0, 0, W, Hh], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        dims.forEach((d, k) => {
          const [l, t, w, h] = rects[k];
          Object.assign(d.style, { left: `${l}px`, top: `${t}px`, width: `${Math.max(0, w)}px`, height: `${Math.max(0, h)}px` });
        });
        if (r) Object.assign(ring.style, { left: `${x0}px`, top: `${y0}px`, width: `${x1 - x0}px`, height: `${y1 - y0}px` });
      };
      const show = () => {
        const s = steps[i],
          last = i === steps.length - 1;
        card.innerHTML = '';
        const top = el('div', 'thead');
        top.append(el('b', 'tag', 'Tico'));
        if (hasVoice(s.text, 'Tico')) {
          const l = el('button', 'btn alt listen');
          l.innerHTML = ICONS.speaker + '<span>Ouvir</span>';
          l.setAttribute('aria-label', 'Ouvir o texto');
          l.onclick = () => this.voice() && speak(s.text, 'Tico');
          top.append(l);
        }
        const body = el('div', 'tut-body');
        if (this.portrait) {
          const img = el('img', 'av');
          img.alt = '';
          img.src = this.portrait;
          body.append(img);
        }
        const tx = el('div', 'tx');
        tx.append(el('h2', '', s.title), el('p', '', s.text));
        body.append(tx);
        const row = el('div', 'row');
        const skip = el('button', 'btn alt', 'Pular');
        skip.onclick = () => {
          sfx('ui');
          finish();
        };
        const back = el('button', 'btn alt', 'Voltar');
        back.hidden = i === 0;
        back.onclick = () => {
          sfx('ui');
          i--;
          show();
        };
        const next = el('button', 'btn', last ? 'Começar!' : 'Próximo');
        next.onclick = () => {
          sfx('ui');
          if (last) return finish();
          i++;
          show();
        };
        if (!last) row.append(skip);
        row.append(back, next);
        const dots = el('div', 'tut-dots');
        dots.setAttribute('aria-hidden', 'true');
        steps.forEach((_, j) => dots.append(el('i', j === i ? 'on' : '')));
        card.append(top, body, dots, row);
        place();
        stopSpeaking();
        if (this.voice()) speak(s.text, 'Tico');
        setTimeout(() => next.focus({ preventScroll: true }), 40);
      };
      addEventListener('resize', place);
      root.addEventListener('keydown', (e) => {
        e.stopPropagation(); // o jogo não anda enquanto o tutorial está aberto
        if (e.key === 'Escape') finish();
      });
      show();
    });
  }
}
