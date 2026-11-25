# INTRO_SEQUENCE.md — Abertura narrada

## Objetivo
Primeiro contato do jogo com a criança: precisa ser **impactante e alegre**. Explicar o que aconteceu, quem vai ajudá-la e qual é sua primeira tarefa. Duração aproximada: 60–90 segundos. Cenas 3D em blocos com câmera dirigida (veja "Versão 3D"), texto na tela e narração opcional. Disponibilizar "Pular" e "Repetir"; não depender do áudio para compreender.

## Premissa (decisão de 20/11/2026)
O **Livro dos Sete Dias** é o livro de histórias do acampamento, onde os Aventureiros recontam as histórias da Bíblia. Suas páginas desapareceram. **A Bíblia nunca muda nem se perde:** ela é a fonte, e só abrindo a Bíblia os Aventureiros conseguem reconstruir as páginas. Cada mundo do jogo é uma história; o Mundo 1 é a criação, reconstruída passo a passo, na ordem dos sete dias.

## Princípio: uma função por quadro
Cada quadro cumpre uma função narrativa diferente, sem repetir informação dos outros.

| Quadro | Função | Quem fala |
|---|---|---|
| 1 — A chegada | Encantamento | Diretora Cecília, fora de cena |
| 2 — O problema | Mistério | Diretora Cecília, fora de cena |
| 3 — A Diretora Cecília | Propósito | Diretora Cecília, em cena |
| 4 — Tico aparece | Companheirismo | Tico |
| 5 — O Livro | Participação | Tico |
| 6 — Começar | Expectativa | texto na tela |

A Voz não narra a abertura: ela é reservada aos acontecimentos da criação.

## Apelido e gênero
- Antes da abertura, a criança escolhe o boneco (`CHARACTERS.md`) e digita um **apelido**. Os bonecos não têm nome próprio.
- Toda fala usa `{apelido}` e a forma de gênero do boneco escolhido (bem-vindo/bem-vinda, Aventureiro/Aventureira). Cada fala com gênero tem as duas versões escritas neste documento.
- Se a criança não digitar nada, usar "Aventureiro" ou "Aventureira".
- A legenda sempre mostra o texto. As frases com o apelido não têm voz (o jogo nunca usa a voz do aparelho).

## Quadro 1 — A chegada (Encantamento)
**O que a criança deve sentir:** "que lugar bonito e alegre, e ele é meu!". Admiração e pertencimento. É o momento mais vibrante da abertura. Duração: cerca de 15 segundos.

**Sequência 3D:**
1. **O primeiro toque abre o jogo.** Tela de título; ao tocar em "Toque para começar" (necessário também para liberar o áudio no iOS), a música alegre entra com força.
2. **O portão se abre.** Portão de madeira com o emblema A1 oficial (imagem, nunca recriado em blocos). A câmera atravessa o portão.
3. **O acampamento se monta bloco a bloco**, ao ritmo da música: o chão e o caminho de terra se desenrolam, as quatro tendas das classes "pulam" no lugar, cada uma na sua cor, e a bandeira do Clube sobe no mastro e tremula. Cada grupo de blocos que pousa faz um "plim" alegre.
4. **Vida no acampamento:** pássaros e borboletas de bloco cruzam a tela, folhas balançam.
5. **Pôr do sol dourado.** A câmera passa pela Colina do Globo ao fundo e mostra o Livro e o Globo de longe, sem destacá-los: eles só serão revelados no Quadro 2.
6. **A chegada da criança.** A câmera desce até a clareira: o boneco escolhido entra correndo, dá um pulo de alegria e acena. O lenço vinho fica bem visível.
7. **O nome em destaque.** Surge o texto grande "Bem-vindo, {apelido}!" ou "Bem-vinda, {apelido}!", com um estouro de estrelinhas douradas.

**Narração da Diretora Cecília (fora de cena):**
- Menino: "Olá, {apelido}! Bem-vindo ao Acampamento do Livro Aberto!"
- Menina: "Olá, {apelido}! Bem-vinda ao Acampamento do Livro Aberto!"

**Áudio:** música alegre e marcante, que abaixa de volume sob a narração. Efeitos: portão rangendo, "plim" dos blocos, bandeira ao vento, pássaros.

**Cuidados:**
- Desempenho: a montagem acontece no shader de vértices da geometria agrupada, sem custo depois da abertura.
- Redução de movimento: com `prefers-reduced-motion` ou a opção do jogo, trocar o sobrevoo por cortes suaves e não fazer a montagem bloco a bloco.
- Sem flashes nem piscadas rápidas. O estouro de estrelinhas é suave e curto.

## Quadro 2 — O problema (Mistério) · ~15 s
**Visual:** a música alegre para de repente, numa nota suspensa, e sopra um vento forte. A câmera voa até a Colina: o Livro dos Sete Dias está aberto sobre o suporte de madeira. O vento vira as páginas, que se soltam e sobem em espiral até sumir no céu. O Globo do Éden pisca e se apaga; **três faíscas escapam dele** e se escondem em pontos diferentes do acampamento (os mesmos lugares das faíscas da etapa 2 do Dia 1). O pôr do sol vira noite e as estrelas aparecem. A câmera volta à criança, sozinha no escuro. Tom de mistério, sem susto: nada de barulho alto nem escuro repentino.

**Narração da Diretora Cecília (fora de cena):**
"Mas um vento forte soprou! As páginas do Livro sumiram. E o Globo do Éden se apagou!"

O sumiço das páginas não tem causa nem vilão (decisão de 20/11/2026), para não entrar em terreno doutrinário.

## Quadro 3 — A Diretora Cecília (Propósito) · ~20 s
**Visual:** a Diretora Cecília chega com um lampião, se abaixa até a altura da criança e ergue uma Bíblia de blocos (um livro com a palavra "Bíblia" na capa, sem nenhum outro símbolo).

**Fala da Diretora Cecília** (em duas legendas):
1. "Calma! A Bíblia continua aqui, inteirinha."
2. "Com ela, vamos refazer o Livro dos Sete Dias!"

## Quadro 4 — Tico aparece (Companheirismo) · ~10 s
**Visual:** um galho balança. O Tico está pendurado de cabeça para baixo, diz "Psiu!", cai dando uma cambalhota, ajeita o lencinho e acena. A Diretora Cecília sorri.

**Fala do Tico:**
"Psiu! Eu sou o Tico. Vou estar sempre do seu lado!"

## Quadro 5 — O Livro (Participação) · ~15 s
**A criança age pela primeira vez.** Todos aparecem diante do Livro. O Tico aponta e diz "Toque no Livro!". O Livro pulsa como ponto de toque (toque, clique ou Enter, com foco de teclado). Ao tocar, o Livro se abre na página do Dia 1, em branco, só com o título "Dia 1". Se a criança não tocar em cerca de 8 segundos, o Tico acena e repete o convite; a cena nunca trava.

**Fala do Tico depois do toque:**
"Esta é a página do primeiro dia. Está em branco! Vamos descobrir o que Deus fez?"

## Quadro 6 — Começar (Expectativa)
**Na tela:** "Dia 1 — A Luz no Acampamento" e "Sua missão: refazer a página do primeiro dia!". Música com tom de esperança. **Botão:** "COMEÇAR A AVENTURA". Ao tocar, começa a etapa 1 do Dia 1: o Tico entrega a lanterna.

Não se usa "acender a luz no acampamento": no Dia 1 quem cria a luz é Deus ("Haja luz"). O Dia 1 termina dizendo "Você encontrou a primeira página do Livro dos Sete Dias", o que fecha com esta missão.

## Coerência com o Dia 1
- As faíscas que fogem do Globo no Quadro 2 são os "pedacinhos de luz" que a criança procura na etapa 2; na etapa 7 voltam ao Globo, a Voz diz "Haja luz" e a página do Dia 1 é recuperada.
- A abertura não entrega a lanterna nem faz a leitura: o Tico entrega a lanterna e a leitura de Gênesis 1:1–2 acontece na etapa 1.
- Falas do Tico ajustadas em `public/data/days/day01.json`: "Uau, como está escuro! Venha comigo, tenho uma coisa para você."; "Agora vamos abrir a Bíblia e ler como tudo começou."; "...estava tudo escuro. Igualzinho ao acampamento agora!".

## Implementação
- Textos em `public/data/intro.json`; cena em `src/game/intro.ts`; música em `src/engine/music.ts` (composta por código, sem arquivos nem licença de terceiros); montagem do acampamento no shader (`src/world/batch.ts`, `src/world/assemble.ts`).
- Fluxo: título → escolha do boneco → apelido → abertura (só na primeira vez; depois, botão "Ver a abertura" na tela de título) → Dia 1, etapa 1.
- Vozes: as frases sem apelido são gravadas pelo workflow de vozes; as frases com apelido aparecem só na legenda.
- O acampamento se monta peça por peça no vertex shader; depois da abertura, o custo é zero. Com movimento reduzido, a montagem e os voos de câmera viram cortes.

## Direção de áudio e acessibilidade
- Vozes acolhedoras, claras, sem infantilização exagerada.
- Música: alegre e marcante na entrada (Quadro 1), mistério com vento (Quadro 2), acolhida (Quadros 3 a 5) e esperança (Quadro 6); sempre mais baixa sob a narração. Trilha do restante do jogo a definir (veja "Pendências").
- Efeitos ambientais por Web Audio.
- Legendas sempre visíveis.
- Controle para desligar áudio (música e voz separadas).
- Só vozes gravadas; nunca a voz do aparelho. Sem gravação, só legenda.

## Versão 3D (decisão de 18/11/2026)
Os "quadros" da abertura são cenas 3D em blocos com câmera dirigida (sobrevoo do acampamento, aproximação do Livro e do Globo, do Tico e da Diretora Cecília), sem ilustrações separadas. Tico e a Diretora Cecília aparecem com expressões e gestos de bloco. A bandeira do Clube e as tendas das classes devem estar visíveis no plano amplo do Quadro 1. Legendas e botões Pular e Repetir continuam em HTML.

## Pendências
- Trilha sonora: a abertura usa o tema do jogo — festa (Quadro 1), mistério com vento (Quadro 2), acolhida (Quadros 3 a 5) e a vinheta esperança (Quadro 6). Não usar o Hino sem autorização.
