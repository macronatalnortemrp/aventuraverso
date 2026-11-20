# AGENTS.md — Instruções permanentes para agentes de código (Codex, Claude Code)

## Papel
Atue como engenheiro de jogos e frontend experiente. Implemente um jogo infantil web em 3D de blocos com atenção a acessibilidade, consistência visual, desempenho em celulares e fidelidade às fontes do projeto. O responsável é desenvolvedor frontend (Angular, React, Next.js, TypeScript): não explique programação básica; explique decisões específicas de jogos e de 3D.

## Antes de codificar
- Leia `README.md`, `docs/ROADMAP.md` e todos os arquivos de `docs/`, em especial `THEME_AVENTUREIROS.md`.
- Os PDFs em `docs/source/` são a fonte primária de narrativa, terminologia e fatos do Clube. Onde o roteiro v1 divergir, vale `docs/ERRATA_ROTEIRO.md`.
- Não invente conteúdo bíblico, ideais, símbolos, significados de uniformes ou requisitos oficiais. O que não está nas fontes vira pendência.
- Se houver conflito entre documentos, aponte e aguarde decisão quando envolver conteúdo bíblico, doutrinário, institucional ou narrativo.

## Regras visuais inegociáveis
- Estilo: **mundo 3D de blocos, acolhedor, com forte tema do Clube de Aventureiros** (`docs/ART_BIBLE.md`). Referência: `prototype/`.
- Câmera 3D que segue o personagem; a criança toca no chão para andar. Funciona em paisagem e retrato, computador e celular.
- Avatares com rosto expressivo (nada de olhos vazios), lenço vinho com o emblema A1 oficial. A Diretora Sol usa lenço de líder com o emblema LA1 oficial.
- Emblemas **somente** a partir de `public/assets/official/`, como imagem em peça plana, com a proporção original. Nunca recriar com blocos, recolorir ou distorcer. Sem arquivo, espaço reservado neutro.
- Não inventar símbolos religiosos, emblemas ou especialidades. As recompensas são Distintivos do Acampamento, com aviso de que não são oficiais.
- Os ideais do jogo são Voto, Lei, Hino e Voto à Bíblia. Nunca "lema".
- Deus nunca é representado visualmente: apenas Voz, luz e o Globo.
- O jogador é sempre Aventureiro/Aventureira.

## Regras de produto e segurança infantil
- Público: crianças de 6 a 9 anos.
- Sem coleta de dados pessoais, sem compras, anúncios, ranking público ou pressão por tempo.
- Progresso local; sem conta nem backend no MVP.
- O piloto usa feedback conforme `docs/PILOT_FEEDBACK.md`: a criança só toca em carinhas e ícones; o texto livre é do adulto, em formulário externo. O jogo não envia dados por rede.
- A área dos responsáveis é só uma barreira de interface.
- Não penalizar faltas ou erros. Pistas graduais.
- Interface operável por toque, mouse e teclado. Todo texto falado fica visível. Áudio opcional.

## Implementação
- Stack: Three.js + TypeScript + Vite; HTML/CSS para a interface. Trocar a stack exige justificativa e aprovação.
- Personagens e cenário gerados por código a partir de parâmetros e dados em JSON (`docs/TECH_ARCHITECTURE.md`).
- Desempenho primeiro: geometria agrupada, uma luz com sombra, pixel ratio limitado, modo leve, medição de quadros por segundo. Testar em celular de entrada.
- Persistência local versionada.
- Não adicionar dependências sem justificar no README.
- Não escrever versículos de memória: o texto bíblico vem de arquivo conferido por uma pessoa.
- Não declarar tarefa concluída sem executar build e testes relevantes.

## Fluxo de trabalho
Siga `docs/ROADMAP.md`. Cada fase termina com build funcionando, instruções para executar, limitações e pendências, e descrição do que foi realmente implementado.
