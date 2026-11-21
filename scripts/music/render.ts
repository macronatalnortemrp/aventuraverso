/**
 * Gera a trilha: partitura → MIDI → FluidSynth (FluidR3_GM, licença MIT) → MP3.
 *
 *   node --experimental-strip-types scripts/music/render.ts
 *
 * Precisa de fluidsynth, fluid-soundfont-gm e ffmpeg (só na geração; nada disso vai para o jogo).
 * Loops: o arquivo tem duas passagens + cauda; o jogo repete o trecho da segunda passagem,
 * que já começa com a reverberação da primeira (loop sem emenda).
 * Só regera o que mudou (hash da partitura da cue + do script).
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CUES, renderCue } from '../../src/engine/musicScore.ts';
import type { NoteEvent, Score } from '../../src/engine/musicScore.ts';
import { writeMidi } from './midi.ts';

const ROOT = new URL('../../', import.meta.url).pathname;
const OUT = join(ROOT, 'public/audio/music');
const SF2 = process.env.SF2 ?? '/usr/share/sounds/sf2/FluidR3_GM.sf2';
const TAIL = 1.8;
const BITRATE = '48k';

const score: Score = JSON.parse(readFileSync(join(ROOT, 'public/data/music/theme.json'), 'utf8'));
const self = readFileSync(new URL(import.meta.url).pathname, 'utf8') + readFileSync(join(ROOT, 'src/engine/musicScore.ts'), 'utf8');
mkdirSync(OUT, { recursive: true });
const manPath = join(OUT, 'manifest.json');
const old = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : { cues: {} };
const man: { version: number; soundfont: string; cues: Record<string, unknown> } = { version: 1, soundfont: 'FluidR3_GM (MIT)', cues: {} };
const tmp = mkdtempSync(join(tmpdir(), 'trilha-'));

for (const id of CUES) {
  const r = renderCue(score, id);
  const hash = createHash('sha1')
    .update(JSON.stringify(score.cues[id]) + JSON.stringify(score.theme) + JSON.stringify(score.chordNotes) + self)
    .digest('hex')
    .slice(0, 12);
  const file = `${id}.mp3`;
  const entry = { file, seconds: +r.seconds.toFixed(4), loop: r.loop, loopStart: r.loop ? +r.seconds.toFixed(4) : 0, hash };
  if (old.cues?.[id]?.hash === hash && existsSync(join(OUT, file))) {
    man.cues[id] = old.cues[id];
    console.log(`${id}: sem mudança`);
    continue;
  }
  const events: NoteEvent[] = r.loop ? [...r.events, ...r.events.map((e) => ({ ...e, t: e.t + r.seconds }))] : r.events;
  const mid = join(tmp, `${id}.mid`),
    wav = join(tmp, `${id}.wav`);
  writeFileSync(mid, writeMidi(events, r.programs, score.cues[id].bpm, TAIL));
  execFileSync('fluidsynth', ['-ni', '-g', '0.6', '-r', '44100', '-F', wav, SF2, mid], { stdio: 'ignore' });
  const len = (r.loop ? 2 * r.seconds : r.seconds) + TAIL;
  // corta no tamanho certo, normaliza e codifica em MP3 mono
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-t', len.toFixed(3), '-af', 'loudnorm=I=-18:TP=-1.5:LRA=11', '-ac', '1', '-ar', '44100', '-b:a', BITRATE, join(OUT, file)]);
  man.cues[id] = entry;
  console.log(`${id}: ${(statSync(join(OUT, file)).size / 1024).toFixed(0)} KB, ${len.toFixed(1)} s`);
}
writeFileSync(manPath, JSON.stringify(man, null, 1) + '\n');
