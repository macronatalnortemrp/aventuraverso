# TECH_ARCHITECTURE.md — Arquitetura técnica (3D em blocos)

## Stack
- **Three.js + TypeScript + Vite** para o mundo 3D.
- HTML/CSS para menus, diálogos, leitura, perguntas, HUD, feedback e acessibilidade.
- GitHub + GitHub Pages + GitHub Actions para publicação de teste.
- Sem engine pesada. Phaser deixa de ser usado. Qualquer dependência extra precisa de justificativa no README.

## Plataformas
Computador (mouse e teclado) e celular/tablet (toque), em paisagem e em retrato. WebGL 1 ou 2. Se o aparelho não abrir WebGL, mostrar mensagem amigável (e, se possível, um "modo leve" sem sombras antes de desistir).

## Organização sugerida
```text
src/
  app/                 inicialização, rotas de tela
  config/              pilot.ts (feedback do piloto), quality.ts
  engine/              renderer, loop, câmera, luzes, input, áudio
  world/
    builders/          kid.ts, tico.ts, props.ts, globe.ts, flag.ts
    camp.ts            monta o acampamento a partir de data/world.json
    pathing.ts         grade de obstáculos + A*
    hotspots.ts
  game/                dias, etapas, eventos, progresso
  ui/                  componentes e telas HTML
  persistence/
  accessibility/
public/
  assets/official/     emblemas oficiais
  data/
    world.json         props, zonas, obstáculos, hotspots
    days/day01.json    etapas do dia
    content/           bible-arc1898.json, quiz.json, club-texts.json
docs/
prototype/             referência visual
```

## Mundo e movimento
- **Toque ou clique no chão** → raycast até o plano do terreno → ponto de destino. O personagem anda até lá.
- Navegação por **grade de obstáculos** (células de 1 unidade) e A* próprio (sem biblioteca) para contornar tendas, árvores e lago. Destino em obstáculo vai para a célula livre mais próxima.
- **Hotspots** (itens, pessoas, quadros): toque faz o personagem ir até um ponto de parada e interagir. Têm brilho pulsante discreto e alvo de toque grande (a área clicável é maior que o desenho).
- Teclado: setas/WASD movem; Tab percorre os hotspots; Enter interage. Existe também uma **lista HTML de lugares e itens interativos** como alternativa acessível ao canvas.
- Câmera: perspectiva fixa que segue o personagem, com campo de visão maior em retrato. Câmeras dirigidas nas cerimônias.

## Dados em arquivos
`world.json` descreve o mundo (props, zonas, obstáculos, hotspots, pontos de NPC por dia). `dayNN.json` descreve as etapas (tipo, condições, diálogo, recompensa, trilha e pilar). Adicionar um dia deve ser, em boa parte, adicionar JSON.

## Conteúdo sensível em arquivo
- `bible-arc1898.json`: versículos de Gn 1:1 a 2:3 conferidos por uma pessoa. O agente não escreve versículos de memória.
- `club-texts.json`: Voto, Lei e Voto à Bíblia exatamente como no Guia.
- `quiz.json`: perguntas e respostas de `QUIZ_MAP.md`, com explicação e fonte.

## Emblemas oficiais
Carregar o PNG como textura e aplicar em uma peça plana (decalque), **com a proporção da imagem** e filtro de mipmap/anisotropia para não ficar borrado. Placas, lenço, bandeira e portão usam o mesmo mecanismo. O emblema A1 atual tem 236x220 px; para uso grande, pedir versão em maior resolução.

## Desempenho (meta: celular de entrada)
- Geometria estática agrupada por material (mesclar malhas) para poucas chamadas de desenho. Instanciar repetições (árvores, bandeirolas).
- Materiais simples (sem texturas pesadas). No máximo **uma** luz com sombra, mapa de 1024. Sem pós-processamento.
- Limitar a resolução de renderização (pixel ratio máximo 2, e 1,5 em modo leve).
- Medir quadros por segundo; abaixar a qualidade automaticamente e permitir "modo leve" nas configurações.
- Pausar o jogo quando a aba ficar oculta.
- Evitar alocação por quadro no laço principal.

## Interface e acessibilidade
- HTML por cima do canvas. Alvos de toque grandes, áreas seguras, `touch-action: none` no canvas, sem rolagem acidental.
- Texto sempre visível para tudo que for falado. Contraste adequado, redução de movimento respeitada.
- Orientação: funcionar nas duas. Em retrato, aumentar o campo de visão e reposicionar o HUD.

## Persistência
LocalStorage ou IndexedDB: versão do save, `avatarId`, `nick` (apelido, só no aparelho, editável e apagável), `introSeen` (abertura já vista), dificuldade, dia/etapa concluídos, itens e distintivos, quadros acesos, preferências de áudio e qualidade, `feedback.dayNN`. Sem outros dados pessoais. Schema versionado com migração simples.

## Piloto e feedback
O jogo não envia dados por rede. O feedback do responsável abre formulário externo em nova aba (`src/config/pilot.ts`). Veja `PILOT_FEEDBACK.md`.

## Áudio e fala
- Só vozes gravadas do jogo (Kokoro, `scripts/voices/`), tocadas após o primeiro toque (exigência do iOS). **Nunca a voz do aparelho** (SpeechSynthesis, VoiceOver, TalkBack), decisão de 21/11/2026: o que não tem gravação fica só na tela, e o botão "Ouvir" só aparece quando há gravação.
- Efeitos simples com Web Audio (sino, água, grilo, brilho), opcionais. No Dia 1, som posicional ajuda a achar as faíscas.
- Nunca depender de áudio para informação essencial.
- Abertura: trilha composta por código com Web Audio (`src/engine/music.ts`), que abaixa sob a narração. Frases com o apelido da criança não têm áudio gravado e ficam só na legenda.

## Testes
- Chrome Android, Safari iOS e Chromium no computador, em paisagem e retrato.
- Aparelho de entrada e rede lenta. Medir quadros por segundo no acampamento completo desde a Fase 1.
- Lighthouse e acessibilidade.
- Testes de unidade: A*, progressão, persistência, banco de perguntas.

## Deploy
Build Vite em `dist/`, GitHub Actions publica no GitHub Pages, `base` do Vite conforme o repositório. Sem segredos no frontend.
