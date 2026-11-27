"""
TTS configurável. Padrão: Kokoro (neural, local, offline, gratuito, determinístico).
Outros provedores (ElevenLabs / OpenAI / Azure) são usados se config/voices.json
mandar e a chave de API existir no ambiente.

Uso direto: python3 scripts/audio/tts.py "texto" narrador saida.wav
"""
from __future__ import annotations
import hashlib, json, os, re, subprocess, sys, tempfile, urllib.request
from pathlib import Path
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / "tts_models"
SR = 48000

_kokoro = None


def kokoro():
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        onnx, voices = MODELS / "kokoro-v1.0.onnx", MODELS / "voices-v1.0.bin"
        if not onnx.exists():
            raise SystemExit("Modelos Kokoro ausentes. Rode: bash scripts/setup.sh")
        _kokoro = Kokoro(str(onnx), str(voices))
    return _kokoro


# ------------------------------------------------------------------ normalização pt-BR
def normalize_ptbr(text: str) -> str:
    """Converte números/moeda/símbolos em palavras para a voz não tropeçar."""
    from num2words import num2words

    def money(m):
        n = int(m.group(1).replace(".", ""))
        cents = int((m.group(2) or "0").ljust(2, "0"))
        parts = []
        if n:
            unit = "real" if n == 1 else "reais"
            if n >= 1_000_000 and n % 1_000_000 == 0:
                unit = "de reais"
            parts.append(f"{num2words(n, lang='pt_BR')} {unit}")
        if cents:
            parts.append(f"{num2words(cents, lang='pt_BR')} {'centavo' if cents == 1 else 'centavos'}")
        return " e ".join(parts) or "zero real"

    t = re.sub(r"R\$\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?", money, text)
    t = re.sub(r"(\d+),(\d+)\s?%", lambda m: f"{num2words(int(m.group(1)), lang='pt_BR')} vírgula {num2words(int(m.group(2)), lang='pt_BR')} por cento", t)
    t = re.sub(r"(\d+)\s?%", lambda m: f"{num2words(int(m.group(1)), lang='pt_BR')} por cento", t)
    t = re.sub(r"\b(\d{1,3}(?:\.\d{3})+)\b", lambda m: num2words(int(m.group(1).replace(".", "")), lang="pt_BR"), t)
    t = re.sub(r"\b(\d+),(\d+)\b", lambda m: f"{num2words(int(m.group(1)), lang='pt_BR')} vírgula {num2words(int(m.group(2)), lang='pt_BR')}", t)
    t = re.sub(r"\b(\d+)\b", lambda m: num2words(int(m.group(1)), lang="pt_BR"), t)
    t = t.replace("&", " e ").replace("—", ", ").replace("–", ", ")
    return re.sub(r"\s+", " ", t).strip()


# ------------------------------------------------------------------ helpers de áudio
def resample(x: np.ndarray, sr_in: int, sr_out: int = SR) -> np.ndarray:
    if sr_in == sr_out:
        return x.astype(np.float32)
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(sr_in, sr_out)
    return resample_poly(x, sr_out // g, sr_in // g).astype(np.float32)


def pitch_shift(x: np.ndarray, semitones: float, sr: int = SR) -> np.ndarray:
    """Pitch shift preservando duração (ffmpeg rubberband se houver, senão asetrate+atempo)."""
    if abs(semitones) < 0.01:
        return x
    p = 2 ** (semitones / 12)
    with tempfile.TemporaryDirectory() as d:
        i, o = Path(d) / "i.wav", Path(d) / "o.wav"
        sf.write(i, x, sr)
        filt = f"asetrate={int(sr * p)},aresample={sr},atempo={1 / p:.6f}"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(i), "-af", filt, str(o)], check=True)
        y, _ = sf.read(o, dtype="float32")
    return y


def trim_silence(x: np.ndarray, thr_db: float = -45, pad: float = 0.04, sr: int = SR) -> np.ndarray:
    if len(x) == 0:
        return x
    thr = 10 ** (thr_db / 20)
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(pad * sr))
    b = min(len(x), idx[-1] + int(pad * sr * 2))
    return x[a:b]


# ------------------------------------------------------------------ engines
def _kokoro_voice(spec: str):
    k = kokoro()
    if "+" not in spec and "*" not in spec:
        return spec
    vec = None
    for part in spec.split("+"):
        name, _, w = part.partition("*")
        v = k.get_voice_style(name.strip()) * float(w or 1)
        vec = v if vec is None else vec + v
    return vec


def synth_kokoro(text: str, cfg: dict) -> np.ndarray:
    k = kokoro()
    audio, sr = k.create(text, voice=_kokoro_voice(cfg.get("voice", "pm_alex")), speed=float(cfg.get("speed", 1.0)), lang="pt-br")
    return resample(np.asarray(audio, dtype=np.float32), sr)


def _http(url, body, headers):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def _decode(blob: bytes) -> np.ndarray:
    with tempfile.TemporaryDirectory() as d:
        i, o = Path(d) / "in.bin", Path(d) / "o.wav"
        i.write_bytes(blob)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(i), "-ac", "1", "-ar", str(SR), str(o)], check=True)
        y, _ = sf.read(o, dtype="float32")
    return y


def synth_elevenlabs(text, cfg, prov):
    key = os.environ[prov["env"]]
    blob = _http(f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['voice']}", {"text": text, "model_id": prov.get("model")},
                 {"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    return _decode(blob)


def synth_openai(text, cfg, prov):
    key = os.environ[prov["env"]]
    blob = _http("https://api.openai.com/v1/audio/speech", {"model": prov.get("model"), "voice": cfg.get("voice", "alloy"), "input": text,
                 "instructions": cfg.get("instructions", "Fale em português brasileiro natural, como quem conta uma história.")},
                 {"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    return _decode(blob)


def synth_azure(text, cfg, prov):
    key, region = os.environ[prov["env"]], os.environ[prov["region_env"]]
    ssml = f"<speak version='1.0' xml:lang='pt-BR'><voice name='{cfg['voice']}'><prosody rate='{cfg.get('rate', '0%')}'>{text}</prosody></voice></speak>"
    req = urllib.request.Request(f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1", data=ssml.encode(),
                                 headers={"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "riff-48khz-16bit-mono-pcm"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return _decode(r.read())


def load_voices() -> dict:
    return json.loads((ROOT / "config" / "voices.json").read_text())


def synth(text: str, speaker: str, voices: dict | None = None, cache_dir: Path | None = None, raw_text: bool = False) -> np.ndarray:
    voices = voices or load_voices()
    cfg = voices["voices"].get(speaker) or voices["voices"][voices["default"]]
    t = text if raw_text else normalize_ptbr(text)
    key = hashlib.sha1(json.dumps([t, cfg], sort_keys=True).encode()).hexdigest()[:16]
    if cache_dir:
        cache_dir.mkdir(parents=True, exist_ok=True)
        hit = cache_dir / f"{key}.wav"
        if hit.exists():
            y, _ = sf.read(hit, dtype="float32")
            return y
    engine = cfg.get("engine", "kokoro")
    prov = voices.get("providers", {}).get(engine, {})
    if engine != "kokoro" and not os.environ.get(prov.get("env", "_none_")):
        print(f"  [tts] {engine} sem chave ({prov.get('env')}); usando Kokoro para '{speaker}'", file=sys.stderr)
        engine = "kokoro"
        cfg = {**cfg, "voice": cfg.get("fallback", "pm_alex")}
    y = {"kokoro": synth_kokoro, "elevenlabs": lambda a, b: synth_elevenlabs(a, b, prov), "openai": lambda a, b: synth_openai(a, b, prov),
         "azure": lambda a, b: synth_azure(a, b, prov)}[engine](t, cfg)
    y = pitch_shift(y, float(cfg.get("pitch", 0)))
    y = trim_silence(y)
    if cache_dir:
        sf.write(cache_dir / f"{key}.wav", y, SR)
    return y


if __name__ == "__main__":
    text, speaker, out = sys.argv[1], sys.argv[2], sys.argv[3]
    print(normalize_ptbr(text))
    sf.write(out, synth(text, speaker), SR)
