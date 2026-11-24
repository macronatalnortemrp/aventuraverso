import { Question, judge, shuffled, wordFits } from '../game/quiz';
import { DayFeedback } from '../persistence/save';
import { JourneyEntry } from '../game/journey';
import { sfx } from '../engine/audio';
import { hasVoice, speak, stopSpeaking } from '../engine/speech';
import { ICONS } from './icons';
import { $ } from './hud';

/* Atividades em HTML por cima do jogo. Cada uma devolve uma Promise que resolve quando termina.
   Nenhuma tem tempo limite e nenhum erro tira progresso. */

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};
const text = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, t: string) => {
  const e = el(tag, cls);
  e.textContent = t;
  return e;
};

export class Task {
  open = false;
  /** a leitura em voz só funciona com o som ligado */
  voice = () => true;
  /** resposta certa (vinheta da trilha) */
  onRight: () => void = () => {};
  /** retratos 3D (nome -> imagem) para usar nos cartões */
  portraits: Record<string, string> = {};
  /**
   * Leitura que veio antes da atividade atual. Enquanto houver uma, as perguntas e atividades mostram
   * "Ler de novo": a criança relê (e ouve) e volta ao mesmo ponto, sem perder o que já fez.
   */
  review: { ref: string; verses: string[] | null } | null = null;

  private panel() {
    const root = $('task'),
      p = $('taskp');
    p.innerHTML = '';
    root.classList.add('show');
    this.open = true;
    return p;
  }

  private close() {
    stopSpeaking();
    $('task').classList.remove('show');
    this.open = false;
  }

  private listen(t: string, who = 'Tico') {
    if (!hasVoice(t, who)) return null; // sem gravação, sem botão (nunca a voz do aparelho)
    const b = el('button', 'btn alt listen', ICONS.speaker + '<span>Ouvir</span>');
    b.setAttribute('aria-label', 'Ouvir o texto');
    b.onclick = () => this.voice() && speak(t, who);
    return b;
  }

  private header(p: HTMLElement, who: string, title: string, read: string, back: string | null = null) {
    const top = el('div', 'thead');
    top.append(text('b', 'tag', who));
    const tools = el('div', 'tools');
    const l = this.listen(read, who);
    if (l) tools.append(l);
    const r = back ? this.review : null;
    if (r && back) tools.append(this.rereadButton(p, r, back));
    if (tools.childElementCount) top.append(tools);
    p.append(top, text('h2', '', title));
  }

  /** "Ler de novo": troca o cartão pela leitura e volta ao mesmo cartão, do jeito que estava. */
  private rereadButton(p: HTMLElement, r: { ref: string; verses: string[] | null }, backLabel: string) {
    const b = el('button', 'btn alt listen reread', ICONS.stories + '<span>Ler de novo</span>');
    b.setAttribute('aria-label', 'Ler de novo ' + r.ref);
    b.onclick = () => {
      sfx('page');
      stopSpeaking();
      const kept = [...p.childNodes],
        cls = p.className,
        focus = document.activeElement;
      p.innerHTML = '';
      this.fillReading(p, r.ref, r.verses);
      const back = this.button(backLabel);
      back.onclick = () => {
        sfx('ui');
        stopSpeaking();
        p.className = cls;
        p.replaceChildren(...kept);
        p.scrollTop = 0;
        (focus instanceof HTMLElement && p.contains(focus) ? focus : b).focus();
      };
      const row = el('div', 'row');
      row.append(back);
      p.append(row);
      p.scrollTop = 0;
      setTimeout(() => back.focus(), 40);
    };
    return b;
  }

  /** Corpo da leitura bíblica (cabeçalho, versículos e narração automática), sem o botão final. */
  private fillReading(p: HTMLElement, ref: string, verses: string[] | null) {
    p.className = 'panel scroll';
    if (verses?.length) {
      // o narrador lê os versículos sozinho ao abrir (a criança pode não saber ler); "Ouvir" repete
      const spoken = verses.join(' ');
      this.header(p, 'Pergaminho da Palavra', ref, spoken);
      const box = el('div', 'verses');
      for (const v of verses) box.append(text('p', '', v));
      p.append(box);
      setTimeout(() => this.open && p.contains(box) && this.voice() && speak(spoken, 'Pergaminho da Palavra'), 450);
    } else {
      const msg = `Pegue uma Bíblia e leia, com a ajuda de um adulto, ${ref.replace('-', ' a ')}.`;
      this.header(p, 'Bíblia na Mão', ref, msg);
      const box = el('div', 'bible-hand', ICONS.stories);
      box.append(text('p', '', msg));
      p.append(box);
    }
  }

  private button(label: string, alt = false) {
    const b = text('button', 'btn' + (alt ? ' alt' : ''), label);
    return b;
  }

  /** Leitura bíblica. Com o texto conferido: Pergaminho da Palavra. Sem ele: Bíblia na Mão. */
  reading(ref: string, verses: string[] | null): Promise<void> {
    return new Promise((done) => {
      const p = this.panel();
      this.fillReading(p, ref, verses);
      const ok = this.button(verses?.length ? 'Continuar' : 'Já li');
      ok.onclick = () => {
        sfx('ui');
        this.close();
        done();
      };
      const row = el('div', 'row');
      row.append(ok);
      p.append(row);
      setTimeout(() => ok.focus(), 40);
    });
  }

  /** Pergunta com três tentativas: acolhe, dá pista e, por fim, mostra a resposta explicando. */
  quiz(q: Question): Promise<void> {
    return new Promise((done) => {
      const p = this.panel();
      p.className = 'panel quiz';
      const { options, answer } = shuffled(q);
      this.header(p, q.who, q.prompt, `${q.prompt} ${options.join('. ')}.`, 'Voltar à pergunta');
      const list = el('div', 'opts');
      const msg = el('p', 'msg');
      msg.setAttribute('role', 'status');
      const row = el('div', 'row');
      const confirm = this.button('Confirmar');
      confirm.disabled = true;
      let chosen = -1,
        wrong = 0;
      const btns = options.map((o, i) => {
        const b = el('button', 'opt');
        b.append(text('span', 'mark', String.fromCharCode(65 + i)), text('span', '', o));
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => {
          chosen = i;
          btns.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
          confirm.disabled = false;
          sfx('ui');
        };
        list.append(b);
        return b;
      });
      const finish = (t: string) => {
        msg.textContent = t;
        msg.className = 'msg good';
        btns.forEach((b) => (b.disabled = true));
        btns[answer].classList.add('right');
        confirm.textContent = 'Continuar';
        confirm.disabled = false;
        confirm.onclick = () => {
          this.close();
          done();
        };
        confirm.focus();
      };
      confirm.onclick = () => {
        const r = judge({ answer }, chosen, wrong);
        if (r === 'right') {
          sfx('yay');
          this.onRight();
          return finish(`Isso mesmo! ${q.explain}`);
        }
        btns[chosen].classList.add('wrong');
        btns[chosen].disabled = true;
        wrong++;
        if (r === 'retry') msg.textContent = 'Quase! Pense mais um pouquinho e tente de novo.';
        else if (r === 'hint') msg.textContent = `Dica do Tico: ${q.hint}`;
        else return finish(`A resposta é: ${options[answer]}. ${q.explain}`);
        msg.className = 'msg';
        chosen = -1;
        confirm.disabled = true;
        btns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      };
      row.append(confirm);
      p.append(list, msg, row);
      setTimeout(() => btns[0].focus(), 40);
    });
  }

  /** Montar o versículo tocando nos blocos na ordem certa (palavras iguais valem as duas). */
  words(title: string, phrase: string[], distractors: string[], what = 'no versículo'): Promise<void> {
    return new Promise((done) => {
      const p = this.panel();
      p.className = 'panel words';
      this.header(p, 'Tico', title, `${title} Toque nas palavras na ordem certa.`, 'Voltar a montar');
      p.append(text('p', 'sub', 'Toque nas palavras na ordem certa.'));
      const slots = el('div', 'slots');
      const slotEls = phrase.map(() => {
        const s = el('span', 'slot');
        slots.append(s);
        return s;
      });
      const pool = el('div', 'pool');
      const msg = el('p', 'msg');
      msg.setAttribute('role', 'status');
      let pos = 0;
      const all = [...phrase, ...distractors];
      shuffled({ options: all, answer: 0 }).options.forEach((w) => {
        const b = text('button', 'word', w);
        b.onclick = () => {
          const fit = wordFits(phrase, pos, w);
          if (fit === 'ok') {
            sfx('coin');
            slotEls[pos].textContent = phrase[pos]; // sempre a palavra do versículo, na grafia dele
            slotEls[pos].classList.add('filled');
            b.disabled = true;
            b.classList.add('used');
            pos++;
            msg.textContent = '';
            if (pos === phrase.length) {
              msg.className = 'msg good';
              msg.textContent = 'Muito bem!';
              setTimeout(() => {
                this.close();
                done();
              }, 900);
            }
          } else {
            sfx('ui');
            b.classList.remove('shake');
            void b.offsetWidth;
            b.classList.add('shake');
            msg.className = 'msg';
            msg.textContent = fit === 'out' ? `Essa palavra não está ${what}. Tente outra!` : 'Essa vem depois. Qual vem antes?';
          }
        };
        pool.append(b);
      });
      p.append(slots, pool, msg);
    });
  }

  /** Separar objetos em dia e noite: toque no objeto e depois no lado certo. */
  sort(
    prompt: string,
    items: { id: string; name: string; group: string }[],
    binsDef: { group: string; label: string; icon: string; other: string }[] = [
      { group: 'day', label: 'Dia', icon: 'sun', other: 'o dia' },
      { group: 'night', label: 'Noite', icon: 'moon', other: 'a noite' },
    ],
    title = 'Dia ou noite?',
  ): Promise<void> {
    return new Promise((done) => {
      const p = this.panel();
      p.className = 'panel sort';
      this.header(p, 'Tico', title, prompt, 'Voltar a separar');
      p.append(text('p', 'sub', prompt));
      const tray = el('div', 'tray');
      const bins = el('div', 'bins');
      const msg = el('p', 'msg');
      msg.setAttribute('role', 'status');
      let selected: { id: string; group: string; b: HTMLButtonElement } | null = null;
      let left = items.length;
      const mkBin = (group: string, label: string, icon: string) => {
        const b = el('button', 'bin bin-' + group, ICONS[icon]); // 'bin-day': a classe 'day' é do cartão da Jornada e deixava o texto preto
        b.append(text('span', 'bl', label));
        const got = el('div', 'got');
        b.append(got);
        b.onclick = () => {
          if (!selected) {
            msg.className = 'msg';
            msg.textContent = 'Primeiro toque em um objeto.';
            return;
          }
          if (selected.group === group) {
            sfx('coin');
            got.append(el('span', 'mini', ICONS[selected.id]));
            selected.b.remove();
            selected = null;
            msg.textContent = '';
            if (--left === 0) {
              msg.className = 'msg good';
              msg.textContent = 'Tudo separado!';
              setTimeout(() => {
                this.close();
                done();
              }, 900);
            }
          } else {
            sfx('ui');
            msg.className = 'msg';
            const right = binsDef.find((x) => x.group === selected!.group);
            msg.textContent = `Hum... ${selected.b.textContent} combina mais com ${right?.other ?? 'o outro lado'}. Tente de novo!`;
            selected.b.setAttribute('aria-pressed', 'false');
            selected = null;
          }
        };
        bins.append(b);
      };
      for (const it of shuffled({ options: items, answer: 0 }).options) {
        const b = el('button', 'thing', ICONS[it.id]);
        b.append(text('span', '', it.name));
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => {
          tray.querySelectorAll('.thing').forEach((x) => x.setAttribute('aria-pressed', 'false'));
          b.setAttribute('aria-pressed', 'true');
          selected = { id: it.id, group: it.group, b };
          sfx('ui');
        };
        tray.append(b);
      }
      for (const d of binsDef) mkBin(d.group, d.label, d.icon);
      p.append(tray, bins, msg);
    });
  }

  /** Recompensas do dia e missão real opcional (confirmada por um adulto). */
  reward(o: { title: string; badge: string; note: string; lantern: string; stars: number; real: string; adult: string; realDone: boolean }): Promise<{ realMission: boolean }> {
    return new Promise((done) => {
      const p = this.panel();
      p.className = 'panel reward';
      p.append(text('b', 'tag', 'Dia concluído'), text('h2', '', o.title));
      const b = el('div', 'badge', ICONS.badge);
      b.append(text('strong', '', o.badge), text('small', '', o.note));
      const stars = el('div', 'stars', ICONS.star.repeat(o.stars));
      const lant = el('p', 'lant', ICONS.lantern);
      lant.append(text('span', '', o.lantern));
      const real = el('div', 'real');
      real.append(text('b', '', 'Missão real (opcional)'), text('p', '', o.real));
      const lab = el('label', 'opt');
      const chk = el('input');
      chk.type = 'checkbox';
      chk.checked = o.realDone;
      lab.append(chk, text('span', '', o.adult));
      real.append(lab);
      const ok = this.button('Continuar');
      ok.onclick = () => {
        this.close();
        done({ realMission: chk.checked });
      };
      p.append(b, stars, lant, real, el('div', 'row'));
      p.lastElementChild!.append(ok);
      setTimeout(() => ok.focus(), 40);
    });
  }

  /** Feedback da criança: carinhas, até dois ícones e se quer continuar. Sempre com "Pular". */
  feedback(): Promise<DayFeedback | null> {
    return new Promise((done) => {
      const p = this.panel();
      p.className = 'panel feedback';
      const f: DayFeedback = { mood: null, liked: [], wantsNext: null };
      const finish = (r: DayFeedback | null) => {
        this.close();
        done(r);
      };
      const skip = this.button('Pular', true);
      skip.onclick = () => finish(null);
      const q = (t: string) => {
        p.innerHTML = '';
        const top = el('div', 'thead');
        top.append(text('b', 'tag', 'Tico'));
        const l = this.listen(t);
        if (l) top.append(l);
        p.append(top, text('h2', '', t));
      };
      const moods = () => {
        q('Como foi hoje?');
        const row = el('div', 'faces');
        for (const [k, label] of [['great', 'Gostei muito'], ['ok', 'Mais ou menos'], ['bad', 'Não gostei']] as const) {
          const b = el('button', 'face', ICONS[k]);
          b.append(text('span', '', label));
          b.onclick = () => {
            f.mood = k;
            sfx('ui');
            liked();
          };
          row.append(b);
        }
        p.append(row, el('div', 'row'));
        p.lastElementChild!.append(skip);
      };
      const liked = () => {
        q('O que você mais gostou? Escolha até dois.');
        const grid = el('div', 'likes');
        const opts: [string, string][] = [['tico', 'Tico'], ['search', 'Procurar coisas'], ['questions', 'Perguntas'], ['globe', 'Globo'], ['stories', 'Histórias'], ['people', 'Personagens']];
        for (const [k, label] of opts) {
          const b = el('button', 'like', k === 'tico' && this.portraits.Tico ? `<img alt="" src="${this.portraits.Tico}">` : ICONS[k]);
          b.append(text('span', '', label));
          b.setAttribute('aria-pressed', 'false');
          b.onclick = () => {
            const i = f.liked.indexOf(k);
            if (i >= 0) f.liked.splice(i, 1);
            else if (f.liked.length < 2) f.liked.push(k);
            grid.querySelectorAll('.like').forEach((x, j) => x.setAttribute('aria-pressed', String(f.liked.includes(opts[j][0]))));
            sfx('ui');
          };
          grid.append(b);
        }
        const next = this.button('Próximo');
        next.onclick = () => next3();
        p.append(grid, el('div', 'row'));
        p.lastElementChild!.append(skip, next);
      };
      const next3 = () => {
        q('Quer jogar o próximo dia?');
        const row = el('div', 'row big');
        const yes = this.button('Sim!'),
          later = this.button('Mais tarde', true);
        yes.onclick = () => finish({ ...f, wantsNext: true });
        later.onclick = () => finish({ ...f, wantsNext: false });
        row.append(later, yes);
        p.append(row);
      };
      moods();
    });
  }

  /** Resumo: o que a criança fez e o que isso representa no dia da criação. */
  recap(r: { title: string; intro: string; items: { icon: string; game: string; creation: string }[]; close: string }): Promise<void> {
    return new Promise((done) => {
      const p = this.panel();
      p.className = 'panel recap';
      const read = [r.intro, ...r.items.map((i) => `${i.game}: ${i.creation}`), r.close].join(' ');
      this.header(p, 'Tico', r.title, read);
      p.append(text('p', '', r.intro));
      const list = el('div', 'items');
      for (const it of r.items) {
        const row = el('div', 'it', ICONS[it.icon] ?? ICONS.star);
        const t = el('div');
        t.append(text('b', '', it.game), text('span', '', it.creation));
        row.append(t);
        list.append(row);
      }
      const ok = this.button('Continuar');
      ok.onclick = () => {
        this.close();
        done();
      };
      const row = el('div', 'row');
      row.append(ok);
      p.append(list, text('p', 'sub', r.close), row);
      setTimeout(() => ok.focus(), 40);
    });
  }

  /** Jornada do Éden: os sete dias, com o que já foi feito e o que dá para jogar agora. */
  journey(days: JourneyEntry[], world: { done: number; total: number; nextWorldOpen: boolean }): Promise<{ day: number; replay: boolean } | null> {
    return new Promise((done) => {
      const p = this.panel();
      p.className = 'panel journey';
      const finish = (r: { day: number; replay: boolean } | null) => {
        this.close();
        done(r);
      };
      this.header(p, 'Mundo 1', 'Jornada do Éden', `Jornada do Éden. ${world.done} de ${world.total} dias concluídos.`);
      p.append(text('p', 'sub', `${world.done} de ${world.total} dias concluídos. Jogue no seu ritmo: um dia por vez ou vários seguidos.`));
      const grid = el('div', 'days');
      let first: HTMLButtonElement | null = null;
      for (const d of days) {
        const b = el('button', 'day ' + d.status);
        const label = { done: 'Jogar de novo', playing: 'Continuar', next: 'Começar', soon: 'Em breve', locked: 'Bloqueado' }[d.status];
        const icon = { done: 'check', playing: 'play', next: 'play', soon: 'lock', locked: 'lock' }[d.status];
        b.innerHTML = ICONS[icon];
        b.prepend(text('span', 'n', `Dia ${d.n}`));
        b.append(text('span', 't', d.ready ? d.title : d.status === 'locked' ? `Termine o Dia ${d.n - 1}` : 'Em construção'), text('span', 'st', label));
        b.setAttribute('aria-label', `Dia ${d.n}: ${label}`);
        if (d.status === 'soon' || d.status === 'locked') b.disabled = true;
        else {
          b.onclick = () => finish({ day: d.n, replay: d.status === 'done' });
          if (!first || d.status !== 'done') first = d.status === 'done' && first ? first : b;
        }
        grid.append(b);
      }
      const w = el('div', 'world', ICONS[world.nextWorldOpen ? 'check' : 'lock']);
      w.append(text('span', '', world.nextWorldOpen ? 'O portal do próximo mundo está aberto!' : `O portal do próximo mundo abre quando os ${world.total} dias estiverem concluídos.`));
      const close = this.button('Fechar', true);
      close.onclick = () => finish(null);
      const row = el('div', 'row');
      row.append(close);
      p.append(grid, w, row);
      setTimeout(() => (first ?? close).focus(), 40);
    });
  }

  /** Pergunta simples de sim ou não. */
  confirm(who: string, title: string, body: string, yes: string, no: string): Promise<boolean> {
    return new Promise((done) => {
      const p = this.panel();
      p.className = 'panel';
      this.header(p, who, title, body);
      p.append(text('p', '', body));
      const row = el('div', 'row');
      const n = this.button(no, true),
        y = this.button(yes);
      n.onclick = () => {
        this.close();
        done(false);
      };
      y.onclick = () => {
        this.close();
        done(true);
      };
      row.append(n, y);
      p.append(row);
      setTimeout(() => y.focus(), 40);
    });
  }
}
