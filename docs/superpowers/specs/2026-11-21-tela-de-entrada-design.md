# Tela de carregamento e nova tela inicial — design

Data: 21/11/2026. Decisões do responsável do projeto tomadas na conversa desta data.

## Problema
Ao abrir o link, os textos da tela inicial apareciam antes do fundo. O fundo é o acampamento em 3D, que só fica pronto segundos depois que o HTML já está na tela.

## Decisões
- **Tela de carregamento** ("Criado por / Macro Natal Norte 02 / @Macro2avtrn"), com a logo oficial da Macro entrando girando no centro. Ela fica no próprio `index.html` (estilo embutido), então aparece no primeiro quadro, antes do código do jogo.
- Ela sai só depois que o acampamento já foi desenhado (dois quadros) e depois de no mínimo 5 s, para dar tempo de ler os créditos (pedido de 21/11/2026). A logo dá uma volta lenta e suave (3,4 s), sem tranco, e depois flutua de leve. Se o jogo não abrir em 30 s, ela sai sozinha para mostrar a mensagem de erro.
- **Nome oficial nos créditos:** "Macro Natal Norte 02", com "MRP" e o Instagram @Macro2avtrn (`THEME_AVENTUREIROS.md`, seção de créditos).
- **Tela inicial** no estilo da imagem de referência enviada: placa de madeira com a bússola, faixa de pergaminho "Um Universo de Aventuras", botão "Jogar" dourado com moldura de pedra e folhas, raios de sol e a logo da Macro com brilho no rodapé.

## Abordagens consideradas
1. **Usar a imagem de referência como fundo (descartada).** A imagem traz a logo da Macro redesenhada por IA (proibido: emblemas só a partir de `public/assets/official/`). Os textos e o botão viriam dentro da imagem, sem leitor de tela nem teclado. A imagem é ilustração 2D e não se ajusta ao celular deitado.
2. **Refazer o visual em HTML/CSS por cima do acampamento 3D (escolhida).** Usa a logo oficial, mantém o estilo de blocos, funciona em retrato e paisagem e continua acessível.

## Detalhes
- `public/assets/official/web/macro-hd.webp`: logo oficial reduzida para 400 px, com a proporção original, para ficar nítida na tela de carregamento.
- As fontes (`@font-face`) foram para o `index.html` e a Lilita One é pré-carregada, para a tela de carregamento já sair com a fonte do jogo.
- "Reduzir movimento": sem giro, sem raios animados e sem entrada animada.
