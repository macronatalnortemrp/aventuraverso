# CHARACTERS.md — Elenco e seleção

Todos os personagens são **bonecos de bloco gerados por código a partir de parâmetros** (modelo em `prototype/`). Um único "construtor de criança" produz os seis avatares, Pedrito, a Diretora Sol e os demais NPCs humanos.

## Seleção do jogador
Primeira execução: seis personagens pré-definidos, três masculinos e três femininos, em cards grandes (Meninos e Meninas). Toque seleciona (borda de foco, o boneco acena), botão "Confirmar personagem", `avatarId` salvo no aparelho e alterável nas configurações. Em seguida a criança digita um **apelido** (opcional; sem apelido, usa-se "Aventureiro" ou "Aventureira"). Os bonecos não têm nome próprio: as falas usam o apelido e a forma de gênero do boneco escolhido (`INTRO_SEQUENCE.md`). A escolha não altera dificuldade, conteúdo, recompensas nem acesso.

## Os seis avatares
Todos com o uniforme padrão: camisa branca com plaquinha de nome, cinto, meias brancas, sapato preto e lenço vinho usado como descrito em `LENCO.md` (triângulo com o A1 nas costas, pontas com prendedor branco na frente). **Meninas: saia azul-marinho. Meninos: calça na mesma cor azul-marinho da saia.** Diferenciam-se por:

| # | Identificador interno (não aparece no jogo) | Pele | Cabelo | Acessório |
|---|---|---|---|---|
| 1 | Menino 1 | clara/média `#F0C8A0` | castanho `#5A3A22`, curto | — |
| 2 | Menino 2 | escura `#8D5A3B` | preto `#1B1B1B`, crespo curto | — |
| 3 | Menino 3 | clara `#F2CFB0` | ruivo `#C4501B`, cacheado | óculos redondos |
| 4 | Menina 1 | média `#EAB98F` | castanho `#4A2A1A`, longo | — |
| 5 | Menina 2 | escura `#8D5A3B` | preto `#1B1B1B`, rabo de cavalo | laço vinho |
| 6 | Menina 3 | clara `#F2CFB0` | loiro `#E3B85A`, longo | — |

Roupa de aventura (bege, verde-oliva, cáqui, mochila e bota) como **conjunto alternativo desbloqueável**. Os valores acima vêm do protótipo e são ajustáveis. Mesmas proporções e animações para todos.

## Regra comum do lenço
Lenço triangular vinho, sempre visível, com o emblema oficial A1 aplicado como imagem: grande no triângulo das costas e pequeno no prendedor cilíndrico branco da frente (`LENCO.md`, "Como o lenço é usado"). Cabelos longos vão até os ombros para não cobrir o triângulo.

## Diretora Sol
Mulher adulta, acolhedora e ativa. Uniforme de líder ou roupa de atividades **[validar com o Regulamento de Uniformes vigente]**, lenço vinho de líder com listras nas quatro cores das classes junto à base e emblema LA1 oficial, usado do mesmo jeito (`LENCO.md`). Nunca o A1. Apresenta missões, orienta, acolhe e valida o fim do dia.

## Tico
Mascote-guia pequeno e expressivo. Proposta provisória: sagui de blocos (animal do Rio Grande do Norte), com lencinho vinho. Espécie e desenho a aprovar. Pontua, aponta, comemora, dá dicas faladas. Não é figura divina.

## Pedrito
Menino visitante e curioso, sem lenço no início (pode receber o seu ao final do Dia 7, **[validar]**). Faz as perguntas do Clube (`QUIZ_MAP.md`). É NPC e não substitui o avatar do jogador.

## Outros NPCs (aparecem a partir do Dia 2)
Dona Flora (jardineira), Capitã Marina (cais), Seu Estrelino (astrônomo), Tio Zé Bichos (cuidador dos animais). Cada um com roupa e acessório próprios, para a silhueta ser reconhecível.

- **Capitã Marina (Dia 2, pronta):** mulher adulta, quepe branco com aba azul-marinho, camisa azul-marinho, calça branca e colete salva-vidas laranja, sem lenço (`src/world/builders/marina.ts`). Fica no cais novo da margem norte do lago e empresta o barco depois do Dia 2. Voz própria no Kokoro (`marina` em `scripts/voices/voices.json`).
- **Pedrito (fim do Dia 7):** recebe o lenço e o uniforme oficial de Aventureiro, igual ao dos outros personagens (decisão de 24/11/2026).

## A Voz
Narração da criação. Nunca representada com rosto, corpo ou boneco. Só voz, luz e as transformações do Globo.

## Animações necessárias (todas por código)
Parado (respirar), andar, falar (cabeça e boca/olhos), acenar, comemorar, pensar/curioso, apontar, entregar, e para Pedrito, medo (encolher, olhos arregalados).
