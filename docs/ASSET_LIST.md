# ASSET_LIST.md — Inventário (versão 3D em blocos)

A maior parte do jogo é **gerada por código**, o que reduz muito a necessidade de arte externa.

## Já no pacote
- `public/assets/official/emblema-A1.png` (236x220, baixa resolução: pedir versão maior) e `emblema-LA1.png` (2663x1889).
- `prototype/prototipo-3d-blocos.html`: referência de estilo.
- `assets/concept-art/*`: referência de identidade dos avatares (não do estilo). Contêm emblema errado e texto na imagem.

## Gerado por código (sem arte externa)
- Seis avatares, Pedrito, Diretora Sol, Tico e NPCs (construtor de blocos com parâmetros).
- Cenário: terreno, caminho, lago, árvores, tendas, mastro, bandeira, quadros, Mesa da Família, cais, observatório, Globo (3 estados), Livro dos Sete Dias (estados).
- Luz e clima: manhã, tarde, noite, escuro com lanterna.
- Efeitos: faíscas, brilho do Globo, confete.
- Sons simples via Web Audio (sino, água, grilo, brilho mágico), opcional, para não depender de arquivos.
- Texto de placas e da bandeira (textura gerada por canvas).

## Recebidos
Emblemas A1 e LA1, emblemas das quatro classes, logo da Macro, referência do uniforme feminino.
## Ainda falta
- Emblema A1 em alta resolução ou vetor (o atual tem 236 px).
- Emblema MRP (Missão RN-PB) para créditos.
- Referência do uniforme masculino e confirmação da faixa.

## Interface (HTML/CSS, sem arte externa)
Cards de seleção, diálogos, leitura, perguntas, HUD, Cartão do Acampamento, mapa, pausa, configurações, tela de feedback (carinhas e ícones), área dos responsáveis.

## Áudio
- Narração e vozes: síntese de voz do aparelho no MVP, com tom por personagem. Gravações depois.
- Música instrumental discreta: original ou licenciada **[definir]**. A trilha da abertura é composta e tocada por código (`src/engine/music.ts`), sem arquivos.
- Efeitos: Web Audio no MVP.

## Opcional depois
Modelos 3D (GLB) de pacotes livres de baixo polígono (por exemplo, Kenney e Quaternius), **só após conferir a licença** e manter o estilo. Compressão de texturas, se necessário.

## Peso e desempenho
- Carregamento inicial meta: até cerca de 3 MB.
- Geometria estática agrupada (poucas chamadas de desenho), material simples, no máximo uma luz com sombra.
- Qualidade automática: se a taxa de quadros cair, reduzir sombra e resolução ("modo leve").
