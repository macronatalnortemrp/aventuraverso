# SOURCES_AND_DECISIONS.md — Fontes e decisões

## Decisões aprovadas pelo responsável do projeto
- Nome/conceito: Bíblia Visual — Mundo 1: Éden: Os Sete Dias.
- Estilo: **mundo 3D de blocos, acolhedor e fortemente temático do Clube** (decidido em 18/11/2026, substitui a pintura digital 2D).
- Câmera e movimento: câmera 3D que segue o personagem; a criança toca no chão para andar (substitui top-down e cenas ilustradas). Funciona em paisagem e retrato.
- Tecnologia: Three.js + TypeScript + Vite (substitui Phaser).
- Natureza: **piloto de teste** para a Macro. Feedback ao fim de cada dia nesta fase inicial; depois entram ranking, código do clube e demais ideias (veja `ROADMAP.md`).
- Voz: só vozes gravadas do jogo (Kokoro). **Nunca a voz do aparelho** (SpeechSynthesis, VoiceOver, TalkBack), decisão de 21/11/2026.
- Tradução bíblica do MVP (21/11/2026): Almeida Corrigida Fiel (ACF), 2007, no lugar da Revista e Corrigida de 1898 (sem texto digital de domínio público encontrado; a ARC digital atual é da SBB, com direitos). Fonte: github.com/ameisehaufen/BibleMarkdown, `original/bible-acf2007.csv`, commit a59ab8f. Trocável depois. Os 34 versículos foram conferidos pelo responsável e o uso foi validado com a Sociedade Bíblica Trinitariana do Brasil (21/11/2026).
- Leitura no próprio jogo (21/11/2026): o texto bíblico aparece e é lido no jogo, porque nem toda criança tem Bíblia em casa. Substitui o ciclo que alternava com a Bíblia impressa.
- Ideais do Clube: apenas Voto, Lei, Hino e Voto à Bíblia.
- Representação da Trindade: Voz, luz e silhuetas, sem rosto (validada pela liderança).
- Plataformas: celular e desktop.
- Personagem inicial: escolher entre seis personagens pré-definidos, três masculinos e três femininos.
- Todos os avatares usam lenço bordô do Aventureiro com o emblema A1 oficial.
- Uniforme padrão (decidido): camisa branca, saia (meninas) ou calça (meninos) azul-marinho, cinto, meias brancas, sapato preto e lenço vinho; faixa opcional com Distintivos. Roupa de aventura vira conjunto alternativo.
- Não existe lema: ideais só os do Guia.
- Significado do lenço definido pelo responsável (`docs/LENCO.md`): três significados (cor, formato, emblema). As três áreas do lenço complementam as quatro áreas do Guia; não é erro.
- Repositório: conta GitHub `macronatalnortemrp` (sem repositórios ainda).
- Diretora Sol usa lenço bordô de líder.
- Roupas infantis podem seguir estilo explorador.
- A trilha de visitante não muda a identidade do avatar.
- Emblemas oficiais A1 e LA1 recebidos e incluídos em `public/assets/official/`. O A1 tem baixa resolução.
- Premissa (20/11/2026): o Livro dos Sete Dias é o livro de histórias do acampamento; suas páginas desaparecem e são reconstruídas com a Bíblia como fonte. A Bíblia nunca muda nem se perde. Cada mundo é uma história bíblica; o Mundo 1 é a criação.
- Personagens sem nome próprio (20/11/2026): a criança dá um apelido ao boneco escolhido, salvo só no aparelho. Toda fala com gênero tem versão masculina e feminina, conforme o boneco. (Não confundir com o "cadastro por apelido e código do clube" do pós-piloto, que envolve rede.)
- Uso do lenço (20/11/2026): triângulo com o emblema nas costas; na frente, as duas pontas unidas por prendedor cilíndrico branco com emblema pequeno. Lenço de líder com listras nas cores das quatro classes. Detalhes em `LENCO.md`.
- Trilha sonora (21/11/2026): tema único instrumental "Festa da Luz" (letra depois), em variações por momento; música bem baixa durante a leitura da Bíblia; gerada da partitura com o banco de sons FluidR3_GM (MIT). Ver `docs/superpowers/specs/2026-11-21-trilha-sonora-design.md`.
- Recompensas passam a ser Distintivos do Acampamento (não oficiais) e Quadros dos Ideais.

## Fontes oficiais pesquisadas
1. Downloads Adventistas — “Logo e Artigos: Aventureiros”, Divisão Sul-Americana, publicado em 15/01/2020. A página informa que o pacote compactado contém logos A1, A2, A3 e A4, bandeiras, lenços e prendedores em PDF e PNG:
   https://downloads.adventistas.org/pt/aventureiros/logomarcas/logos-aberto-aventureiros/
2. Adventistas.org — Emblema dos Aventureiros:
   https://www.adventistas.org/pt/aventureiros/sobre-nos/emblema/
3. Regulamento de Uniformes MDA 2020, Divisão Sul-Americana. Usar como referência consultada, mas verificar com Associação/Missão se existe edição mais recente antes da arte final de uniformes.

## Significado da cor bordô
Material oficial OMA 006/2017 consultado anteriormente informa que a cor vinho representa o sangue de Jesus derramado na cruz para salvar cada criança e família. Manter a explicação em contexto cristão e não inventar outros significados.

## Pendências para validação humana
- Confirmar se o regulamento 2020 continua vigente na Associação/Missão local.
- Baixar e selecionar os arquivos oficiais A1 e LA1 no pacote oficial.
- Confirmar detalhes exatos do lenço de líder e posicionamento do LA1.
- Validar a fala sobre significado do lenço antes de colocá-la na boca de Pedrito. Por ora ele pergunta só a cor.
- Hino: letra autorizada e enviada pelo coordenador geral da Macro em 24/11/2026 (texto exato em `club-texts.json`). A gravação não é usada.
- Criar o formulário externo do piloto e preencher `src/config/pilot.ts`.

- Aprovar o desenho definitivo de Tico e os seis avatares antes de produzir animações.
- Validar os itens marcados em `THEME_AVENTUREIROS.md` (uniforme, posição do emblema, cores das trilhas, hasteamento, nomes).
- Obter A1 em alta resolução, emblemas das classes e logo da Macro.
- Corrigir o PDF do roteiro conforme `ERRATA_ROTEIRO.md`.
- Testar desempenho em celular de entrada logo na Fase 1.

## Fontes de conteúdo locais
- PDF “Mundo 1 — Éden: Os Sete Dias”: exportar do documento do roteiro e colocar em `docs/source/`.
- PDF “Guia do Aspirante — Clube de Aventureiros · Macro Natal Norte”: já está em `docs/source/`.
Esses arquivos são as referências primárias para o conteúdo do projeto.
