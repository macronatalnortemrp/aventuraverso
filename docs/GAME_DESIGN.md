# GAME_DESIGN.md — Visão geral

## Premissa
A criança chega ao Acampamento do Livro Aberto. As páginas do Livro dos Sete Dias desapareceram e o Globo do Éden está vazio e apagado. Com ajuda de Tico e da Diretora Sol, explora o acampamento, descobre o que a Bíblia ensina, ajuda amigos e recupera as páginas. A Voz narra os acontecimentos da criação; Deus não é representado visualmente.

## Público e dispositivos
- Crianças de 6 a 9 anos.
- Mobile e desktop. Paisagem como orientação principal.
- Sessões curtas, com retomada automática.

## Natureza do projeto: piloto de teste
O jogo começa como piloto para a Macro: a ideia é testar, ouvir as crianças e os responsáveis e só então expandir. Veja `PILOT_FEEDBACK.md` e `ROADMAP.md`.

## Loop principal
**Explorar → Descobrir → Fazer/Servir → Contar.**

## Movimento e interação (decisão de 18/11/2026: mundo 3D em blocos)
- O acampamento é um **mundo 3D único**, visto de cima e de lado, com câmera que segue o personagem.
- A criança **toca (ou clica) no chão** e o boneco caminha até lá, contornando obstáculos. No computador, também pode usar setas ou WASD.
- Itens, pessoas e quadros são "pontos de toque" grandes. Tocar em um deles leva o personagem até ele e interage.
- Pontos importantes têm um brilho discreto. A criança pode pedir ajuda ao Tico para ver onde tocar.
- Funciona em paisagem e em retrato.
- Teclado: Tab percorre os pontos de toque, Enter interage.

## Tema do Clube
O mundo traduz o Clube de Aventureiros: emblema A1, bandeira, tendas das classes, placas das quatro trilhas, quadros dos ideais, distintivos e Rede Familiar. Veja `THEME_AVENTUREIROS.md`.

## Estrutura
- 7 dias, cada um com 6–7 etapas.
- 10–15 minutos por dia.
- Salvamento automático a cada etapa.
- Pausar e retomar.
- Seis zonas no mesmo mundo: Clareira das Tendas, Lago, Mata, Cais, Observatório e Colina do Globo.
- Todas as áreas visíveis desde o início; bloqueios narrativos podem orientar a progressão sem criar frustração.
- Cada dia reaproveita o mesmo mundo, com mudança de luz, objetos e estado do Globo e do Livro.

## Leitura bíblica
Dois modos:
1. Pergaminho da Palavra: texto curto no jogo e áudio.
2. Bíblia na Mão: referência e dica para a criança ler em Bíblia impressa.

Cada leitura termina com pergunta de compreensão respondível pelo texto. Ciclo previsto no roteiro: dias 1–3 pergaminho; dias 4–5 Bíblia impressa; pergaminho recarrega após o dia 5; dias 6–7 pergaminho.

Tradução aprovada para o MVP: Almeida Revista e Corrigida, edição de 1898 (pode ser trocada por uma mais moderna depois). Antes de incorporar o texto, verificar a fonte digital, a edição exata e as condições de uso. O texto fica em arquivo JSON conferido por uma pessoa (Gn 1:1 a 2:3 = 34 versículos).

## Respostas e ajuda
- Pergunta e opções lidas automaticamente, quando áudio ativado.
- Botão de áudio por opção.
- Selecionar resposta e confirmar.
- Primeiro erro: resposta acolhedora.
- Segundo erro: Tico oferece pista.
- Terceira tentativa: mostrar resposta e explicar gentilmente.
- Sem punição, perda de progresso ou vergonha.

## Dificuldade
- Pequeno (6–7): menos itens, pistas automáticas, possibilidade de jogar em dupla com adulto.
- Explorador (8–9): mais itens, pistas sob solicitação.
- Não bloquear conteúdo essencial por dificuldade.

## Ideais do Clube
O jogo usa quatro elementos: Voto, Lei, Hino e Voto à Bíblia. Não acrescentar "lema" como quinto ideal. O mapa de perguntas por dia está em `QUIZ_MAP.md`.
- Voto: "Por amor a Jesus, farei sempre o meu melhor."
- Lei: "Jesus me ajuda a ser: obediente, puro, reverente, bondoso e colaborador."
- Voto à Bíblia: "Prometo fidelidade à Bíblia, à sua mensagem de um Salvador crucificado, ressurreto e prestes a voltar, doador de vida e liberdade a todos que nEle crêem."
- Hino: respeitar a versão do material-fonte e confirmar autorização/condições antes de reproduzir letra e gravação.

## Recompensas e bem-estar
- Sem compras, anúncios, ranking público ou cronômetro de pressão.
- Não penalizar faltas.
- Recompensas simbólicas: Distintivos do Acampamento (não são especialidades oficiais), estrelas, quadros dos ideais que se acendem e itens visuais. Itens de ajuda (lanterna, lupa, pergaminho de dica) apoiam a criança, nunca bloqueiam.
- Missões reais sempre opcionais, com confirmação por adulto e sem exigir prova pública.

## Privacidade
Não coletar dados pessoais da criança. MVP sem conta, analytics identificável ou backend. Dados de progresso apenas no dispositivo.

## Fora do piloto (fica para depois)
Trilha do visitante, localizador de clubes, código do clube, ranking por clube, painel do diretor e Mundos 2 em diante. Veja `ROADMAP.md`. Nenhum deles entra no código do piloto, mas a arquitetura não deve impedi-los.
