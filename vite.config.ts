import { defineConfig } from 'vite';

// GitHub Pages publica em https://macronatalnortemrp.github.io/aventuraverso/
export default defineConfig({
  base: '/aventuraverso/',
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
  test: { environment: 'node' },
});
