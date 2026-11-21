# Trilha sonora do aventuráVerso — design

Data: 21/11/2026. Decisões do responsável do projeto tomadas na conversa desta data.

## Intenção
Dar ao jogo uma **música alegre e marcante, que a criança cantarole depois**: a "música do aventuráVerso", associada ao jogo e ao Clube. Hoje só a abertura tem música (provisória, sintetizada por código); o resto do jogo tem apenas efeitos.

## Decisões tomadas
- **Um tema só**, instrumental agora e com letra depois. O tema escolhido é a **"Festa da Luz"** (proposta 3 da página de teste): 4/4, 126 bpm, Dó maior, 8 compassos em duas frases de 4, saltitante, com pausas no meio da frase para palmas.
- **Variações do mesmo tema** em cada momento do jogo, em vez de músicas diferentes (a repetição em contextos diferentes é o que fixa a melodia).
- **Caminho B:** a partitura fica no projeto como dados; um workflow do GitHub transforma em áudio com instrumentos gravados de um banco de sons livre. Se o áudio faltar, o jogo toca a mesma partitura sintetizada, nunca fica mudo. Um músico pode regravar o mesmo tema depois (caminho C), sem mudar o resto.
- **Leitura da Bíblia e perguntas:** a música continua, bem baixinha.

## Objetivos
1. A criança reconhece e cantarola o tema depois de jogar.
2. Cada momento tem o clima certo (chegada, exploração, escuro, mistério, conquista, leitura) usando o mesmo tema.
3. A música nunca atrapalha: abaixa sob qualquer fala e fica bem baixa nas leituras.
4. Leve no celular de entrada: nada pesado antes do primeiro toque, arquivos pequenos, sem travar o início.
5. Tudo o que vai para o jogo é original do projeto ou de licença livre e compatível.

## Não objetivos (agora)
- Letra e canto (vêm depois, sobre a mesma melodia).
- Gravação com músico (caminho C, futuro).
- Música diferente para cada um dos sete dias (os dias 2 a 7 reaproveitam as variações).
- Música que reage em camadas ao que a criança faz (música adaptativa).

## Anti-objetivos (seria fracasso mesmo funcionando)
- Música que compete com a narração ou atrapalha a leitura.
- Qualquer semelhança com o Hino dos Aventureiros ou com música de outra marca ou jogo.
- Clima de pressão ou suspense que assuste (sem "contagem regressiva", sem susto no escuro).
- Download grande que atrase o começo do jogo ou gaste os dados móveis da família.
- Jogo dependente de som: a música é sempre opcional (`AGENTS.md`).

## Restrições
- Stack: Three.js + TypeScript + Vite; áudio por Web Audio. Nenhuma dependência nova no jogo.
- Ferramentas de geração (sintetizador, banco de sons, ffmpeg) só no workflow, como as vozes (`voices.yml`); o jogo recebe só os arquivos prontos.
- iOS: áudio só depois do primeiro toque. Formato MP3 (o mesmo das vozes, compatível com Safari).
- Nada sai do aparelho; nenhuma requisição externa em tempo de execução além dos arquivos do próprio site.

## Abordagens consideradas
| | Abordagem | Prós | Contras |
|---|---|---|---|
| A | Tudo sintetizado por código (como a abertura de hoje) | sem arquivos, zero licença, leve | timbre "eletrônico simples"; marcante na melodia, fraco no som |
| **B (escolhida)** | Partitura no projeto → workflow gera MP3 com banco de sons livre; síntese como reserva | instrumentos com som real, editável nota a nota, mesmo esquema das vozes, sem depender de pessoas | qualidade limitada ao banco de sons; precisa de loop sem emenda audível |
| C | Músico ou banco de músicas | melhor qualidade | depende de pessoas e prazos, direitos autorais, música de banco não é exclusiva |

B começa já e não fecha a porta para C: a partitura vira a referência para um músico regravar.

## Desenho

### 1. Partitura como dados — `public/data/music/theme.json`
Fonte única do tema e das variações, lida pelo gerador (workflow) e pelo sintetizador reserva do jogo.
- `theme`: a melodia da Festa da Luz (`[nota MIDI | null, duração em tempos]`) e os acordes por compasso, exatamente como na página de teste.
- `cues`: uma entrada por variação, com andamento, tom (transposição), instrumentos (números de programa General MIDI), partes (melodia, acordes, baixo, percussão), quantas vezes repete e se é **loop** ou **vinheta** (toca uma vez).

Variações (o "quem toca" é ponto de partida para o construtor afinar de ouvido):

| Cue | Onde toca | Caráter | Tipo |
|---|---|---|---|
| `festa` | tela de título; abertura, Quadro 1 | tema completo, palmas, xilofone + ukulele, baixo saltitante | loop |
| `misterio` | abertura, Quadro 2 | tema em Lá menor, lento, notas soltas, sob o vento (o vento continua sintetizado) | loop |
| `acolhida` | abertura, Quadros 3 a 5 | tema a ~90 bpm, violão dedilhado e flauta | loop |
| `esperanca` | abertura, Quadro 6 | segunda frase do tema, subindo, acorde cheio no fim | vinheta (depois segue `acolhida` baixinho) |
| `explorar` | acampamento de dia, fora e dentro das missões | tema a ~100 bpm, só violão e xilofone, leve, loop longo (2 passagens com variação) | loop |
| `escuro` | Dia 1 no escuro (etapas 1 a 3) | tema bem lento, celesta/xilofone suave, poucas notas, grilos ficam com o ambiente | loop |
| `faisca` | faísca encontrada, resposta certa, quadro aceso | 2 compassos iniciais do tema, xilofone | vinheta curta |
| `vitoria` | "Haja luz" (etapa 4), Globo aceso (etapa 7), fim do dia | tema completo e cheio, um degrau acima (Ré maior), final forte | vinheta |

### 2. Geração do áudio — workflow "Trilha sonora"
- `scripts/music/render.ts` (Node, sem dependências): lê `theme.json`, gera um arquivo MIDI por cue (escritor de MIDI próprio, simples).
- No workflow: FluidSynth renderiza cada MIDI com o banco de sons **FluidR3_GM** (licença MIT, pacote `fluid-soundfont-gm`) **[conferir a licença do pacote no momento de implementar]**; ffmpeg normaliza e converte para MP3 (~96 kbps, mono ou estéreo leve).
- Saída: `public/audio/music/<cue>.mp3` + `public/audio/music/manifest.json` com, por cue: arquivo, duração, `loopStart` e `loopEnd` em segundos (calculados da partitura, não do MP3) e um hash da entrada, para só regerar o que mudou.
- Dispara quando muda `public/data/music/**`, `scripts/music/**` ou o próprio workflow; commita os arquivos e dispara o deploy, como `voices.yml`.
- Meta de tamanho: cada loop ≤ 350 KB, vinhetas ≤ 80 KB (a vitória, com o tema inteiro, ≤ 130 KB), total ≤ 2 MB. Resultado: ~1,3 MB em MP3 mono a 48 kbps.

### 3. Tocador no jogo — `src/engine/music.ts` (evolução do atual)
- API: `play(cue)`, `stop()`, `duck(nível)`, `setEnabled(bool)`. A abertura passa a chamar cues (`festa`, `misterio`, `acolhida`, `esperanca`) no lugar dos temas atuais.
- Carrega o manifesto depois do primeiro toque; baixa e decodifica cada cue só quando for usado (o próximo provável é pré-carregado em segundo plano).
- Loop sem emenda: `AudioBufferSourceNode` com `loop = true`, `loopStart`/`loopEnd` do manifesto (evita o silêncio que o MP3 põe no começo).
- Troca de cue com fade cruzado de ~1,2 s; vinheta toca por cima abaixando o loop e depois devolve.
- **Reserva:** se o arquivo não existir ou falhar, toca a mesma partitura com a síntese atual (osciladores e corda dedilhada). O jogo nunca fica mudo por falta de arquivo.
- Volumes (ponto de partida, afinar de ouvido): normal 100%; sob fala 40%; **leitura da Bíblia e perguntas 15%**; vinhetas 100% com o loop a 30%.

### 4. Quando cada cue toca
- Título: `festa`. Abertura: conforme os quadros.
- Acampamento livre de dia: `explorar`. Entrar no portal/jornada: mantém.
- Dia 1: etapas no escuro → `escuro`; "Haja luz" → `vitoria` e depois `explorar` quando o dia volta (etapa 5); Globo aceso → `vitoria`; tela de feedback → `explorar` a 40%.
- `faisca` a cada faísca encontrada, resposta certa e convite pendurado.
- Leituras (Pergaminho da Palavra) e perguntas: a música atual a 15%.
- Pausa e aba oculta: a música pausa junto com o jogo.

### 5. Botão de música
- Novo botão "Música" no topo, ao lado do "Som". **Som** continua valendo para vozes e efeitos; **Música** liga e desliga só a trilha. Independentes.
- Salvo no aparelho: save v4 com `music: boolean` (padrão ligado), com migração.
- Acessibilidade: `aria-pressed`, rótulo "Música", operável por teclado.

### 6. Documentação e créditos
- `README.md`: seção de áudio com FluidSynth/FluidR3_GM (só na geração) e crédito do banco de sons.
- `ASSET_LIST.md` e `TECH_ARCHITECTURE.md`: trilha definida (tema único, variações, geração).
- `INTRO_SEQUENCE.md`: abertura usando o tema.
- `SOURCES_AND_DECISIONS.md`: decisão da trilha.

### 7. Testes
- `theme.json` válido: cada compasso soma o número de tempos do compasso; acordes cobrem a melodia; cada cue tem os campos obrigatórios.
- Escritor de MIDI: cabeçalho e trilhas corretos para uma partitura pequena conhecida.
- Escolha de cue por estado do jogo (função pura): título, dia, escuro, leitura.
- Save v4: migração de v3 com `music` ligado por padrão.

## Fica a critério do construtor
- As notas exatas de cada variação (o tema base é fixo; os arranjos são para afinar de ouvido).
- Instrumentos GM exatos dentro de cada caráter descrito.
- Taxa de bits e mono/estéreo, desde que caibam nas metas de tamanho.
- Ícone do botão de música, seguindo os ícones SVG atuais.

## Pendências fora do código
- Conferir a licença do banco de sons no pacote usado no workflow antes do primeiro merge.
- Quando houver letra: revisão do texto pela liderança antes de entrar no jogo.
