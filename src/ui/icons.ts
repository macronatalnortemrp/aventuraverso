/** Ícones desenhados em SVG (nada de emoji): objetos do dia e da noite, carinhas e temas do feedback. */
const svg = (body: string) => `<svg viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;

export const ICONS: Record<string, string> = {
  sun: svg(
    '<g stroke="#f5a623" stroke-width="5" stroke-linecap="round">' +
      [0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<line x1="32" y1="6" x2="32" y2="13" transform="rotate(${a} 32 32)"/>`).join('') +
      '</g><circle cx="32" cy="32" r="15" fill="#ffd23f" stroke="#f5a623" stroke-width="3"/>',
  ),
  sunflower: svg(
    '<path d="M32 40v20" stroke="#4f8a45" stroke-width="4"/><path d="M32 52c-6-6-12-4-14-2 4 2 9 4 14 2z" fill="#5f9a4c"/>' +
      [0, 40, 80, 120, 160, 200, 240, 280, 320].map((a) => `<ellipse cx="32" cy="12" rx="5" ry="9" fill="#ffc83d" transform="rotate(${a} 32 26)"/>`).join('') +
      '<circle cx="32" cy="26" r="8" fill="#7a4a1c"/>',
  ),
  butterfly: svg(
    '<ellipse cx="20" cy="24" rx="12" ry="10" fill="#f29ab0"/><ellipse cx="44" cy="24" rx="12" ry="10" fill="#f29ab0"/><ellipse cx="22" cy="42" rx="9" ry="8" fill="#9ec9ff"/><ellipse cx="42" cy="42" rx="9" ry="8" fill="#9ec9ff"/><rect x="29" y="18" width="6" height="30" rx="3" fill="#3a2a1c"/><path d="M31 18l-5-8M33 18l5-8" stroke="#3a2a1c" stroke-width="2.5" stroke-linecap="round"/>',
  ),
  rainbow: svg(
    ['#e94f4f', '#f5a623', '#ffd23f', '#5fbf5f', '#4a90e2', '#8e5fd8']
      .map((c, i) => `<path d="M${6 + i * 3.5} 50a${26 - i * 3.5} ${26 - i * 3.5} 0 0 1 ${52 - i * 7} 0" stroke="${c}" stroke-width="3.6" fill="none"/>`)
      .join(''),
  ),
  moon: svg('<path d="M40 8a24 24 0 1 0 16 38A20 20 0 0 1 40 8z" fill="#f6e7a8" stroke="#d7b95a" stroke-width="2.5"/><circle cx="30" cy="38" r="3" fill="#e6d48a"/><circle cx="22" cy="26" r="2" fill="#e6d48a"/>'),
  stars: svg(
    [[22, 24, 12], [44, 38, 9], [46, 14, 6]]
      .map(([x, y, r]) => `<path d="M${x} ${y - r}l${r * 0.3} ${r * 0.7} ${r * 0.7} ${r * 0.3}-${r * 0.7} ${r * 0.3}-${r * 0.3} ${r * 0.7}-${r * 0.3}-${r * 0.7}-${r * 0.7}-${r * 0.3} ${r * 0.7}-${r * 0.3}z" fill="#ffe27a"/>`)
      .join(''),
  ),
  owl: svg(
    '<ellipse cx="32" cy="38" rx="18" ry="20" fill="#8a6a4e"/><path d="M16 22l6 8M48 22l-6 8" stroke="#8a6a4e" stroke-width="6" stroke-linecap="round"/><ellipse cx="32" cy="44" rx="10" ry="11" fill="#e9c99b"/><circle cx="25" cy="31" r="7" fill="#fff"/><circle cx="39" cy="31" r="7" fill="#fff"/><circle cx="25" cy="31" r="3.5" fill="#2a1a12"/><circle cx="39" cy="31" r="3.5" fill="#2a1a12"/><path d="M29 37l3 4 3-4z" fill="#f5a623"/>',
  ),
  firefly: svg(
    '<circle cx="36" cy="42" r="14" fill="#fff59a" opacity=".55"/><circle cx="36" cy="42" r="7" fill="#e8f560"/><ellipse cx="26" cy="28" rx="9" ry="7" fill="#3a3a48"/><ellipse cx="20" cy="18" rx="7" ry="4" fill="#cfe8ff" opacity=".9" transform="rotate(-30 20 18)"/><ellipse cx="32" cy="17" rx="7" ry="4" fill="#cfe8ff" opacity=".9" transform="rotate(30 32 17)"/>',
  ),
  great: svg('<circle cx="32" cy="32" r="28" fill="#ffd23f" stroke="#c99a1c" stroke-width="3"/><circle cx="22" cy="26" r="4" fill="#3a2a1c"/><circle cx="42" cy="26" r="4" fill="#3a2a1c"/><path d="M18 38q14 16 28 0z" fill="#7a2a2a"/>'),
  ok: svg('<circle cx="32" cy="32" r="28" fill="#cfe8ff" stroke="#6f97c4" stroke-width="3"/><circle cx="22" cy="26" r="4" fill="#3a2a1c"/><circle cx="42" cy="26" r="4" fill="#3a2a1c"/><path d="M20 42h24" stroke="#3a2a1c" stroke-width="4" stroke-linecap="round"/>'),
  bad: svg('<circle cx="32" cy="32" r="28" fill="#e7dcc6" stroke="#9b8c6c" stroke-width="3"/><circle cx="22" cy="26" r="4" fill="#3a2a1c"/><circle cx="42" cy="26" r="4" fill="#3a2a1c"/><path d="M20 46q12-10 24 0" stroke="#3a2a1c" stroke-width="4" fill="none" stroke-linecap="round"/>'),
  tico: svg('<ellipse cx="14" cy="24" rx="8" ry="11" fill="#fff"/><ellipse cx="50" cy="24" rx="8" ry="11" fill="#fff"/><circle cx="32" cy="34" r="18" fill="#8a6a4e"/><ellipse cx="32" cy="38" rx="12" ry="11" fill="#e9c99b"/><circle cx="26" cy="34" r="4" fill="#2a1a12"/><circle cx="38" cy="34" r="4" fill="#2a1a12"/><path d="M27 43q5 4 10 0" stroke="#7a2a2a" stroke-width="2.4" fill="none"/>'),
  search: svg('<circle cx="27" cy="27" r="15" fill="#e6f3ff" stroke="#172D49" stroke-width="5"/><path d="M38 38l14 14" stroke="#172D49" stroke-width="7" stroke-linecap="round"/><path d="M22 22l3 6 6 2-6 2-3 6-3-6-6-2 6-2z" fill="#ffd23f"/>'),
  questions: svg('<circle cx="32" cy="32" r="27" fill="#6E2638"/><path d="M24 25a8 8 0 1 1 12 7c-3 2-4 3-4 7" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="32" cy="47" r="3.5" fill="#fff"/>'),
  globe: svg('<circle cx="32" cy="30" r="22" fill="#2a6fb5" stroke="#D7A64D" stroke-width="4"/><path d="M18 24c6-5 12-1 16-4s6 5 2 8-8 1-9 6-8 2-9-3zM38 38c5-2 9 0 11 3s-3 7-8 6-7-7-3-9z" fill="#66b85b"/><rect x="24" y="52" width="16" height="6" rx="2" fill="#D7A64D"/>'),
  stories: svg('<path d="M8 14q12-4 24 2v38q-12-6-24-2z" fill="#fffaf0" stroke="#6E2638" stroke-width="3"/><path d="M56 14q-12-4-24 2v38q12-6 24-2z" fill="#fffaf0" stroke="#6E2638" stroke-width="3"/><path d="M14 24h12M14 32h12M38 24h12M38 32h12" stroke="#c9b48a" stroke-width="2.5"/>'),
  people: svg('<circle cx="22" cy="20" r="8" fill="#f0c8a0"/><circle cx="42" cy="20" r="8" fill="#8d5a3b"/><path d="M8 54v-8a14 14 0 0 1 28 0v8z" fill="#fafafa" stroke="#172D49" stroke-width="2.5"/><path d="M28 54v-8a14 14 0 0 1 28 0v8z" fill="#fafafa" stroke="#172D49" stroke-width="2.5"/><path d="M16 34l6 6 6-6M36 34l6 6 6-6" fill="#6E2638"/>'),
  badge: `<svg viewBox="0 0 120 140" aria-hidden="true"><path d="M30 92l-12 40 24-10 18 18 4-48zM90 92l12 40-24-10-18 18-4-48z" fill="#6E2638"/><circle cx="60" cy="60" r="52" fill="#172D49" stroke="#D7A64D" stroke-width="8"/><circle cx="60" cy="60" r="38" fill="#fff6df"/><path d="M60 26c10 12 16 22 16 32a16 16 0 0 1-32 0c0-10 6-20 16-32z" fill="#ffb02e"/><path d="M60 42c6 7 9 12 9 18a9 9 0 0 1-18 0c0-6 3-11 9-18z" fill="#fff1a8"/><path d="M38 86h44" stroke="#D7A64D" stroke-width="5" stroke-linecap="round"/></svg>`,
  star: svg('<path d="M32 5l8 17 19 3-14 13 4 19-17-9-17 9 4-19L5 25l19-3z" fill="#ffd23f" stroke="#c99a1c" stroke-width="3" stroke-linejoin="round"/>'),
  speaker: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor"/><path d="M21 11c2 2.6 2 7.4 0 10M24.5 8c3.8 4.6 3.8 11.4 0 16" stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
  lantern: svg('<rect x="22" y="8" width="20" height="6" rx="2" fill="#3a2a1c"/><path d="M26 6a6 6 0 0 1 12 0" stroke="#3a2a1c" stroke-width="3" fill="none"/><rect x="20" y="14" width="24" height="34" rx="5" fill="#ffe7a0" stroke="#3a2a1c" stroke-width="3"/><path d="M32 22c4 5 6 9 6 12a6 6 0 0 1-12 0c0-3 2-7 6-12z" fill="#ffb02e"/><rect x="18" y="48" width="28" height="7" rx="2" fill="#3a2a1c"/>'),
};
