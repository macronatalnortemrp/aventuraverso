# aventuráVerso — Um universo de aventuras

Jogo web em **3D de blocos** do Clube de Aventureiros (piloto da Macro Natal Norte, MRP). Mundo 1: Éden: Os Sete Dias.
Roda no computador e no celular, em paisagem e retrato.

**Jogar:** https://macronatalnortemrp.github.io/aventuraverso/

> Leia `CONTEXTO.md` primeiro: é o resumo do projeto e das decisões. Agentes de código seguem `AGENTS.md`.

## Rodar no computador
```bash
npm install
npm run dev        # servidor local
npm test           # testes de unidade (Vitest)
npm run typecheck  # TypeScript
npm run build      # gera dist/
```
Adicione `?debug` ao endereço para expor o estado do jogo no console.

## Publicação
Cada envio para `main` roda typecheck, testes e build no GitHub Actions e publica no GitHub Pages (`.github/workflows/deploy.yml`). Veja `docs/PUBLICACAO.md`.

## Estrutura
```text
src/
  main.ts              liga tudo: personagens, interações, ajuda, moedas, telas e laço
  engine/              gfx.ts (renderizador, luz, céu), camera.ts (órbita 360°), input.ts (toque,
                       joystick, teclado), audio.ts (efeitos opcionais), math.ts (aleatório com semente)
  world/               terrain.ts (alturas, lago, colina, trilhas), camp.ts (zonas do acampamento),
                       batch.ts (geometria agrupada e furo de visão), colliders.ts, interactables.ts,
                       coins.ts, vegetation.ts, critters.ts, fx.ts (partículas), textures.ts (emblemas, placas)
  world/builders/      kid.ts (Aventureiros, Diretora Sol, Pedrito, Tico), props.ts (árvores, cercas, lampiões)
  game/                player.ts (física: andar, pular, nadar, mergulhar), guidance.ts (escada de ajuda),
                       breath.ts (fôlego)
  config/              guidance.ts (tempos da ajuda e do fôlego, a calibrar no piloto)
  persistence/         save.ts (progresso local versionado)
  ui/                  hud.ts (moedas, fôlego, bússola, Tico, diálogos), screens.ts (escolha do avatar)
tests/                 testes de unidade
public/assets/official emblemas oficiais (originais) e web/ (cópias reduzidas, mesma proporção)
docs/                  documentação de produção
prototype/             referências visuais antigas
```

## Dependências
- `three`: motor 3D (stack definida em `docs/TECH_ARCHITECTURE.md`).
- Desenvolvimento: `vite`, `typescript`, `@types/three`, `vitest`. Nenhuma outra dependência.
- Fonte Fredoka via Google Fonts (só a fonte; o jogo não envia dados).

## Estado atual (19/11/2026)
- Mundo 1 explorável: acampamento completo, joystick e botões A/B opcionais, toque no chão, câmera 360°, nado, mergulho com fôlego, 49 moedas, ajuda do Tico com teletransporte ao portal, portais da Missão 1 e do Mundo 2 (trancado).
- Ainda não há missões jogáveis. Quadros dos Ideais ficam apagados até existir `club-texts.json` conferido.
- Todo o código é TypeScript estrito. Pendências técnicas: mover o layout do acampamento para `public/data/world.json` e gerar `package-lock.json`.
- Os PDFs de `docs/source/` não vão para o repositório público (estão no `.gitignore`); ficam no computador do responsável.

---

## Histórico do pacote de pré-produção

### O que mudou na versão 4
- `prototype/base-jogavel-v2.html`: base jogável com uniforme, emblemas oficiais, bandeira, tendas das classes, trilhas, quadros e faixa de distintivos.
- Emblemas das classes, logo da Macro e referência de uniforme incluídos; `docs/LENCO.md` novo.
- Tema atualizado: sem lema; calça dos meninos na cor da saia.

### O que mudou na versão 3
- Estilo 3D de blocos, com câmera que segue o personagem e toque para andar (substitui pintura 2D e cenas ilustradas).
- Three.js + TypeScript + Vite no lugar do Phaser.
- Novo `docs/THEME_AVENTUREIROS.md`: o mundo traduz o Clube (emblema A1, bandeira, tendas das classes, trilhas, ideais, distintivos, Rede Familiar).
- Emblemas oficiais A1 e LA1 incluídos; protótipo de referência em `prototype/`.
- `docs/ERRATA_ROTEIRO.md` lista o que o PDF do roteiro v1 tem de diferente.

### Estado real da entrega
É uma base de produção, não um jogo pronto. Há um protótipo visual, não o código do jogo. As artes conceituais antigas em `assets/concept-art/` valem só como referência de identidade dos avatares.

### Como começar
1. Extraia o ZIP e abra a pasta no Claude Code (ou Codex).
2. Use o texto de `PROMPT_INICIAL.md` como primeira mensagem.
3. Siga `docs/ROADMAP.md`, uma fase por vez, com aprovação a cada uma.

### Ainda falta obter
- Emblema A1 em alta resolução ou vetor, emblemas das quatro classes e logo da Macro (`docs/ASSET_LIST.md`).
- Texto bíblico conferido (Gn 1:1 a 2:3) e autorização do Hino.
- Validações de tema em `docs/THEME_AVENTUREIROS.md` (seção 14).
- Formulário externo do piloto.
