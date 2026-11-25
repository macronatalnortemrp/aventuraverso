# CAMINHO_DA_LUZ.md — Desafios dos convites (Dia 1, etapa 6)

Pedido do responsável em 21/11/2026. Sequência de desafios de **habilidade, exploração e raciocínio**, sem narrativa. Substitui as perguntas sobre o Clube que os acampantes faziam.

## Fluxo
1. A Diretora Cecília entrega os três convites; a criança procura os acampantes perto dos murais.
2. O acampante propõe: "Se você completar o meu desafio, eu aceito o convite!" (Aceitar / Agora não). Um desafio por vez.
3. Ao aceitar, **o joystick e o botão A ligam sozinhos** nesta atividade (decisão do responsável) e começa a apresentação:
   - a câmera mostra o lago, onde a ilha vai surgir;
   - o topo sobe da água e as mini ilhas aparecem uma a uma, da partida até o topo;
   - a câmera percorre o caminho (partida, meio, último salto) e mostra a área do desafio;
   - o acampante dá a instrução: "Suba pelas plataformas suspensas e alcance o topo. Lá, encaixe os espelhos e direcione a luz até o cristal!" e "Use o joystick para andar e o botão A para pular.";
   - a câmera volta para a criança e os controles são liberados.
4. No topo: pegar um espelho na estante → encaixar num suporte → girar (botões ⟲ ⟳, 15° por toque). O feixe muda na hora.
5. A luz no cristal: animação, "Desafio concluído!", o acampante aceita o convite e ele aparece no mural. O joystick desliga quando a criança volta ao chão.
6. Na segunda e terceira vez a ilha já está lá: só o topo troca de desafio.
7. No terceiro: "Parabéns! Você concluiu os três desafios!", a criança desce e o Dia 1 segue para o Globo. A ilha fica no cenário, com o último caminho de luz aceso e sem interação, e continua lá depois do Dia 1 para a criança brincar (decisão de 23/11/2026).

## Cenário
- **Ilha suspensa sobre o lago** (centro em x -23, z 6), no estilo de blocos do acampamento: topo de grama com borda de pedras, base de rocha em camadas afinando para baixo, musgo pendurado, três cachoeiras que caem no lago.
- **Percurso fixo, igual nos três desafios:** partida em terra firme (degrau baixo com marca dourada), oito mini ilhas subindo 0,95 por salto em volta da ilha, duas maiores para descansar, chegada pelo oeste. Saltos de até 1,2 de altura e vãos de 0,4 a 2,5 (o pulo normal alcança ~2 de altura e ~4,5 de distância). A próxima plataforma brilha.
- Quem cai, cai na água do lago: sem punição, é só voltar à partida.
- O topo tem uma borda invisível (não se cai sem querer) com passagem pelo lado da chegada.

## Puzzles (`src/game/light/puzzles.ts`)
| Desafio | Espelhos | Obstáculos | Trajetória |
|---|---|---|---|
| 1. O primeiro reflexo | 1 | nenhum | fonte → espelho → cristal |
| 2. Encontre o caminho | 2 | pedras entre a fonte e o cristal | fonte → espelho 1 → espelho 2 → cristal |
| 3. O caminho completo | 3 | pedras em volta do cristal central | fonte → espelho 1 → 2 → 3 → cristal |

- Reflexão calculada de verdade (`src/game/light/beam.ts`): r = d − 2(d·n)n, com a normal do espelho; o feixe para nas pedras e na borda.
- Tolerância: o cristal aceita o feixe num raio de 0,6.
- Os testes (`tests/light.test.ts`) verificam, por busca em todas as combinações de ângulos, que cada desafio tem solução e **só** se resolve usando todos os espelhos.
- Sem cronômetro, pontuação, vidas nem punição. O espelho pode ser girado quantas vezes quiser.

## Pendências
- Testar em celular de entrada real: salto com joystick e leitura do feixe ao sol.
- Validar com crianças se o desafio 3 está difícil demais.
