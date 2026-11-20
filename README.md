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
                       joystick, teclado), audio.ts (efeitos), ambient.ts (sons posicionais),
                       speech.ts (leitura em voz), math.ts (aleatório com semente)
  world/               terrain.ts (alturas, lago, colina, trilhas), camp.ts (zonas do acampamento),
                       batch.ts (geometria agrupada e furo de visão), colliders.ts, interactables.ts,
                       coins.ts, vegetation.ts, critters.ts, fx.ts (partículas), textures.ts (emblemas, placas),
                       daylight.ts (dia, escuro total, estrelas e lanterna)
  world/builders/      kid.ts (Aventureiros, Diretora Sol, Pedrito, Tico), props.ts (árvores, cercas, lampiões)
  game/                player.ts (física: andar, pular, nadar, mergulhar), guidance.ts (escada de ajuda),
                       breath.ts (fôlego), quiz.ts (tentativas sem punição)
  game/day01/          state.ts (etapas do Dia 1, puro e salvo), mission.ts (condução da missão)
  config/              guidance.ts (tempos da ajuda e do fôlego, a calibrar no piloto)
  persistence/         save.ts (progresso local versionado)
  ui/                  hud.ts (moedas, fôlego, bússola, Tico, diálogos), screens.ts (escolha do avatar),
                       task.ts (leitura, perguntas, frase, dia/noite, recompensa, feedback), icons.ts
tests/                 testes de unidade
public/assets/official emblemas oficiais (originais) e web/ (cópias reduzidas, mesma proporção)
public/data/           days/day01.json (textos da missão), content/bible-arc1898.json (texto conferido)
docs/                  documentação de produção
prototype/             referências visuais antigas
```

## Dependências
- `three`: motor 3D (stack definida em `docs/TECH_ARCHITECTURE.md`).
- Desenvolvimento: `vite`, `typescript`, `@types/three`, `vitest`. Nenhuma outra dependência.
- Fonte Fredoka via Google Fonts (só a fonte; o jogo não envia dados).

## Estado atual (20/11/2026)
- **Mundo 1 explorável:** acampamento completo, toque no chão, joystick e botões A/B opcionais, câmera 360°, nado, mergulho com fôlego, 49 moedas, ajuda do Tico com teletransporte.
- **Missão 1 "A Luz no Acampamento" jogável** (`docs/DAY_01.md`), pelo portal da Colina do Globo: escuro total com lanterna; três faíscas guiadas por sino, água e grilo (som posicional); Pedrito e a pergunta do lenço; "Haja luz" com blocos de palavras e o lampião central; separar dia e noite com o amanhecer; três convites nos murais com as perguntas do Clube; o Globo do Éden acende com a Voz. Recompensa: Distintivo do Acampamento "Primeira Luz" (não oficial), estrelas, lanterna aprimorada e missão real opcional. Termina com o feedback do piloto (`feedback.day01`, só no aparelho).
- Salva a cada etapa e retoma de onde parou. Respostas erradas não tiram nada: acolhe, dá pista e, na terceira, mostra a resposta explicando.
- Textos da missão em `public/data/days/day01.json`.

## Pendências de conteúdo (precisam de conferência humana)
- **Texto bíblico:** `public/data/content/bible-arc1898.json` está vazio. Enquanto não houver texto conferido, as leituras usam o modo "Bíblia na Mão" (referência para ler na Bíblia impressa). Quando o arquivo receber `"Gn 1:1"` a `"Gn 1:5"`, o jogo passa a mostrar o Pergaminho e a montar a frase com as palavras de Gn 1:3.
- **Duas perguntas desligadas** em `day01.json` (`beforeLight` e `lightName`), porque a resposta depende do texto bíblico. Basta revisar e trocar `"enabled": false` por `true`.
- **Distratores** das perguntas do Clube são sugestões a revisar com a liderança (`docs/QUIZ_MAP.md`).
- `src/config/pilot.ts` ainda não existe com o endereço do formulário dos responsáveis.

## Pendências técnicas
- Mover o layout do acampamento para `public/data/world.json` e gerar `package-lock.json`.
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
