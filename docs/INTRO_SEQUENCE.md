# INTRO_SEQUENCE.md — Abertura narrada

## Objetivo
Primeiro contato do jogo com a criança: precisa ser **impactante e alegre**. Explicar o que aconteceu, quem vai ajudá-la e qual é sua primeira tarefa. Duração aproximada: 60–90 segundos. Cenas 3D em blocos com câmera dirigida (veja "Versão 3D"), texto na tela e narração opcional. Disponibilizar "Pular" e "Repetir"; não depender do áudio para compreender.

## Premissa (decisão de 20/11/2026)
O **Livro dos Sete Dias** é o livro de histórias do acampamento, onde os Aventureiros recontam as histórias da Bíblia. Suas páginas desapareceram. **A Bíblia nunca muda nem se perde:** ela é a fonte, e só abrindo a Bíblia os Aventureiros conseguem reconstruir as páginas. Cada mundo do jogo é uma história; o Mundo 1 é a criação, reconstruída passo a passo, na ordem dos sete dias.

## Princípio: uma função por quadro
Cada quadro cumpre uma função narrativa diferente, sem repetir informação dos outros.

| Quadro | Função | Quem fala |
|---|---|---|
| 1 — A chegada | Encantamento | Diretora Sol, fora de cena |
| 2 — O problema | Mistério | Diretora Sol, fora de cena |
| 3 | Propósito | Diretora Sol, em cena |
| 4 | Companheirismo | Tico |
| 5 | Participação | Tico |
| 6 — Começar | Expectativa | texto na tela |

A Voz não narra a abertura: ela é reservada aos acontecimentos da criação.

## Apelido e gênero
- Antes da abertura, a criança escolhe o boneco (`CHARACTERS.md`) e digita um **apelido**. Os bonecos não têm nome próprio.
- Toda fala usa `{apelido}` e a forma de gênero do boneco escolhido (bem-vindo/bem-vinda, Aventureiro/Aventureira). Cada fala com gênero tem as duas versões escritas neste documento.
- Se a criança não digitar nada, usar "Aventureiro" ou "Aventureira".
- A legenda sempre mostra o texto, porque a voz do aparelho pode pronunciar mal um apelido inventado.

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

**Narração da Diretora Sol (fora de cena):**
- Menino: "Olá, {apelido}! Que alegria ter você aqui! Seja bem-vindo ao Acampamento do Livro Aberto, onde os Aventureiros vivem as histórias da Bíblia."
- Menina: "Olá, {apelido}! Que alegria ter você aqui! Seja bem-vinda ao Acampamento do Livro Aberto, onde as Aventureiras e os Aventureiros vivem as histórias da Bíblia."

**Áudio:** música alegre e marcante, que abaixa de volume sob a narração. Efeitos: portão rangendo, "plim" dos blocos, bandeira ao vento, pássaros.

**Cuidados:**
- Desempenho: blocos animados em geometria agrupada/instanciada. No modo leve, o acampamento aparece já montado, com uma animação curta.
- Redução de movimento: com `prefers-reduced-motion` ou a opção do jogo, trocar o sobrevoo por cortes suaves e não fazer a montagem bloco a bloco.
- Sem flashes nem piscadas rápidas. O estouro de estrelinhas é suave e curto.

## Quadros 2 a 6 — em revisão
Os quadros abaixo ainda serão reescritos, um por vez. Já estão decididas as correções:

| Inconsistência | Decisão |
|---|---|
| Manhã dourada x escuro total do Dia 1 | A chegada acontece ao pôr do sol (Quadro 1). No Quadro 2 a luz se apaga junto com o Globo: o escuro vira consequência da história e prepara o "Haja luz". |
| Quem entrega a lanterna | A abertura não entrega a lanterna. Tico a entrega na etapa 1 do Dia 1 (`DAY_01.md`). |
| "Leia a primeira página" | Sai da abertura. A leitura de Gênesis 1:1–2 acontece na etapa 1 do Dia 1. |
| Tico e Sol explicando a mesma missão | Ordem nova: Sol apresenta o propósito (Quadro 3), Tico entra como companheiro e convida a participar (Quadros 4 e 5). |
| Narrador dos Quadros 1 e 2 | Diretora Sol, fora de cena. |
| Texto final fala só das faíscas | O Quadro 6 anuncia a missão do Dia 1 como um todo, por exemplo "Sua primeira missão: acender a luz no acampamento!" **[redação a definir]**. |

### Texto anterior (referência para a revisão)

**Quadro 2 — O problema.** Visual: Livro dos Sete Dias aberto, páginas faltando; Globo do Éden vazio e apagado. Narração: "Mas temos um pequeno problema... As páginas do Livro dos Sete Dias desapareceram! E o Globo do Éden, que deveria estar cheio de vida, continua vazio e apagado."

**Quadro 3 — Tico aparece.** Visual: Tico surge perto do livro e acena para a criança. Narração de Tico: "Psiu! Aventureiro! Ainda bem que você chegou! Precisamos encontrar as pistas e recuperar as páginas. Mas não se preocupe: eu vou ajudar você!"

**Quadro 4 — Diretora Sol explica.** Visual: Diretora Sol aproxima-se do avatar, com o lenço de líder LA1. Narração da Diretora Sol: "Olá, Aventureiro! Nossa missão será explorar o acampamento, descobrir o que a Bíblia nos ensina, ajudar nossos amigos e recuperar cada página. A cada descoberta, o Globo do Éden ficará mais completo."

**Quadro 5 — A primeira missão.** Visual: Sol entrega uma lanterna ao avatar; três faíscas aparecem em locais diferentes do acampamento. Narração de Tico: "Vamos começar? Pegue sua lanterna, leia a primeira página com atenção e siga as pistas. Você consegue encontrar as três faíscas escondidas pelo acampamento?"

**Quadro 6 — Começar.** Texto na tela: "Sua primeira missão: encontre as três faíscas!" Botão: "COMEÇAR A AVENTURA". Ao confirmar, iniciar a etapa 1 do Dia 1.

## Direção de áudio e acessibilidade
- Vozes acolhedoras, claras, sem infantilização exagerada.
- Música: alegre e marcante na entrada (Quadro 1), acompanhando a emoção de cada quadro; sempre mais baixa sob a narração. Trilha sonora do jogo a definir (veja "Pendências").
- Efeitos ambientais por Web Audio.
- Legendas sempre visíveis.
- Controle para desligar áudio (música e voz separadas).
- Se SpeechSynthesis for usado no MVP, testar suporte e pronúncia em Android, iOS e desktop; oferecer fallback sem áudio.

## Versão 3D (decisão de 18/11/2026)
Os "quadros" da abertura são cenas 3D em blocos com câmera dirigida (sobrevoo do acampamento, aproximação do Livro e do Globo, do Tico e da Diretora Sol), sem ilustrações separadas. Tico e Sol aparecem com expressões e gestos de bloco. A bandeira do Clube e as tendas das classes devem estar visíveis no plano amplo do Quadro 1. Legendas e botões Pular e Repetir continuam em HTML.

## Pendências
- Reescrever os Quadros 2 a 6.
- Trilha sonora da abertura e do jogo: definir estilo de cada momento e origem (composição original ou música com licença livre, com crédito). Não usar o Hino sem autorização.
