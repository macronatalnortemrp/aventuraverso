# Trilha sonora — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tocar o tema "Festa da Luz" e suas oito variações em cada momento do jogo, com áudio gerado de partitura e síntese como reserva.

**Architecture:** A partitura (`public/data/music/theme.json`) vira eventos de nota por uma função pura (`src/engine/musicScore.ts`), usada pelo gerador (MIDI → FluidSynth → MP3) e pelo sintetizador reserva do jogo. Um tocador (`src/engine/music.ts`) toca os MP3 em loop sem emenda, faz fade cruzado, vinhetas por cima e volumes por contexto. Uma função pura escolhe a cue pelo estado do jogo.

**Tech Stack:** TypeScript, Web Audio, Vitest; no workflow: Node, FluidSynth, FluidR3_GM (MIT), ffmpeg.

**Spec:** `docs/superpowers/specs/2026-11-21-trilha-sonora-design.md`

## Global Constraints
- Nenhuma dependência nova no jogo; FluidSynth/banco/ffmpeg só na geração.
- Cues: `festa`, `misterio`, `acolhida`, `esperanca`, `explorar`, `escuro`, `faisca`, `vitoria`.
- Volumes: normal 100%; sob fala 40%; leitura da Bíblia e perguntas 15%; loop a 30% durante vinheta.
- Fade cruzado ~1,2 s. MP3. Loops ≤ 350 KB, vinhetas ≤ 80 KB, total ≤ 2 MB.
- Áudio só depois do primeiro toque; música sempre opcional; botão "Música" separado do "Som"; save v4 `music: boolean` (padrão ligado).

## Review Focus
- Arquivo de música ausente ou falhando → toca a síntese da mesma partitura (teste: tocador sem manifesto escolhe síntese).
- Botão Música desligado no meio de uma vinheta → silêncio imediato, sem vinheta tardia (teste no tocador: `setEnabled(false)` cancela pendentes).
- Troca rápida de cue (aceitar desafio e cair na missão) → só a última cue toca (teste: `play` duas vezes seguidas deixa uma ativa).
- Save v3 sem `music` → música ligada (teste de migração).
- Leitura aberta enquanto vinheta toca → volume volta a 15% depois (teste da função de nível).

---

### Task 1: Partitura e eventos
**Files:** Create `public/data/music/theme.json`, `src/engine/musicScore.ts`; Test `tests/music.test.ts`
**Interfaces — Produces:** `type CueId`; `interface Score`; `interface NoteEvent { t: number; d: number; midi: number; vel: number; part: 'lead'|'lead2'|'chords'|'bass'|'kick'|'clap'|'hat' }`; `renderCue(score: Score, id: CueId): { events: NoteEvent[]; seconds: number; loop: boolean }` (t, d em segundos).
- [ ] Testes: tema tem 32 tempos e acordes cobrem 32; cada cue gera eventos dentro de `seconds`; `faisca` ≤ 3 s; `vitoria` transposta +2; loops têm `loop: true`.
- [ ] Implementar e passar. Commit.

### Task 2: Escritor de MIDI e gerador
**Files:** Create `scripts/music/midi.ts`, `scripts/music/render.ts`, `.github/workflows/music.yml`; Test em `tests/music.test.ts`
**Interfaces — Consumes:** `renderCue`. **Produces:** `writeMidi(events, programs): Uint8Array`; `public/audio/music/manifest.json` `{ version, cues: { [id]: { file, seconds, loop, hash } } }`.
- [ ] Teste: cabeçalho `MThd`, formato 1, divisão 480, uma trilha por parte, notas ligam e desligam.
- [ ] Gerar localmente (FluidSynth + ffmpeg), conferir tamanhos. Commit com os MP3.

### Task 3: Tocador
**Files:** Rewrite `src/engine/music.ts`; Test em `tests/music.test.ts`
**Interfaces — Produces:** `class Music { play(id: CueId): void; sting(id: CueId): void; stop(sec?): void; setEnabled(on): void; setContext(c: 'normal'|'speech'|'reading'): void; level(): number }`; `musicLevel(ctx, stinging): number`.
- [ ] Testes de `musicLevel` (1 / 0,4 / 0,15 / ×0,3 com vinheta).
- [ ] Implementar com manifesto, decodificação sob demanda, loop sem emenda, fade cruzado, reserva sintetizada. Commit.

### Task 4: Escolha da cue e integração
**Files:** Create `src/game/musicCue.ts`; Modify `src/main.ts`, `src/game/intro.ts`, `src/game/day01/mission.ts`, `src/ui/task.ts`, `src/ui/hud.ts`, `src/persistence/save.ts`, `index.html`, `src/style.css`
**Interfaces — Produces:** `cueFor(s: { started: boolean; intro: boolean; mission: boolean; night: boolean }): CueId`.
- [ ] Testes de `cueFor` e da migração v4.
- [ ] Ligar: título `festa`; abertura `festa`/`misterio`/`acolhida`/`esperanca`; jogo `explorar`/`escuro`; vinhetas `faisca` (faísca, resposta certa, convite, espelho que acende) e `vitoria` (Haja luz, Globo, cristal); leitura/perguntas a 15%; falas a 40%; botão Música.
- [ ] Testar no navegador; commit.

### Task 5: Documentação e PR
- [ ] README (créditos FluidR3_GM, MIT), ASSET_LIST, TECH_ARCHITECTURE, SOURCES_AND_DECISIONS, INTRO_SEQUENCE. Build, testes, PR.
