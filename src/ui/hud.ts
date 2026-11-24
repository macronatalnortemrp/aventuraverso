import { breathColor } from '../game/breath';
import { sfx } from '../engine/audio';
import { speakRecorded, stopSpeaking } from '../engine/speech';

export const $ = <T extends HTMLElement = HTMLElement>(id: string) => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`#${id} não encontrado`);
  return e as T;
};

export type SayButton = [label: string, onClick: () => void, secondary?: boolean];

interface DialogQueue {
  who: string;
  title: string;
  lines: string[];
  i: number;
  onEnd?: () => void;
}

/** Interface em HTML por cima do canvas: moedas, fôlego, bússola, balão do Tico, diálogos. */
export class Hud {
  private ticoTimer = 0;
  /** retratos 3D de quem fala (nome -> imagem) */
  portraits: Record<string, string> = {};
  /** as falas gravadas só tocam com o som ligado */
  voice = () => true;
  private dq: DialogQueue | null = null;
  /** algum diálogo aberto (o jogo pausa) */
  get paused() {
    return this.dq !== null;
  }

  constructor(private onDialogClose: () => void) {
    addEventListener('keydown', (e) => {
      if (!this.dq || document.activeElement instanceof HTMLButtonElement) return;
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        this.next();
      }
    });
    // X dos balões: fecha só a fala atual e para a voz
    $('tx').onclick = () => {
      sfx('ui');
      stopSpeaking();
      this.hideTico();
    };
    $('dxx').onclick = () => this.next();
  }

  show(id: string, on = true) {
    $(id).classList.toggle('show', on);
  }

  coins(got: number, total: number, bump = false) {
    $('cn').textContent = `${got}/${total}`;
    if (bump) {
      const e = $('coins');
      e.classList.remove('bump');
      void e.offsetWidth;
      e.classList.add('bump');
    }
  }

  breath(b: number, visible: boolean) {
    const br = $('breath');
    br.classList.toggle('show', visible);
    if (!visible) return;
    br.style.setProperty('--p', (b * 100).toFixed(1));
    br.style.setProperty('--c', breathColor(b));
    br.classList.toggle('low', b < 0.2);
  }

  compass(angle: number | null) {
    this.show('cmp', angle !== null);
    if (angle !== null) $('needle').style.transform = `rotate(${angle}rad)`;
  }

  get compassOn() {
    return $('cmp').classList.contains('show');
  }

  action(label: string | null) {
    if (label) $('actl').textContent = label;
    this.show('act', !!label);
  }

  /** Fala do Tico, sempre em texto. ms = 0 fica até a criança responder. */
  say(text: string, ms = 6000, buttons: SayButton[] = []) {
    $('tt').textContent = text;
    const box = $('tb');
    box.innerHTML = '';
    for (const [label, f, alt] of buttons) {
      const b = document.createElement('button');
      b.className = 'btn' + (alt ? ' alt' : '');
      b.textContent = label;
      b.onclick = () => {
        this.hideTico();
        f();
      };
      box.append(b);
    }
    $('tico').classList.toggle('ask', buttons.length > 0); // falas com botões não têm X
    this.show('tico');
    if (this.voice()) speakRecorded(text, 'Tico');
    clearTimeout(this.ticoTimer);
    if (ms) this.ticoTimer = window.setTimeout(() => this.hideTico(), ms);
  }

  hideTico() {
    this.show('tico', false);
  }

  dialog(who: string, title: string, lines: string[], onEnd?: () => void) {
    this.dq = { who, title, lines, i: 0, onEnd };
    this.show('dlg');
    this.line();
  }

  private line() {
    const q = this.dq;
    if (!q) return;
    $('dw').textContent = q.who;
    $<HTMLImageElement>('dav').src = this.portraits[q.who] ?? '';
    const dt = $('dt');
    dt.textContent = q.title === q.who ? '' : q.title;
    dt.style.display = q.title === q.who ? 'none' : '';
    $('dx').textContent = q.lines[q.i];
    if (this.voice()) speakRecorded(q.lines[q.i], q.who);
    const row = $('dr');
    row.innerHTML = '';
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = q.i < q.lines.length - 1 ? 'Continuar' : 'Ok';
    b.onclick = () => this.next();
    row.append(b);
    setTimeout(() => b.focus(), 30);
  }

  next() {
    const q = this.dq;
    if (!q) return;
    sfx('ui');
    q.i++;
    if (q.i < q.lines.length) return this.line();
    this.dq = null;
    stopSpeaking();
    this.show('dlg', false);
    this.onDialogClose();
    q.onEnd?.();
  }

  private bannerTimer = 0;
  /** Mensagem grande e curta (desafio concluído). */
  banner(text: string, ms = 2600) {
    const b = $('banner');
    b.textContent = text;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => b.classList.remove('show'), ms);
  }

  fade(on: boolean) {
    $('fade').style.opacity = on ? '1' : '0';
  }
}
