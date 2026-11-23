import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const BASE = '/aventuraverso/';

/**
 * Gera dist/sw.js com a lista de todos os arquivos do build, para o jogo funcionar sem internet.
 * A versão é o hash do conteúdo: qualquer mudança no jogo faz os aparelhos baixarem tudo de novo.
 * Feito aqui (e não com vite-plugin-pwa) para não adicionar dependência.
 */
function serviceWorker(): Plugin {
  let out = 'dist';
  return {
    name: 'aventuraverso-sw',
    apply: 'build',
    configResolved(c) {
      out = c.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (d: string) => {
        for (const n of readdirSync(d)) {
          const p = join(d, n);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(out, p).split('\\').join('/'));
        }
      };
      walk(out);
      const list = files.filter((f) => f !== 'sw.js' && !f.endsWith('.map')).sort();
      const h = createHash('sha1');
      for (const f of list) h.update(f).update(readFileSync(join(out, f)));
      const urls = ['./', ...list.filter((f) => f !== 'index.html').map((f) => './' + encodeURI(f))];
      const sw = readFileSync('src/pwa/sw.template.js', 'utf8')
        .replace('__VERSION__', h.digest('hex').slice(0, 12))
        .replace('__FILES__', JSON.stringify(urls));
      writeFileSync(join(out, 'sw.js'), sw);
    },
  };
}

// GitHub Pages publica em https://macronatalnortemrp.github.io/aventuraverso/
export default defineConfig({
  base: BASE,
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  plugins: [serviceWorker()],
  test: { environment: 'node' },
});
