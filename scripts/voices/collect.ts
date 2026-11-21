/**
 * Junta todas as falas do jogo e decide qual voz diz cada uma.
 * Saída: scripts/voices/lines.json, lido por generate.py.
 *
 *   node --experimental-strip-types scripts/voices/collect.ts
 *
 * Fontes: public/data/days/*.json, public/data/intro.json, a Bíblia conferida e os textos fixos em src/**\/*.ts.
 * Textos montados com ${...} entram só nas frases completas e fixas; o resto usa a voz do aparelho.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPEAKERS, fnv, lineKey, splitSentences, voiceOf } from '../../src/engine/voiceText.ts';
import type { VoiceId } from '../../src/engine/voiceText.ts';

const ROOT = new URL('../../', import.meta.url).pathname;
const out = new Map<string, { voice: VoiceId; key: string; text: string; file: string }>();
const usedFiles = new Map<string, string>();

function add(voice: VoiceId, text: string) {
  for (const s of splitSentences(text)) {
    if (/[{}]/.test(s)) continue; // frase com apelido: só legenda
    const key = lineKey(s);
    const id = `${voice}|${key}`;
    if (!key || out.has(id)) continue;
    let h = fnv(id),
      n = 0;
    while (usedFiles.has(`${voice}/${h}`) && usedFiles.get(`${voice}/${h}`) !== id) h = fnv(id + ++n);
    usedFiles.set(`${voice}/${h}`, id);
    out.set(id, { voice, key, text: s, file: `${voice}/${h}.mp3` });
  }
}

/* ---------- dados dos dias ---------- */
const SKIP = new Set(['id', 'keys', 'ref', 'status', 'answer', 'enabled', 'who', 'group']);
function voiceForPath(path: string[], parentWho?: string): VoiceId {
  if (parentWho) return voiceOf(parentWho);
  if (path.includes('pedrito')) return 'pedrito';
  if (path[0] === 'invites' && path[1] === 'sol') return 'sol';
  if (path[0] === 'globe' && path[1] === 'voice') return 'narrador';
  if (path[0] === 'title') return 'narrador';
  return 'tico';
}
function walk(v: unknown, path: string[], who?: string) {
  if (typeof v === 'string') return /^[a-z0-9_-]+$/.test(v) ? undefined : add(voiceForPath(path, who), v); // ids
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, [...path, String(i)], who));
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const w = typeof o.who === 'string' ? o.who : who;
    for (const [k, x] of Object.entries(o)) if (!k.startsWith('_') && !SKIP.has(k)) walk(x, [...path, k], w);
  }
}
const daysDir = join(ROOT, 'public/data/days');
for (const f of readdirSync(daysDir).filter((f) => f.endsWith('.json'))) {
  const day = JSON.parse(readFileSync(join(daysDir, f), 'utf8'));
  walk(day, []);
  // leitura bíblica: o mesmo texto que src/ui/task.ts monta
  for (const r of Object.values<{ ref: string }>(day.readings ?? {})) {
    add('narrador', `${r.ref}.`);
    add('narrador', `Pegue uma Bíblia e leia, com a ajuda de um adulto, ${r.ref.replace('-', ' a ')}.`);
  }
}
// abertura narrada (docs/INTRO_SEQUENCE.md)
walk(JSON.parse(readFileSync(join(ROOT, 'public/data/intro.json'), 'utf8')), []);
const bible = JSON.parse(readFileSync(join(ROOT, 'public/data/content/bible-acf2007.json'), 'utf8'));
for (const v of Object.values<string>(bible.verses ?? {})) add('narrador', v);

/* ---------- textos fixos no código ---------- */
// quem fala é o último nome de personagem que apareceu antes no arquivo; o Tico sempre ganha uma cópia
const LITERAL = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const speechLike = (s: string) => /^[\p{Lu}¡¿"“]/u.test(s) && /[.!?…]$/.test(s) && !/[<>{}=#\\|_/]/.test(s);
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}
for (const f of files(join(ROOT, 'src'))) {
  const src = readFileSync(f, 'utf8');
  let speaker: VoiceId = 'tico';
  for (const m of src.matchAll(LITERAL)) {
    const raw = (m[1] ?? m[2] ?? m[3] ?? '').replace(/\\(.)/g, '$1');
    if (raw in SPEAKERS) {
      speaker = SPEAKERS[raw];
      continue;
    }
    // em template literal, só as partes fixas; a frase vizinha de um ${} fica incompleta e é descartada
    const chunks = m[3] !== undefined ? raw.split(/\$\{[^}]*\}/) : [raw];
    for (const c of chunks) {
      const ss = splitSentences(c);
      ss.forEach((s, i) => {
        if (chunks.length > 1 && i === ss.length - 1 && !/[.!?…]\s*$/.test(c)) return;
        if (!speechLike(s)) return;
        add(speaker, s);
        if (speaker !== 'tico') add('tico', s);
      });
    }
  }
}

const list = [...out.values()].sort((a, b) => a.file.localeCompare(b.file));
writeFileSync(join(ROOT, 'scripts/voices/lines.json'), JSON.stringify(list, null, 1) + '\n');
const per = list.reduce<Record<string, number>>((a, l) => ((a[l.voice] = (a[l.voice] ?? 0) + 1), a), {});
console.log(`${list.length} frases`, per);
