# JOGABILIDADE_REFERENCIA.md — Super Bear Adventure como base de jogabilidade

Status: **proposta para aprovação** (19/11/2026). Nada aqui está implementado. Onde houver conflito com `AGENTS.md`, vale `AGENTS.md` até o responsável aprovar a mudança.

## 1. Fonte
`ideia_para_o_jogo.pdf` (35 capturas de tela do Super Bear Adventure 13.0.9, Android, 72 MB; **não precisa ir para o Git**, este arquivo o substitui). O que as capturas mostram:
- História de abertura em quadros ilustrados com legenda; depois tutorial dentro do jogo.
- Joystick virtual à esquerda; botões **A** (pular) e **B** (ação: atacar, pegar e soltar) à direita; contador de moedas, vidas, pausa e emotes no topo.
- Dicas em balões na hora certa: salto longo (andar, B, depois A), mergulho no ar (B), segurar objetos (B pega, B solta), barrigada (segurar B no ar).
- NPC com caixa de diálogo e nome; pedestais e plataformas com botão de interação; água com visual próprio.
- Hub ("Vila dos Ursos") com seleção de fase: miniatura do mapa, contadores de coletáveis e botões "Bora!" e "Cancelar".
- Menu de pausa, conquistas, configurações detalhadas (volumes por categoria, "Dicas" do NPC, "Ajuda com chaves", gráficos e FPS, sensibilidade e inversão de câmera, ocultar botões) e multiplayer por código de convite.
- **Não aparecem nas capturas** o medidor de fôlego nem o teletransporte para o portal. Tratar ambos como **especificação do responsável**.

## 2. O que adotar, adaptar e não adotar
| Ideia | Decisão | Motivo |
|---|---|---|
| Mapa aberto | Adotar | Já previsto: mundo único, zonas visíveis desde o início |
| Moedas coletáveis | Adotar | Barato e motivador; sem compras |
| Lagos, nadar, mergulhar | Adotar com adaptação | Lago passa de obstáculo a área jogável |
| Fôlego | Adaptar | Sem derrota, sem perda, sem pressão de tempo |
| Pulo | Adaptar | Entra como botão opcional |
| Segurar e soltar objetos | Adaptar | Botão "Ação"; serve a quebra-cabeças e missões |
| Salto longo, mergulho no ar, barrigada | Adiar | Combos de botão são difíceis para 6 e 7 anos |
| Tutorial em balões na hora certa | Adotar | Combina com "pistas graduais" e Tico |
| Hub com seleção de fase | Adaptar | Vira o portal da missão no acampamento |
| Configurações de dica, câmera e botões | Adotar o essencial | Ajuda de orientação, ocultar botões, modo leve |
| Ataque, dano, vidas | **Não adotar** | Público infantil, "não penalizar"; "Ataque" vira "Ação" |
| Multiplayer, código de convite, emotes | **Não adotar** | Sem rede, sem dados, sem backend no piloto |
| Compras, cronômetro, reinício rápido | **Não adotar** | Sem compras nem pressão de tempo |

## 3. Especificação

### 3.1 Controles (decisão pendente)
- Manter **toque no chão para andar** como padrão (6 a 7 anos).
- Acrescentar, de forma opcional (Configurações), **joystick virtual** e dois botões grandes: **Pular** e **Ação**. No computador: WASD/setas, Espaço (pular) e E ou Enter (ação).
- Botões podem ser ocultados. Alvos de toque grandes, áreas seguras, `touch-action: none` no canvas.
- Câmera: segue o personagem. Rotação livre fica fora do MVP, salvo aprovação.
- Dificuldade Pequeno (6 a 7): só andar, nadar e Ação. Explorador (8 a 9): libera pulo e, depois, habilidades extras.

### 3.2 Moedas
- Moedas em pontos definidos em `world.json` (`coins`), instanciadas (uma malha, muitas instâncias). Coleta ao encostar; contador em HTML no HUD; ids coletados salvos localmente.
- Algumas ficam no fundo dos lagos, para dar motivo de mergulhar.
- Uso proposto: desbloquear itens visuais (por exemplo, a roupa de aventura, bandeirolas) e completar o Cartão do Acampamento. **Sem gasto por pressão, sem compra com dinheiro real, sem perda.** Nome temático da moeda a definir.

### 3.3 Água, nadar, mergulhar e fôlego
- `world.json` ganha `water`: polígono ou retângulo, nível da superfície e profundidade do fundo. Na grade de navegação, água passa a ser célula **nadável**, não obstáculo.
- Estados do personagem: `andando`, `raso` (água na canela), `nadando` (na superfície), `mergulhando` (submerso), mais `pulando`.
- Mergulhar: botão **Ação** (ou toque no ícone de mergulho) na superfície; subir sozinho ao soltar ou ao tocar em "subir".
- **Fôlego:** barra de bolhas em HTML, só enquanto submerso. Valor inicial sugerido: 20 s, **a calibrar com crianças**. Alerta suave a 25% (bolhas piscando e fala curta do Tico). Recarrega rápido na superfície.
- **Ao zerar:** uma bolha de ar leva o personagem à superfície, com uma frase gentil. Nenhuma perda de moedas, progresso ou vida. Não é derrota.
- Visual submerso sem pós-processamento: tinta azul e névoa curta, plano de água semitransparente (um material, sem refração). Atenção ao custo de transparência em celular de entrada.
- Dia 1 (escuro total): a lanterna também funciona na água, ou o mergulho fica bloqueado nesse dia. **[decidir]**

### 3.4 Pulo e objetos
- Pulo com gravidade simples e colisão por grade de alturas (degraus de 1 unidade). Sem biblioteca de física.
- A* continua só no plano para o toque no chão. Pulo e plataformas altas são movimento direto do jogador.
- Segurar/soltar: objetos marcados em `world.json` (`pickable`), com ícone de Ação quando próximo.

### 3.5 Ajuda de orientação e teletransporte para o portal
**Objetivo atual** = hotspot ou portal da etapa em andamento (`dayNN.json`).

**Sinais de "perdido"** (conta tempo sem progresso). Progresso = distância ao objetivo diminuiu, interação com hotspot, moeda coletada, etapa avançou. O contador **pausa** em diálogo, leitura, pergunta, pausa, cena dirigida e aba oculta, e **zera** a cada progresso.

**Escada de ajuda** (tempos iniciais, a calibrar no piloto, em `src/config/guidance.ts`):
1. ~45 s: o brilho do objetivo fica mais forte e Tico aponta na direção dele.
2. ~90 s: aparece uma trilha de faíscas ou seta de bússola (a bússola está na identidade visual) até o portal.
3. ~150 s: Tico pergunta "Quer que eu leve você até o portal?". Se aceitar, ou se não houver resposta em alguns segundos, o jogo faz fade, posiciona o personagem na célula livre **à frente do portal** e a câmera se reposiciona suavemente.
- Se a criança disser "Agora não", adiar por alguns minutos. Máximo de uma transferência por etapa a cada poucos minutos.
- Botão **"Tico, me ajuda"** sempre visível, que já está previsto no `GAME_DESIGN.md`, dispara o nível seguinte na hora.
- Configuração **Ajuda de orientação**: Automática (padrão), Só quando eu pedir, Desligada.
- Destino do teletransporte nunca em água nem em obstáculo (usar a célula livre mais próxima, como o A*). Respeitar redução de movimento (corte simples em vez de efeito).
- A fala de Tico sempre aparece em texto.

### 3.6 Portal da missão (elemento novo)
Arco de blocos com brilho na cor da trilha da missão, com o ponto de parada à frente (`frontSpot`). Hipótese: marca a entrada de cada missão ou etapa dentro do acampamento e serve de destino da ajuda. **[confirmar]** o papel: ponto de início de missão, passagem para outro cenário ou outro mundo do aventuráVerso.

## 4. Impacto técnico (sem mudar a stack)
- Novos módulos: `game/player/state.ts` (estados e fôlego), `game/coins.ts`, `game/guidance.ts` (detecção e escada de ajuda), `world/water.ts`, `ui/` para HUD de moedas, fôlego e botões.
- `pathing.ts`: tipos de célula (livre, obstáculo, nadável) e alturas.
- `world.json`: `water`, `coins`, `pickable`, `portals`.
- Persistência: `coins`, `coinsCollected[]`, `settings.guidance`, `settings.controls` (versionado).
- Testes de unidade: detecção de "perdido", escada de ajuda, fôlego, destino seguro do teletransporte.

## 5. Riscos
- **Desempenho:** água transparente e névoa em celular de entrada; moedas devem ser instanciadas; medir FPS no gate da Fase 1.
- **Criança de 6 a 9 anos:** controles novos podem competir com o toque no chão; começar com pouco e testar no piloto.
- **Desorientação:** teletransporte brusco assusta; sempre com Tico, fade e texto.
- **Identidade:** o visual é de blocos como o Super Bear; manter arte, personagens e paleta próprios (`ART_BIBLE.md`).
- **Conteúdo do Dia 1:** o escuro total interage com água e portal; definir antes de implementar.

## 6. Ordem sugerida (Fase 1.5, após o gate de desempenho da Fase 1)
1. Moedas e HUD.
2. Ajuda de orientação e portal (barato e de maior efeito de produto).
3. Lago nadável, mergulho e fôlego.
4. Joystick e botões opcionais, pulo, segurar/soltar.
5. Habilidades extras para o nível Explorador.

## 7. Critérios de aceite
- Todas as ações funcionam por toque, mouse e teclado.
- Nada reduz vida, moedas ou progresso. Nenhum cronômetro visível.
- Fôlego esgotado leva à superfície sem punição.
- Em teste de 3 minutos sem avançar, a ajuda chega ao nível 3 e o personagem aparece livre à frente do portal.
- 30 FPS ou mais no acampamento completo em celular de entrada, com água.

## 8. Decisões que dependem do responsável
1. Aprovar joystick e botões opcionais além do toque no chão.
2. Papel do portal e relação com o aventuráVerso.
3. Para que servem as moedas e como se chamam.
4. Mergulho no Dia 1.
5. Teletransporte automático após tempo, ou somente depois que a criança aceitar.

## 9. Decisões tomadas em 19/11/2026 (substituem os itens pendentes acima)
- Controles opcionais aprovados: joystick e botões A/B, ligados na abertura. Toque no chão continua padrão.
- A: pulo; na água, mergulha e alterna subir/descer. B (toque após A): pulo alto; com direção, pulo-mergulho. B (segurar no pulo): descida forte. Salto longo e barrigada ficam fora.
- Fôlego em círculo: azul, laranja perto da metade, vermelho depois. Duração inicial 20 s (`BT` na demo), a calibrar.
- Portal: um por missão; ao fim das missões de um mundo, abre-se o portal do mundo seguinte, com cenário próprio (builders por bioma, só um mundo carregado por vez, fade na troca).
- Sem violência e sem multiplayer.
