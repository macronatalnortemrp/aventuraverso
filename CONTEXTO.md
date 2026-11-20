# CONTEXTO.md — aventuráVerso (leia este arquivo primeiro)

Atualizado em 19/11/2026. Resumo do pacote `biblia-visual-pack` v4 mais as decisões novas de jogabilidade. Serve para abrir uma conversa nova sem reler tudo: só abra os arquivos de `docs/` quando a tarefa pedir (mapa na seção 9).

## 1. O que é
- Jogo web infantil (6 a 9 anos), **mundo 3D de blocos**, com forte tema do Clube de Aventureiros. Piloto de teste da Macro Natal Norte (MRP). Roda em computador e celular, paisagem e retrato.
- **Nome oficial do projeto e do jogo: aventuráVerso — "Um universo de aventuras"** (decidido em 19/11/2026). Os docs antigos ainda dizem "Bíblia Visual"; onde aparecer, ler como aventuráVerso. "Mundo 1: Éden: Os Sete Dias" é a primeira jornada. Repositório e `base` do Vite devem usar o novo nome.
- Estado real: código em `src/` (Three.js + TypeScript + Vite) com o Mundo 1 explorável, publicado no GitHub Pages em https://macronatalnortemrp.github.io/aventuraverso/. A Missão 1 (Dia 1) está jogável, com leituras no modo "Bíblia na Mão" até o texto bíblico conferido entrar em `public/data/content/bible-arc1898.json`.

## 2. Premissa e loop
Acampamento do Livro Aberto: as páginas do Livro dos Sete Dias sumiram e o Globo do Éden está apagado. A criança explora, aprende o que a Bíblia ensina, ajuda amigos e recupera as páginas. Loop: **Explorar → Descobrir → Fazer/Servir → Contar**. 7 dias, 6 a 7 etapas cada, 10 a 15 min por dia, salvamento a cada etapa. Dia 1 ("A Luz no Acampamento"): escuro total com lanterna, três faíscas, Pedrito, "Haja luz", Globo.

## 3. Stack e arquitetura
Three.js + TypeScript + Vite; HTML/CSS por cima do canvas para interface; GitHub Pages + Actions. Sem engine pesada, sem backend, sem biblioteca de física nem de pathfinding (A* próprio em grade). Personagens e cenário **gerados por código** a partir de parâmetros e JSON (`public/data/world.json`, `days/dayNN.json`, `content/*.json`). Estrutura de `src/` em `docs/TECH_ARCHITECTURE.md`.
Desempenho (meta: celular de entrada): geometria estática agrupada, instanciar repetições, uma luz com sombra (1024), sem pós-processamento, pixel ratio máx. 2 (1,5 no modo leve), FPS medido, carga inicial até ~3 MB.

## 4. Regras inegociáveis
- Estilo: blocos coloridos, acolhedor, luz quente. Rosto expressivo obrigatório (nunca olhos vazios).
- Emblemas (A1, LA1, classes, Macro) só dos arquivos de `public/assets/official/`, em peça plana, proporção original. Nunca recriar, recolorir ou distorcer.
- Uniforme: camisa branca, saia (meninas) ou calça (meninos) azul-marinho, cinto, meias brancas, sapato preto, lenço vinho com A1. Diretora Sol: lenço de líder com LA1. Roupa de aventura é conjunto alternativo desbloqueável.
- Ideais: só Voto, Lei, Hino e Voto à Bíblia (não existe "lema"). Textos exatos do Guia, em arquivo conferido por pessoa. Não escrever versículos de memória.
- Deus nunca é representado visualmente: só Voz, luz e Globo. Não inventar símbolos religiosos, especialidades ou significados.
- Crianças: sem dados pessoais, compras, anúncios, ranking público, **cronômetro de pressão** nem penalização de erros. Progresso só local. Pistas graduais.
- Acessibilidade: toque, mouse e teclado; todo texto falado visível; áudio opcional; respeitar redução de movimento.
- Não declarar tarefa pronta sem build e testes. Trocar stack ou adicionar dependência exige justificativa.

## 5. Mundo e elenco
- Mundo único e contínuo, todas as zonas visíveis desde o início: Colina do Globo (Jesus), Clareira das Tendas (Família), Lago, Mata, Cais, Observatório (Natureza). Tendas das 4 classes (Abelhinhas, Luminares, Edificadores, Mãos Ajudadoras), mastro com bandeira, placas das 4 trilhas, Quadros dos Ideais, Mesa da Família.
- Paleta: vinho `#6E2638`, azul-marinho `#172D49`, creme `#E9E1CF`, verde `#66845B`, dourado `#D7A64D`, marrom `#4A4038`.
- Seis avatares jogáveis (3 meninos, 3 meninas), Diretora Sol, Pedrito (visitante curioso), Tico (mascote-guia, sagui de blocos provisório), NPCs a partir do Dia 2. Recompensas: Distintivos do Acampamento (não oficiais), estrelas, Quadros acesos.
- Movimento atual: câmera 3D que segue o personagem, **toque/clique no chão para andar** (A* em grade), hotspots com brilho, teclado (setas/WASD, Tab, Enter), lista HTML acessível de lugares.

## 6. Decisões novas (19/11/2026)
Jogabilidade inspirada no Super Bear Adventure, sem copiar arte, nomes ou interface (detalhes em `docs/JOGABILIDADE_REFERENCIA.md`). **Sem violência e sem multiplayer.**
- **Controles:** manter toque no chão. Na abertura o jogador pode ligar joystick (esquerda) e botões A e B (ligar/desligar depois no botão 🎮).
- **A:** pulo simples; na água, afunda (mergulha) e alterna subir/descer. **A e depois toque em B:** pulo mais alto; com direção pressionada vira pulo-mergulho para frente. **Segurar B durante o pulo:** descida forte no chão (marretada), com onda de poeira.
- **Fôlego:** círculo tipo loading debaixo d'água (azul, laranja perto da metade, vermelho depois). Ao zerar, uma bolha leva à superfície, sem punição.
- **Moedas** coletáveis, inclusive no fundo do lago e no alto (exigem pulo alto).
- **Ajuda de orientação:** se o jogador parecer perdido, bússola e depois oferta de transporte ao portal da missão.
- **Portais e mundos:** cada missão do Éden tem um portal. Ao concluir todas, abre-se outro portal (visual diferente) para uma nova história com cenário próprio (ex.: José no Egito: areia, pirâmides, palmeiras). Conteúdo bíblico de cada mundo só de fonte conferida.
- **Demo jogável:** `aventuraverso-demo.html` (HTML único, Three.js r128 por CDN). Referência de mecânica, não é o código final em módulos.

## 7. Roadmap (`docs/ROADMAP.md`)
Fase 0 fundação, 1 mundo base e identidade (gate de desempenho em celular), 2 primeira fatia vertical, 3 Dia 1 + piloto com 5 a 8 crianças, 4 Dias 2 a 7, 5 pós-piloto. Proposta de Fase 1.5 "Jogabilidade" em `docs/JOGABILIDADE_REFERENCIA.md`, sujeita a aprovação.

## 8. Pendências abertas
- Relação entre os nomes aventuráVerso e Bíblia Visual; nome do repositório (docs dizem `biblia-visual`) e `base` do Vite.
- Para que servem as moedas e como se chamam; mergulho no Dia 1 (escuro total); teletransporte automático ou só com aceite; favicon/identidade (ver `favicon.svg`) e emblemas oficiais de Desbravadores.
- Do pacote: A1 em alta resolução, emblema MRP, uniforme masculino, tradução ARC 1898 e conferência dos 34 versículos (Gn 1:1 a 2:3), autorização do Hino, formulário externo do piloto, validações do `THEME_AVENTUREIROS.md` seção 14.

## 9. Mapa dos arquivos (abrir só se precisar)
| Preciso de... | Abrir |
|---|---|
| Regras do agente | `AGENTS.md` |
| Estrutura técnica, pastas, desempenho | `docs/TECH_ARCHITECTURE.md` |
| Regras de jogo, leitura, respostas | `docs/GAME_DESIGN.md` |
| Estilo visual, câmera, luz | `docs/ART_BIBLE.md` |
| Tema do Clube (zonas, trilhas, distintivos) | `docs/THEME_AVENTUREIROS.md` |
| Avatares, Sol, Tico, Pedrito | `docs/CHARACTERS.md` |
| Lenço | `docs/LENCO.md` |
| Dia 1, perguntas, abertura | `docs/DAY_01.md`, `docs/QUIZ_MAP.md`, `docs/INTRO_SEQUENCE.md` |
| Feedback do piloto | `docs/PILOT_FEEDBACK.md` |
| Fases | `docs/ROADMAP.md` |
| Fontes e decisões aprovadas | `docs/SOURCES_AND_DECISIONS.md`, `docs/ERRATA_ROTEIRO.md` |
| Inventário de assets | `docs/ASSET_LIST.md` |
| GitHub e Pages | `docs/PUBLICACAO.md` |
| Jogabilidade nova | `docs/JOGABILIDADE_REFERENCIA.md` |
| Referência visual | `prototype/base-jogavel-v2.html` |
