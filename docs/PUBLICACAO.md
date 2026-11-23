# PUBLICACAO.md — GitHub e GitHub Pages

Conta: https://github.com/macronatalnortemrp. Repositório: https://github.com/macronatalnortemrp/aventuraverso (criado em 19/11/2026).

## Criar o repositório
1. No GitHub, crie o repositório `aventuraverso` (público, para usar o Pages gratuito), sem README.
2. No computador, extraia o ZIP, abra a pasta e rode:
```bash
git init -b main
git add .
git commit -m "chore: pacote inicial aventuráVerso"
git remote add origin https://github.com/macronatalnortemrp/aventuraverso.git
git push -u origin main
```
3. O Claude Code pode fazer os próximos commits direto, depois que você configurar o acesso (login do `git`/`gh`) no seu computador. Nunca coloque tokens no código.

## Publicar no GitHub Pages
- Em Settings > Pages, escolha "GitHub Actions" como fonte.
- O endereço será `https://macronatalnortemrp.github.io/aventuraverso/`.
- No Vite, configure `base: "/aventuraverso/"`.
- O workflow `.github/workflows/deploy.yml` roda typecheck, testes e build e publica a cada envio para `main`.
- Os PDFs de `docs/source/` ficam fora do repositório público (`.gitignore`).

## Jogo instalável (PWA)
- Nome do app: **AventuráVerso**; embaixo do ícone aparece **Aventurá** (o nome inteiro é cortado em alguns iPhones).
- `public/manifest.webmanifest` e ícones em `public/icons/` (192, 512, maskable 512 e `apple-touch-icon` 180).
- O build gera `dist/sw.js` (plugin em `vite.config.ts`, sem dependência nova) com a lista de todos os arquivos: depois da primeira visita o jogo inteiro, com vozes e música, fica no aparelho e abre sem internet. Cerca de 10 MB.
- Sincronizar: com internet, o navegador confere o `sw.js` ao abrir o jogo e quando a conexão volta. Se o jogo mudou, baixa tudo de novo e a versão nova vale na próxima abertura. Nada é enviado; o progresso continua só no aparelho.
- Android (Chrome): botão **Instalar o jogo** na tela inicial abre o pedido nativo. Só aparece quando o Chrome permite instalar.
- iPhone/iPad: o Safari não tem pedido de instalação; o mesmo botão abre um cartão com o passo a passo (Compartilhar > Adicionar à Tela de Início > Adicionar).
- Já instalado, o botão não aparece. O service worker só roda no build publicado, não no `npm run dev`.

## Cuidados
- O ZIP tem imagens grandes (emblemas das classes e artes conceituais, cerca de 14 MB). É aceitável, mas dá para reduzir as de `assets/concept-art/` depois.
- Não suba dados de crianças, formulários preenchidos ou chaves.
