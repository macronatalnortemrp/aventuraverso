# ART_BIBLE.md — Bíblia Visual (versão 3D em blocos)

## Direção (decisão de 18/11/2026)
**Mundo 3D de blocos coloridos, acolhedor, tipo brinquedo.** Formas simples e arredondadas na medida do possível, cores chapadas, sombras suaves, luz quente. Referência: protótipo em `prototype/` e o estilo "bonecos de bloco" de jogos casuais para celular. O visual precisa parecer **cuidado e temático**, não "programador sem arte".

Substitui a direção anterior de pintura digital 2D. As imagens de `assets/concept-art/` valem agora **só como referência de identidade dos seis avatares** (cabelo, pele, acessórios) e de paleta. Não representam o estilo final.

## Paleta
| Cor | Uso | Hex |
|---|---|---|
| Bordô/vinho | lenço, bandeira, acentos do Clube | `#6E2638` |
| Azul-marinho | uniforme, interface | `#172D49` |
| Creme | papel, leitura, tendas | `#E9E1CF` |
| Verde | vegetação | `#66845B` |
| Dourado | luz, descoberta, Globo | `#D7A64D` |
| Marrom | madeira, terra | `#4A4038` |
Cores das classes e das categorias de distintivo: veja `THEME_AVENTUREIROS.md`.

## Câmera
- Perspectiva fixa, inclinada cerca de 40–45° em relação ao chão, seguindo o personagem com suavidade.
- Campo de visão maior em retrato (celular em pé) e menor em paisagem. Os dois modos são suportados.
- Sem rotação nem zoom livre pela criança no MVP. Cenas de abertura e cerimônias usam câmeras dirigidas.

## Personagens (blocos)
- Proporção infantil: cabeça grande (cerca de um terço da altura), corpo e membros de bloco.
- **Rosto expressivo é obrigatório**: olhos grandes com brilho, sorriso, bochechas rosadas. Nunca olhos vazios ou pretos (aparência sinistra). Expressões: neutro, alegre, surpreso, curioso e com medo (Pedrito), trocadas por textura ou peças pequenas.
- Mãos e pés simples, com sapato; mochila opcional.
- Animação por código: andar (braços e pernas), parado (respirar), acenar, comemorar (pulo), apontar, entregar.
- Diversidade de pele, cabelo e penteado entre os seis avatares, sem estereótipos.
- Uniforme padrão: camisa branca, bottom azul-marinho, lenço vinho com emblema oficial A1 (`THEME_AVENTUREIROS.md`, seção 8).
- Diretora Sol: adulta (escala maior), lenço de líder com o emblema oficial LA1.
- Tico: sagui provisório, de blocos, com um lencinho vinho; desenho a aprovar.

## Emblemas
Só os arquivos oficiais (`public/assets/official/`), como imagem aplicada em uma peça plana (decalque) sobre lenço, placas, bandeira e portão. Manter a proporção da imagem. Nunca desenhar com blocos "imitando" o emblema nem recolorir. Sem arquivo, espaço reservado neutro.

## Cenário
- Um **mundo único e contínuo**: o Acampamento do Livro Aberto, dividido nas zonas Colina do Globo, Clareira das Tendas, Lago, Mata, Cais e Observatório (`THEME_AVENTUREIROS.md`, seção 1).
- Blocos, árvores em camadas, tendas em pirâmide, água azul-clara, caminho de terra, bandeirolas vinho e brancas.
- Elementos temáticos fixos: mastro com a bandeira do Clube, tendas das quatro classes, placas das quatro trilhas, quadros dos ideais, Mesa da Família.
- Os sete dias reaproveitam o mundo: mudam a luz, os objetos e os estados do Globo e do Livro.

## Luz
Predefinições por código: manhã dourada, tarde, entardecer, noite e "escuro com lanterna" (Dia 1). Luz hemisférica suave + uma luz direcional com sombra. A lanterna é uma luz que acompanha o personagem. Sem pós-processamento pesado.

## Globo do Éden
Esfera de vidro azulada sobre pedestal de blocos, com núcleo dourado. Três estados: apagado, parcialmente iluminado (cresce a cada dia, com mundo em miniatura dentro) e completo. Cerimônias da Voz usam câmera dirigida e brilho crescente.

## Interface
HTML/CSS: painéis de madeira ou papel, botões grandes, texto sempre em HTML (nunca dentro de textura, exceto placas do cenário geradas por código).

## Não fazer
- Não usar o emblema falso das imagens conceituais antigas.
- Não trocar o vinho por vermelho vivo, laranja ou roxo.
- Não inventar símbolos religiosos, emblemas, distintivos oficiais ou detalhes de uniforme.
- Não representar Deus de nenhuma forma visível: só a Voz, a luz e o Globo.
- Não usar efeitos que prejudiquem aparelhos simples (muitas luzes, sombras grandes, partículas em excesso).
