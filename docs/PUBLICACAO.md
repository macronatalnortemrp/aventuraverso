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

## Cuidados
- O ZIP tem imagens grandes (emblemas das classes e artes conceituais, cerca de 14 MB). É aceitável, mas dá para reduzir as de `assets/concept-art/` depois.
- Não suba dados de crianças, formulários preenchidos ou chaves.
