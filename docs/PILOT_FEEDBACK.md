# PILOT_FEEDBACK.md — Feedback do piloto

## Objetivo
Saber, ao fim de cada dia jogado, se a criança está gostando e onde há dificuldade, sem coletar dados pessoais e sem criar backend no MVP.

## Interpretação adotada
"Fase" = cada Dia do jogo. Ao terminar o Dia 1, 2, 3... aparece a tela de feedback. (Se a intenção for outra, confirmar com o responsável.)

## Parte 1 — A criança (dentro do jogo, ao fim de cada dia)
Tela curta, com áudio, sempre com botão "Pular":
1. "Como foi hoje?" — três carinhas grandes: gostei muito, mais ou menos, não gostei.
2. "O que você mais gostou?" — até dois ícones: Tico, procurar coisas, perguntas, Globo, histórias, personagens.
3. "Quer jogar o próximo dia?" — Sim / Mais tarde.

Regras: sem texto livre da criança, sem nome, sem foto, sem tempo limite. As respostas ficam só no aparelho, em `feedback.dayNN`:
`{ mood, liked[], wantsNext }`

## Parte 2 — O responsável (formulário externo)
Na área dos responsáveis, o botão "Dar opinião sobre o jogo" abre em nova aba um formulário (Google Forms ou similar). O endereço fica em `src/config/pilot.ts`. Perguntas sugeridas ao adulto:
- Qual é o clube? (lista dos clubes ativos da Macro, escolhida pelo adulto)
- Faixa etária da criança (6–7 ou 8–9).
- Aparelho e navegador usados.
- A criança entendeu o que fazer sozinha? Onde travou?
- Algum erro, texto confuso ou conteúdo que mereça revisão?
- O que mais e o que menos agradou?
- Campo livre. Contato opcional, por escolha do adulto.

O jogo pode mostrar um "resumo do dia" (as carinhas e ícones escolhidos) com botão "copiar", para o adulto colar no formulário. Se o formulário aceitar, o endereço pode ser pré-preenchido por parâmetros de URL, sem dados pessoais. Validar essa opção antes de implementar.

## Controle
`src/config/pilot.ts`:
```ts
export const pilot = {
  feedbackEnabled: true,
  feedbackUntilDay: 7,
  parentFormUrl: "", // preencher com o formulário
};
```
Ao encerrar o piloto, desligar `feedbackEnabled` sem mexer no restante.

## Fora do escopo agora
Analytics, envio automático, ranking, código do clube e painel do diretor. Entram no ROADMAP pós-piloto, com validação de privacidade e autorização dos responsáveis.
