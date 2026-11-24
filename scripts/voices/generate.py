"""Gera os áudios das falas com Kokoro-82M (pesos Apache 2.0, vozes pt-BR).

Roda no workflow .github/workflows/voices.yml. Localmente:
    pip install "kokoro>=0.9.4" soundfile numpy pyworld  (+ espeak-ng e ffmpeg no sistema)
    node --experimental-strip-types scripts/voices/collect.ts
    python scripts/voices/generate.py

Só gera o que falta: frases novas, ou todas de uma voz cujo perfil mudou em voices.json.
O áudio gerado é do projeto; o espeak-ng (GPL) só é usado na geração e não vai para o jogo.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
HERE = ROOT / "scripts/voices"
OUT = ROOT / "public/audio/voices"
SR = 24000


def profile_hash(p: dict) -> str:
    keep = {k: p[k] for k in ("voice", "speed", "pitch", "formant") if k in p}
    return hashlib.sha1(json.dumps(keep, sort_keys=True).encode()).hexdigest()[:10]


def shift_pitch(audio: np.ndarray, r: float) -> np.ndarray:
    """Reamostra: r > 1 deixa mais agudo e mais rápido (a fala foi gerada r vezes mais lenta para compensar).
    Muda também os formantes, o que aproxima o timbre de uma criança."""
    if abs(r - 1) < 1e-3:
        return audio
    n = int(len(audio) / r)
    return np.interp(np.arange(n) * r, np.arange(len(audio)), audio).astype(np.float32)


def world_shift(audio: np.ndarray, f0_ratio: float, formant_ratio: float) -> np.ndarray:
    """Vocoder WORLD: sobe o tom (F0) e os formantes separadamente, sem mudar o ritmo da fala.
    Soa como criança sem o efeito "esquilo" da reamostragem. Escolhido de ouvido nas amostras
    de scripts/voices/samples/ (23/11/2026)."""
    import pyworld as pw

    x = audio.astype(np.float64)
    f0, t = pw.harvest(x, SR, f0_floor=60, f0_ceil=600)
    sp = pw.cheaptrick(x, f0, t, SR)
    ap = pw.d4c(x, f0, t, SR)
    if abs(formant_ratio - 1) > 1e-3:
        bins = np.arange(sp.shape[1])
        src = bins / formant_ratio
        sp = np.stack([np.interp(src, bins, row) for row in sp])
        ap = np.stack([np.interp(src, bins, row) for row in ap])
    return pw.synthesize(f0 * f0_ratio, sp, ap, SR).astype(np.float32)


def trim(audio: np.ndarray, thr=0.01, pad=int(0.06 * SR)) -> np.ndarray:
    idx = np.where(np.abs(audio) > thr)[0]
    if not len(idx):
        return audio
    return audio[max(0, idx[0] - pad) : idx[-1] + pad]


def encode_mp3(audio: np.ndarray, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    peak = float(np.max(np.abs(audio))) or 1.0
    audio = (audio / peak * 0.89).astype(np.float32)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
         "-codec:a", "libmp3lame", "-b:a", "48k", str(path)],
        input=audio.tobytes(), check=True,
    )


def main():
    profiles = {k: v for k, v in json.loads((HERE / "voices.json").read_text()).items() if not k.startswith("_")}
    lines = json.loads((HERE / "lines.json").read_text())
    man_path = OUT / "manifest.json"
    old = json.loads(man_path.read_text()) if man_path.exists() else {}
    old_prof = old.get("profiles", {})

    todo = []
    for l in lines:
        p = profiles[l["voice"]]
        stale = old_prof.get(l["voice"]) != profile_hash(p)
        if stale or not (OUT / l["file"]).exists():
            todo.append(l)
    print(f"{len(lines)} frases, {len(todo)} para gerar")

    if todo:
        from kokoro import KPipeline

        pipe = KPipeline(lang_code="p")  # p = português do Brasil
        for i, l in enumerate(todo, 1):
            p = profiles[l["voice"]]
            pitch = float(p.get("pitch", 1.0))
            world = "formant" in p  # tom e formantes pelo WORLD, fala no ritmo natural
            speed = float(p.get("speed", 1.0)) / (1.0 if world else pitch)
            chunks = [np.asarray(a, dtype=np.float32) for _, _, a in pipe(l["text"], voice=p["voice"], speed=speed)]
            if not chunks:
                print(f"  sem áudio: {l['text']!r}", file=sys.stderr)
                continue
            audio = np.concatenate(chunks)
            audio = world_shift(audio, pitch, float(p["formant"])) if world else shift_pitch(audio, pitch)
            audio = trim(audio)
            encode_mp3(audio, OUT / l["file"])
            if i % 20 == 0 or i == len(todo):
                print(f"  {i}/{len(todo)}")

    manifest = {
        "version": 1,
        "engine": "Kokoro-82M (Apache-2.0)",
        "profiles": {k: profile_hash(v) for k, v in profiles.items()},
        "voices": {},
    }
    keep = set()
    for l in lines:
        if (OUT / l["file"]).exists():
            manifest["voices"].setdefault(l["voice"], {})[l["key"]] = l["file"]
            keep.add(l["file"])
    # apaga áudios de falas que saíram do jogo
    for f in OUT.glob("*/*.mp3"):
        if f.relative_to(OUT).as_posix() not in keep:
            f.unlink()
    man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=0) + "\n")
    print("manifesto:", {k: len(v) for k, v in manifest["voices"].items()})


if __name__ == "__main__":
    main()
