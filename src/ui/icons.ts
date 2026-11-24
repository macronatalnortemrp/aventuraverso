/**
 * Ícones em SVG no estilo de adesivo de jogo: contorno escuro grosso, degradê e um brilho em cima.
 * (Os ícones de moeda e dos personagens são renderizados em 3D, em ui/render3d.ts.)
 */
const INK = '#2b1d14';
let uid = 0;

/** degradê vertical com id único */
function grad(c1: string, c2: string) {
  const id = 'g' + uid++;
  return { id, def: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>` };
}
function icon(body: (g: typeof grad) => string, vb = '0 0 64 64') {
  const defs: string[] = [];
  const g = (a: string, b: string) => {
    const r = grad(a, b);
    defs.push(r.def);
    return r;
  };
  const inner = body(g);
  return `<svg viewBox="${vb}" aria-hidden="true"><defs>${defs.join('')}</defs><g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
}
const shine = (x: number, y: number, rx: number, ry: number, rot = -20) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".55" stroke="none" transform="rotate(${rot} ${x} ${y})"/>`;
const star = (x: number, y: number, r: number, fill: string) =>
  `<path d="M${x} ${y - r}l${r * 0.29} ${r * 0.6} ${r * 0.66} ${r * 0.1}-${r * 0.48} ${r * 0.46} ${r * 0.12} ${r * 0.66}-${r * 0.59}-${r * 0.31}-${r * 0.59} ${r * 0.31} ${r * 0.12}-${r * 0.66}-${r * 0.48}-${r * 0.46} ${r * 0.66}-${r * 0.1}z" fill="${fill}"/>`;

export const ICONS: Record<string, string> = {
  sun: icon((g) => {
    const a = g('#fff27a', '#ffb320');
    const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((r) => `<path d="M29 4h6l-3 9z" fill="#ffcf3a" transform="rotate(${r} 32 32)"/>`).join('');
    return rays + `<circle cx="32" cy="32" r="15" fill="url(#${a.id})"/>` + shine(27, 26, 5, 3);
  }),
  sunflower: icon((g) => {
    const p = g('#ffe066', '#f5a10f');
    const petals = [0, 40, 80, 120, 160, 200, 240, 280, 320].map((r) => `<ellipse cx="32" cy="11" rx="5.5" ry="8" fill="url(#${p.id})" transform="rotate(${r} 32 24)"/>`).join('');
    return `<path d="M32 36v24" stroke-width="5" stroke="#3f7a35"/><path d="M32 52c-7-7-14-5-16-2 4 3 10 5 16 2z" fill="#6bbf4e"/>` + petals + `<circle cx="32" cy="24" r="8.5" fill="#7a4a1c"/>` + shine(29, 21, 3, 2);
  }),
  butterfly: icon((g) => {
    const a = g('#ffb3cf', '#f0679a'),
      b = g('#bfe3ff', '#5aa8f0');
    return `<path d="M30 30C20 10 6 14 8 26s14 8 22 4z" fill="url(#${a.id})"/><path d="M34 30c10-20 24-16 22-4s-14 8-22 4z" fill="url(#${a.id})"/><path d="M30 34c-12 2-18 14-10 18s10-8 10-18z" fill="url(#${b.id})"/><path d="M34 34c12 2 18 14 10 18s-10-8-10-18z" fill="url(#${b.id})"/><rect x="29" y="18" width="6" height="32" rx="3" fill="#4a3427"/><path d="M30 18l-5-9M34 18l5-9" fill="none"/>${shine(16, 20, 4, 2.5)}`;
  }),
  rainbow: icon(() =>
    ['#ff5f5f', '#ffa53a', '#ffe14d', '#62d26f', '#4fa3ff', '#9b6bff']
      .map((c, i) => `<path d="M${8 + i * 3.6} 50a${24 - i * 3.6} ${24 - i * 3.6} 0 0 1 ${48 - i * 7.2} 0" stroke="${c}" stroke-width="4.2" fill="none"/>`)
      .join('') + `<ellipse cx="13" cy="51" rx="9" ry="5" fill="#fff"/><ellipse cx="51" cy="51" rx="9" ry="5" fill="#fff"/>`,
  ),
  moon: icon((g) => {
    const a = g('#fff6c4', '#f0cf5a');
    return `<path d="M40 7a25 25 0 1 0 17 39A21 21 0 0 1 40 7z" fill="url(#${a.id})"/><circle cx="28" cy="40" r="3.5" fill="#e3c25a" stroke="none"/><circle cx="20" cy="27" r="2.5" fill="#e3c25a" stroke="none"/>${shine(22, 18, 5, 3, -40)}`;
  }),
  stars: icon((g) => {
    const a = g('#fff6b0', '#ffc928');
    return star(24, 28, 15, `url(#${a.id})`) + star(47, 41, 10, `url(#${a.id})`) + star(48, 14, 7, `url(#${a.id})`);
  }),
  owl: icon((g) => {
    const a = g('#a98262', '#6e4f37');
    return `<path d="M14 14l8 10M50 14l-8 10" stroke-width="6" stroke="#6e4f37"/><ellipse cx="32" cy="38" rx="19" ry="21" fill="url(#${a.id})"/><ellipse cx="32" cy="45" rx="10" ry="11" fill="#f1d6aa"/><circle cx="24" cy="31" r="7.5" fill="#fff"/><circle cx="40" cy="31" r="7.5" fill="#fff"/><circle cx="25" cy="31" r="3.6" fill="${INK}" stroke="none"/><circle cx="39" cy="31" r="3.6" fill="${INK}" stroke="none"/><path d="M29 37l3 5 3-5z" fill="#ffad33"/>${shine(22, 22, 4, 2.5)}`;
  }),
  firefly: icon((g) => {
    const a = g('#fbff9a', '#c6e83a');
    return `<circle cx="37" cy="42" r="15" fill="#fff8a0" opacity=".5" stroke="none"/><ellipse cx="37" cy="42" rx="8" ry="9" fill="url(#${a.id})"/><ellipse cx="26" cy="29" rx="10" ry="8" fill="#3b3b4e"/><ellipse cx="19" cy="17" rx="8" ry="4.5" fill="#dff1ff" transform="rotate(-30 19 17)"/><ellipse cx="33" cy="16" rx="8" ry="4.5" fill="#dff1ff" transform="rotate(30 33 16)"/>`;
  }),
  /* Dia 2: o céu e as águas */
  cloud: icon((g) => {
    const a = g('#ffffff', '#cfe3f2');
    return `<path d="M16 46a10 10 0 0 1 1-20 13 13 0 0 1 25-4 10 10 0 0 1 8 24z" fill="url(#${a.id})"/>${shine(26, 26, 6, 3)}`;
  }),
  kite: icon((g) => {
    const a = g('#ff8a6a', '#e0483a'),
      b = g('#ffe27a', '#f5b020');
    return `<path d="M32 6l16 18-16 22-16-22z" fill="url(#${a.id})"/><path d="M32 6v40M16 24h32" fill="none" stroke-width="2.4"/><path d="M32 46c-4 4 4 6 0 10s4 5 2 6" fill="none" stroke-width="2.4"/><path d="M28 52l-5 2 5 2zM34 58l5 1-4 3z" fill="url(#${b.id})"/>${shine(27, 17, 4, 2.4, -40)}`;
  }),
  balloon: icon((g) => {
    const a = g('#ff9ecb', '#e0508f');
    return `<ellipse cx="32" cy="25" rx="15" ry="18" fill="url(#${a.id})"/><path d="M29 43h6l-3 4z" fill="#e0508f"/><path d="M32 47c-3 5 3 8 0 13" fill="none" stroke-width="2.4"/>${shine(26, 17, 5, 3, -30)}`;
  }),
  drop: icon((g) => {
    const a = g('#bfe8ff', '#3f9ae6');
    return `<path d="M32 8c10 14 16 24 16 32a16 16 0 0 1-32 0c0-8 6-18 16-32z" fill="url(#${a.id})"/>${shine(26, 34, 4, 6, -20)}`;
  }),
  boat: icon((g) => {
    const a = g('#e8775a', '#b84a32'),
      b = g('#ffffff', '#e6dccb');
    return `<path d="M33 8v30" fill="none" stroke-width="3"/><path d="M35 11l15 23H35z" fill="url(#${b.id})"/><path d="M8 40h48l-7 13H15z" fill="url(#${a.id})"/><path d="M6 56c5-3 8 3 13 0s8 3 13 0 8 3 13 0 8 3 13 0" fill="none" stroke="#3f9ae6" stroke-width="3"/>`;
  }),
  wave: icon((g) => {
    const a = g('#8fd3ff', '#2f7fd0');
    return `<path d="M6 46c6-14 18-22 30-18-8 2-10 10-4 14 6 4 14 0 16-6 4 6 6 10 10 10v10H6z" fill="url(#${a.id})"/>${shine(22, 38, 5, 2.5, -30)}`;
  }),
  buoy: icon((g) => {
    const b = g('#ff7a5a', '#d4442c');
    return `<circle cx="32" cy="32" r="22" fill="url(#${b.id})"/><path d="M17 17l8 8M47 17l-8 8M17 47l8-8M47 47l-8-8" stroke="#fff" stroke-width="8"/><circle cx="32" cy="32" r="22" fill="none"/><circle cx="32" cy="32" r="9" fill="#bfe8ff"/>${shine(22, 20, 5, 3)}`;
  }),
  shell: icon((g) => {
    const a = g('#ffe3d1', '#f2a98a');
    return `<path d="M32 54L10 30a22 22 0 0 1 44 0z" fill="url(#${a.id})"/><path d="M32 54L20 18M32 54V12M32 54l12-36M32 54L12 28M32 54l20-26" fill="none" stroke-width="2.2"/><path d="M26 54h12l-6 6z" fill="#f2a98a"/>`;
  }),
  skyup: icon((g) => {
    const a = g('#8fd0ff', '#3f8fdc');
    return `<rect x="6" y="10" width="52" height="40" rx="10" fill="url(#${a.id})"/><path d="M18 36a6 6 0 0 1 1-12 8 8 0 0 1 15-2 6 6 0 0 1 4 14z" fill="#fff"/><path d="M44 46V22M36 30l8-8 8 8" fill="none" stroke="#fff" stroke-width="4"/>`;
  }),
  seadown: icon((g) => {
    const a = g('#58a9e8', '#1f5f9e');
    return `<rect x="6" y="14" width="52" height="40" rx="10" fill="url(#${a.id})"/><path d="M10 30c5-4 8 4 13 0s8 4 13 0 8 4 13 0 6 2 6 2" fill="none" stroke="#bfe8ff" stroke-width="3"/><path d="M44 18v24M36 34l8 8 8-8" fill="none" stroke="#fff" stroke-width="4"/>`;
  }),
  mist: icon((g) => {
    const a = g('#eef1f4', '#b8c2cb');
    return `<rect x="8" y="14" width="40" height="9" rx="4.5" fill="url(#${a.id})"/><rect x="16" y="28" width="40" height="9" rx="4.5" fill="url(#${a.id})"/><rect x="6" y="42" width="44" height="9" rx="4.5" fill="url(#${a.id})"/>`;
  }),
  board: icon((g) => {
    const a = g('#fff6dc', '#f0dca8');
    return `<path d="M14 54V12M50 54V12" stroke="#6b4a2e" stroke-width="5"/><rect x="8" y="14" width="48" height="30" rx="5" fill="url(#${a.id})"/><path d="M16 24h32M16 31h26M16 38h20" stroke="#172d49" stroke-width="3"/>${star(50, 12, 7, '#ffd23a')}`;
  }),
  great: icon((g) => {
    const a = g('#ffe970', '#ffb81f');
    return `<circle cx="32" cy="32" r="27" fill="url(#${a.id})"/><path d="M19 26q4-6 8 0M37 26q4-6 8 0" fill="none" stroke-width="3.5"/><path d="M17 36q15 18 30 0z" fill="#8a2a2a"/><path d="M24 44q8 5 16 0" fill="#ff7a8a" stroke="none"/>${shine(22, 15, 8, 4)}`;
  }),
  ok: icon((g) => {
    const a = g('#e3f2ff', '#8fc3f0');
    return `<circle cx="32" cy="32" r="27" fill="url(#${a.id})"/><circle cx="23" cy="27" r="4" fill="${INK}" stroke="none"/><circle cx="41" cy="27" r="4" fill="${INK}" stroke="none"/><path d="M21 42h22" stroke-width="4"/>${shine(22, 15, 8, 4)}`;
  }),
  bad: icon((g) => {
    const a = g('#efe6d4', '#c6b392');
    return `<circle cx="32" cy="32" r="27" fill="url(#${a.id})"/><circle cx="23" cy="27" r="4" fill="${INK}" stroke="none"/><circle cx="41" cy="27" r="4" fill="${INK}" stroke="none"/><path d="M21 46q11-10 22 0" fill="none" stroke-width="4"/>${shine(22, 15, 8, 4)}`;
  }),
  search: icon((g) => {
    const a = g('#e8f6ff', '#9fd2f5');
    return `<path d="M39 39l15 15" stroke-width="9" stroke="${INK}"/><path d="M39 39l15 15" stroke-width="4" stroke="#c98a3c"/><circle cx="27" cy="27" r="17" fill="url(#${a.id})" stroke-width="5"/>${star(27, 27, 8, '#ffd23f')}${shine(21, 19, 5, 3)}`;
  }),
  questions: icon((g) => {
    const a = g('#b34560', '#6e2638');
    return `<circle cx="32" cy="32" r="27" fill="url(#${a.id})"/><path d="M24 25a8 8 0 1 1 12 7c-3 2-4 3-4 7" stroke="#fff" stroke-width="6" fill="none"/><circle cx="32" cy="48" r="3.6" fill="#fff" stroke="none"/>${shine(22, 15, 8, 4)}`;
  }),
  globe: icon((g) => {
    const a = g('#6fc3ff', '#2563b8'),
      b = g('#ffe08a', '#d7a64d');
    return `<rect x="22" y="50" width="20" height="8" rx="3" fill="url(#${b.id})"/><circle cx="32" cy="29" r="22" fill="url(#${a.id})"/><path d="M17 22c6-5 12-1 16-4s6 5 2 8-8 1-9 6-8 2-9-3zM38 36c5-2 9 0 11 3s-3 7-8 6-7-7-3-9z" fill="#6ed06a" stroke-width="2.5"/>${shine(24, 16, 7, 4)}`;
  }),
  stories: icon((g) => {
    const a = g('#fffaf0', '#f0e2c4');
    return `<path d="M6 14q13-5 26 2v40q-13-7-26-2z" fill="url(#${a.id})"/><path d="M58 14q-13-5-26 2v40q13-7 26-2z" fill="url(#${a.id})"/><path d="M12 25h13M12 33h13M39 25h13M39 33h13" stroke="#c9b48a" stroke-width="2.5"/><path d="M32 16v40" stroke="#6e2638" stroke-width="4"/>`;
  }),
  people: icon((g) => {
    const a = g('#ffffff', '#dfe7f0');
    return `<path d="M6 58v-8a14 14 0 0 1 28 0v8z" fill="url(#${a.id})"/><path d="M30 58v-8a14 14 0 0 1 28 0v8z" fill="url(#${a.id})"/><circle cx="20" cy="22" r="9" fill="#f0c8a0"/><circle cx="44" cy="22" r="9" fill="#8d5a3b"/><path d="M15 38l5 7 5-7M39 38l5 7 5-7" fill="#6e2638" stroke-width="2"/>`;
  }),
  star: icon((g) => {
    const a = g('#fff27a', '#ffb320');
    return star(32, 34, 27, `url(#${a.id})`) + shine(26, 20, 5, 3);
  }),
  lantern: icon((g) => {
    const a = g('#fff4c2', '#ffc94d');
    return `<path d="M25 9a7 7 0 0 1 14 0" fill="none"/><rect x="21" y="9" width="22" height="7" rx="2" fill="#4a3427"/><rect x="18" y="16" width="28" height="34" rx="6" fill="url(#${a.id})"/><path d="M32 23c5 6 7 10 7 13a7 7 0 0 1-14 0c0-3 2-7 7-13z" fill="#ff9a1f"/><rect x="16" y="50" width="32" height="8" rx="2" fill="#4a3427"/>${shine(24, 22, 3, 5, 0)}`;
  }),
  spark: icon((g) => {
    const a = g('#fffbd0', '#ffc928');
    return `<circle cx="32" cy="32" r="22" fill="#fff3a0" opacity=".45" stroke="none"/><path d="M32 10l6 16 16 6-16 6-6 16-6-16-16-6 16-6z" fill="url(#${a.id})"/>`;
  }),
  lamp: icon((g) => {
    const a = g('#fff7cc', '#ffcf55');
    return `<rect x="29" y="34" width="6" height="26" fill="#5e3d22"/><rect x="18" y="8" width="28" height="5" rx="2" fill="#3a2a1c"/><rect x="20" y="13" width="24" height="20" rx="4" fill="url(#${a.id})"/><rect x="18" y="33" width="28" height="5" rx="2" fill="#3a2a1c"/><path d="M8 23h6M50 23h6M12 10l4 4M52 10l-4 4" stroke="#ffb320" stroke-width="3"/>`;
  }),
  sunmoon: icon((g) => {
    const a = g('#fff27a', '#ffb320'),
      b = g('#4b6fb0', '#1b2f57');
    return `<path d="M32 6a26 26 0 0 0 0 52z" fill="url(#${a.id})"/><path d="M32 6a26 26 0 0 1 0 52z" fill="url(#${b.id})"/><path d="M42 20a10 10 0 1 0 8 15 8 8 0 0 1-8-15z" fill="#fff3b0" stroke-width="2"/>${shine(20, 18, 5, 3)}`;
  }),
  lock: icon((g) => {
    const a = g('#ffe08a', '#c9922c');
    return `<path d="M20 30v-8a12 12 0 0 1 24 0v8" fill="none" stroke-width="6"/><rect x="14" y="28" width="36" height="28" rx="6" fill="url(#${a.id})"/><circle cx="32" cy="40" r="4" fill="${INK}" stroke="none"/><path d="M32 42v7" stroke-width="4"/>`;
  }),
  check: icon((g) => {
    const a = g('#8ee07a', '#2f9e3a');
    return `<circle cx="32" cy="32" r="26" fill="url(#${a.id})"/><path d="M19 33l9 9 18-19" stroke="#fff" stroke-width="7" fill="none"/>`;
  }),
  play: icon((g) => {
    const a = g('#ffe57a', '#f0a91c');
    return `<circle cx="32" cy="32" r="26" fill="url(#${a.id})"/><path d="M26 20l18 12-18 12z" fill="#fff"/>`;
  }),
  badge: `<svg viewBox="0 0 120 140" aria-hidden="true"><defs><linearGradient id="bdg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c5287"/><stop offset="1" stop-color="#132643"/></linearGradient><linearGradient id="bdg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a0"/><stop offset="1" stop-color="#d7a64d"/></linearGradient></defs><g stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"><path d="M30 92l-12 40 24-10 18 18 4-48zM90 92l12 40-24-10-18 18-4-48z" fill="#8a3449"/><circle cx="60" cy="60" r="52" fill="url(#bdg2)"/><circle cx="60" cy="60" r="40" fill="url(#bdg1)"/><path d="M60 26c11 13 17 23 17 33a17 17 0 0 1-34 0c0-10 6-20 17-33z" fill="#ffb02e"/><path d="M60 43c6 7 9 12 9 18a9 9 0 0 1-18 0c0-6 3-11 9-18z" fill="#fff1a8" stroke-width="2.5"/></g><ellipse cx="42" cy="30" rx="12" ry="6" fill="#fff" opacity=".35" transform="rotate(-30 42 30)"/></svg>`,
  /* glifos brancos dos botões redondos (estilo controle de jogo) */
  speaker: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 12h5l7-6v20l-7-6H5z" fill="currentColor"/><path d="M21 11c2 2.6 2 7.4 0 10M24.5 8c3.8 4.6 3.8 11.4 0 16" stroke="currentColor" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg>`,
};
