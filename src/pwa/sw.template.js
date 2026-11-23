/* Service worker do AventuráVerso (gerado no build por vite.config.ts; não editar o dist).
 * Guarda o jogo inteiro no aparelho para jogar sem internet. Quando há internet, o navegador
 * baixa este arquivo de novo; se o jogo mudou, a versão muda, tudo é baixado outra vez e o
 * jogo novo vale a partir da próxima vez que a criança abrir. O jogo não envia nada. */
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = 'aventuraverso-' + VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith('aventuraverso-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* O Safari pede áudio em pedaços (Range). Resposta inteira do cache não toca: recorta aqui. */
async function ranged(req, res) {
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m) return res;
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  const start = m[1] ? +m[1] : size - +m[2];
  const end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // página: tenta a rede (pega versão nova), sem internet usa a guardada
    e.respondWith(
      fetch(req).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match(FILES[0]))),
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(async (hit) => {
      if (hit) return req.headers.has('range') ? ranged(req, hit) : hit;
      return fetch(req);
    }),
  );
});
