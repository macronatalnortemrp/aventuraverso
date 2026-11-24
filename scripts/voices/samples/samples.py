"""Gera amostras de voz para o responsável escolher de ouvido (não vão para o jogo).

Compara, para Tico, Pedrito e Diretora Sol:
- o perfil atual (reamostragem: sobe o tom acelerando a fala, efeito "esquilo");
- Kokoro com mudança de tom pelo vocoder WORLD (tom e formantes separados, fala no ritmo natural);
- Piper (outro motor livre com vozes pt-BR), também com WORLD.

Roda no workflow .github/workflows/voice-samples.yml e grava em scripts/voices/samples/out/.
"""
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
MODELS = HERE / ".models"
SR = 24000

LINES = {
    "tico": ["Você achou a primeira página do Livro dos Sete Dias!", "Quase!", "Agora leve as faíscas ao Globo, na colina!"],
    "pedrito": ["Ai, que escuro!", "O que a cor vinho do lenço nos lembra?"],
    "sol": ["Bem-vinda ao Acampamento do Livro Aberto!", "O portal dos sete dias fica na colina."],
}

# engine, voz, velocidade, tom (F0), formantes, descrição
VARIANTS = {
    "tico": [
        ("atual", "kokoro", "pf_dora,pm_alex", 1.04, 1.38, None, "Como está hoje"),
        ("B", "kokoro", "pf_dora", 1.08, 1.85, 1.20, "Aguda e animada"),
        ("C", "kokoro", "pf_dora", 1.12, 2.20, 1.30, "Bem de desenho animado"),
        ("D", "piper", "faber", 1.10, 2.30, 1.32, "Outro motor (Piper), de desenho"),
    ],
    "pedrito": [
        ("atual", "kokoro", "pm_alex", 1.0, 1.42, None, "Como está hoje"),
        ("B", "kokoro", "pm_alex", 1.0, 1.70, 1.18, "Menino, base masculina"),
        ("C", "kokoro", "pf_dora", 1.0, 1.30, 1.14, "Menino, base feminina"),
        ("D", "piper", "faber", 1.0, 1.80, 1.20, "Outro motor (Piper)"),
    ],
    "sol": [
        ("atual", "kokoro", "pf_dora", 1.0, 1.2, None, "Como está hoje"),
        ("B", "kokoro", "pf_dora", 0.96, 1.0, 1.0, "Voz natural, sem mudar o tom"),
        ("C", "kokoro", "pf_dora", 0.98, 1.10, 1.04, "Um pouco mais jovem"),
    ],
}

PIPER = {
    "faber": "pt/pt_BR/faber/medium/pt_BR-faber-medium",
}

_kokoro = None


def kokoro(text, voice, speed):
    global _kokoro
    if _kokoro is None:
        from kokoro import KPipeline
        _kokoro = KPipeline(lang_code="p")
    chunks = [np.asarray(a, dtype=np.float32) for _, _, a in _kokoro(text, voice=voice, speed=speed)]
    return np.concatenate(chunks), SR


def piper(text, voice, speed):
    import soundfile as sf
    MODELS.mkdir(exist_ok=True)
    base = MODELS / voice
    for ext in (".onnx", ".onnx.json"):
        if not Path(str(base) + ext).exists():
            url = f"https://huggingface.co/rhasspy/piper-voices/resolve/main/{PIPER[voice]}{ext}"
            urllib.request.urlretrieve(url, str(base) + ext)
    wav = MODELS / "tmp.wav"
    subprocess.run(["piper", "-m", f"{base}.onnx", "-f", str(wav), "--length-scale", str(1 / speed)],
                   input=text.encode(), check=True, capture_output=True)
    audio, sr = sf.read(wav, dtype="float32")
    return audio, sr


def resample_pitch(audio, r):
    n = int(len(audio) / r)
    return np.interp(np.arange(n) * r, np.arange(len(audio)), audio).astype(np.float32)


def world_shift(audio, sr, f0_ratio, formant_ratio):
    """Muda o tom (F0) e os formantes separadamente, sem mudar a duração."""
    import pyworld as pw
    x = audio.astype(np.float64)
    f0, t = pw.harvest(x, sr, f0_floor=60, f0_ceil=600)
    sp = pw.cheaptrick(x, f0, t, sr)
    ap = pw.d4c(x, f0, t, sr)
    f0 = f0 * f0_ratio
    if abs(formant_ratio - 1) > 1e-3:
        bins = np.arange(sp.shape[1])
        src = bins / formant_ratio
        sp = np.stack([np.interp(src, bins, row) for row in sp])
        ap = np.stack([np.interp(src, bins, row) for row in ap])
    return pw.synthesize(f0, sp, ap, sr).astype(np.float32)


def to_sr(audio, sr):
    if sr == SR:
        return audio
    return resample_pitch(audio, sr / SR)


def trim(audio, thr=0.01, pad=int(0.06 * SR)):
    idx = np.where(np.abs(audio) > thr)[0]
    return audio if not len(idx) else audio[max(0, idx[0] - pad): idx[-1] + pad]


def encode_mp3(audio, path):
    peak = float(np.max(np.abs(audio))) or 1.0
    audio = (audio / peak * 0.89).astype(np.float32)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-codec:a", "libmp3lame", "-b:a", "64k", str(path)], input=audio.tobytes(), check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index = {}
    for who, variants in VARIANTS.items():
        text = " ".join(LINES[who])
        for vid, engine, voice, speed, f0r, fr, desc in variants:
            try:
                if fr is None:  # perfil atual: gera devagar e acelera
                    audio, sr = kokoro(text, voice, speed / f0r)
                    audio = resample_pitch(audio, f0r)
                else:
                    audio, sr = (kokoro if engine == "kokoro" else piper)(text, voice, speed)
                    audio = to_sr(audio, sr)
                    if abs(f0r - 1) > 1e-3 or abs(fr - 1) > 1e-3:
                        audio = world_shift(audio, SR, f0r, fr)
            except Exception as e:  # uma variante falhar não derruba as outras
                print(f"falhou {who}-{vid}: {e}", file=sys.stderr)
                continue
            name = f"{who}-{vid}.mp3"
            encode_mp3(trim(audio), OUT / name)
            index.setdefault(who, []).append({"id": vid, "file": name, "desc": desc, "engine": engine,
                                              "voice": voice, "speed": speed, "f0": f0r, "formant": fr})
            print("ok", name)
    (OUT / "index.json").write_text(json.dumps({"lines": LINES, "samples": index}, ensure_ascii=False, indent=1) + "\n")


if __name__ == "__main__":
    main()
