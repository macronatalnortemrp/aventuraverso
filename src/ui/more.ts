/*
 * Aviso de "tem mais abaixo": quando um cartão ou uma fala não cabe na tela (celular deitado),
 * aparece uma setinha dourada na borda de baixo. Tocar nela rola o texto; ela some no fim.
 */

/** Liga o aviso a `scroller` (o que rola). O botão fica em `host` (a camada que cobre a tela). */
export function moreHint(scroller: HTMLElement, host: HTMLElement) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'more';
  b.tabIndex = -1; // a rolagem pelo teclado já funciona; o aviso é só para o toque
  b.setAttribute('aria-hidden', 'true');
  b.innerHTML = '<span>Tem mais abaixo</span> <b>▼</b>';
  host.append(b);
  b.onclick = (e) => {
    e.stopPropagation();
    scroller.scrollBy({ top: Math.max(60, scroller.clientHeight * 0.7), behavior: 'smooth' });
  };

  let raf = 0;
  const update = () => {
    raf = 0;
    const shown = host.classList.contains('show');
    const left = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
    const on = shown && left > 6;
    b.classList.toggle('on', on);
    if (!on) return;
    const r = scroller.getBoundingClientRect(),
      h = host.getBoundingClientRect();
    b.style.left = `${r.left - h.left + r.width / 2}px`;
    b.style.top = `${r.bottom - h.top}px`;
  };
  const later = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  scroller.addEventListener('scroll', later, { passive: true });
  addEventListener('resize', later);
  new ResizeObserver(later).observe(scroller);
  new MutationObserver(() => {
    later();
    setTimeout(later, 260); // depois da animação de abrir o cartão
  }).observe(scroller, { childList: true, subtree: true, characterData: true });
  new MutationObserver(() => {
    later();
    setTimeout(later, 260);
  }).observe(host, { attributes: true, attributeFilter: ['class'] });
  return update;
}
