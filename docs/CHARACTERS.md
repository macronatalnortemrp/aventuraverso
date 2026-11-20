# CHARACTERS.md — Elenco e seleção

Todos os personagens são **bonecos de bloco gerados por código a partir de parâmetros** (modelo em `prototype/`). Um único "construtor de criança" produz os seis avatares, Pedrito, a Diretora Sol e os demais NPCs humanos.

## Seleção do jogador
Primeira execução: seis personagens pré-definidos, três masculinos e três femininos, em cards grandes (Meninos e Meninas). Toque seleciona (borda de foco, o boneco acena), botão "Confirmar personagem", `avatarId` salvo no aparelho e alterável nas configurações. A escolha não altera dificuldade, conteúdo, recompensas nem acesso.

## Os seis avatares
Todos com o uniforme padrão: camisa branca com plaquinha de nome, cinto, meias brancas, sapato preto e lenço vinho com emblema A1 no canudo. **Meninas: saia azul-marinho. Meninos: calça na mesma cor azul-marinho da saia.** Diferenciam-se por:

| # | Nome provisório | Pele | Cabelo | Acessório |
|---|---|---|---|---|
| 1 | Menino 1 | clara/média `#F0C8A0` | castanho `#5A3A22`, curto | — |
| 2 | Menino 2 | escura `#8D5A3B` | preto `#1B1B1B`, crespo curto | — |
| 3 | Menino 3 | clara `#F2CFB0` | ruivo `#C4501B`, cacheado | óculos redondos |
| 4 | Menina 1 | média `#EAB98F` | castanho `#4A2A1A`, longo | — |
| 5 | Menina 2 | escura `#8D5A3B` | preto `#1B1B1B`, rabo de cavalo | laço vinho |
| 6 | Menina 3 | clara `#F2CFB0` | loiro `#E3B85A`, longo | — |

Roupa de aventura (bege, verde-oliva, cáqui, mochila e bota) como **conjunto alternativo desbloqueável**. Os valores acima vêm do protótipo e são ajustáveis. Mesmas proporções e animações para todos.

## Regra comum do lenço
Lenço triangular vinho, sempre visível, com o emblema oficial A1 aplicado como imagem. Posição no lenço/canudo a validar (`THEME_AVENTUREIROS.md`).

## Diretora Sol
Mulher adulta, acolhedora e ativa. Uniforme de líder ou roupa de atividades **[validar com o Regulamento de Uniformes vigente]**, lenço vinho de líder com borda branca e emblema LA1 oficial. Nunca o A1. Apresenta missões, orienta, acolhe e valida o fim do dia.

## Tico
Mascote-guia pequeno e expressivo. Proposta provisória: sagui de blocos (animal do Rio Grande do Norte), com lencinho vinho. Espécie e desenho a aprovar. Pontua, aponta, comemora, dá dicas faladas. Não é figura divina.

## Pedrito
Menino visitante e curioso, sem lenço no início (pode receber o seu ao final do Dia 7, **[validar]**). Faz as perguntas do Clube (`QUIZ_MAP.md`). É NPC e não substitui o avatar do jogador.

## Outros NPCs (aparecem a partir do Dia 2)
Dona Flora (jardineira), Capitã Marina (cais), Seu Estrelino (astrônomo), Tio Zé Bichos (cuidador dos animais). Cada um com roupa e acessório próprios, para a silhueta ser reconhecível.

## A Voz
Narração da criação. Nunca representada com rosto, corpo ou boneco. Só voz, luz e as transformações do Globo.

## Animações necessárias (todas por código)
Parado (respirar), andar, falar (cabeça e boca/olhos), acenar, comemorar, pensar/curioso, apontar, entregar, e para Pedrito, medo (encolher, olhos arregalados).
