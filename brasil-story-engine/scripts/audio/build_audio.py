"""
PIPELINE DE ÁUDIO DO EPISÓDIO

  python3 scripts/audio/build_audio.py <episodio>

1. Lê episodes/<ep>/script.json
2. Para cada fala:
     a) se existir episodes/<ep>/audio_in/<idDaFala>.(wav|mp3|m4a) → usa o áudio do usuário
     b) se existir episodes/<ep>/audio_in/narration.* (um arquivo só) → corta automaticamente
        por silêncio e distribui pelas falas (ver align_user_audio.py)
     c) senão → GERA com TTS (voz do personagem em config/voices.json)
3. Monta a timeline (cenas, falas, efeitos) a partir das durações reais
4. Gera efeitos sonoros, ambientes e trilha por síntese
5. Mixa com ducking (música/ambiente abaixam quando há voz), normaliza para -14 LUFS
6. Salva:
     episodes/<ep>/generated/timeline.json   (lido pela animação)
     episodes/<ep>/generated/subtitles.srt
     episodes/<ep>/generated/stems/*.wav      (voz, sfx, música, ambiente)
     public/episodes/<ep>/mix.wav             (áudio final usado no render)
"""
from __future__ import annotations
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from tts import synth, load_voices, resample, SR  # noqa: E402
from sfx import render_sfx, AMBIENCES  # noqa: E402
from music import render_cues  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
AUDIO_EXT = (".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aac")


def db(x):
    return 10 ** (x / 20)


def load_any(p: Path) -> np.ndarray:
    if p.suffix.lower() == ".wav":
        y, sr = sf.read(p, dtype="float32", always_2d=True)
        return resample(y.mean(axis=1), sr)
    out = p.with_suffix(".decoded.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(p), "-ac", "1", "-ar", str(SR), str(out)], check=True)
    y, _ = sf.read(out, dtype="float32")
    out.unlink(missing_ok=True)
    return y


def find_user_audio(folder: Path, stem: str) -> Path | None:
    for ext in AUDIO_EXT:
        p = folder / f"{stem}{ext}"
        if p.exists():
            return p
    return None


def rms(x):
    return float(np.sqrt(np.mean(x ** 2))) if len(x) else 0.0


def resolve_at(at, shot_start, shot_end, line_times):
    """at: número (s desde o início da cena) | 'l03' | 'l03+0.4' | 'l03.end-0.2' | 'end-0.5'"""
    if isinstance(at, (int, float)):
        return shot_start + float(at)
    m = re.match(r"^(\w+?)(\.end)?([+-][\d.]+)?$", str(at).strip())
    if not m:
        raise ValueError(f"tempo inválido: {at}")
    ref, is_end, off = m.group(1), m.group(2), float(m.group(3) or 0)
    if ref == "end":
        return shot_end + off
    if ref == "start":
        return shot_start + off
    if ref not in line_times:
        raise ValueError(f"fala '{ref}' não existe")
    s, e = line_times[ref]
    return (e if is_end else s) + off


def build(ep_id: str):
    ep = ROOT / "episodes" / ep_id
    script = json.loads((ep / "script.json").read_text())
    gen = ep / "generated"
    (gen / "stems").mkdir(parents=True, exist_ok=True)
    audio_in = ep / "audio_in"
    voices = load_voices()
    D = {"pause": 0.22, "shotPadStart": 0.25, "shotPadEnd": 0.35, "minShot": 1.5, **script.get("defaults", {})}

    lines_all = [ln for s in script["shots"] for ln in s.get("lines", [])]
    # ---------------------------------------------------------------- áudio do usuário (arquivo único)
    single = find_user_audio(audio_in, "narration") if audio_in.exists() else None
    if single:
        from align_user_audio import split_to_lines
        print(f"• áudio do usuário encontrado: {single.name} → dividindo em {len(lines_all)} falas")
        split_to_lines(single, lines_all, audio_in / "lines")

    # ---------------------------------------------------------------- vozes
    clips: dict[str, np.ndarray] = {}
    for ln in lines_all:
        user = None
        if audio_in.exists():
            user = find_user_audio(audio_in, ln["id"]) or find_user_audio(audio_in / "lines", ln["id"])
        if user:
            y = load_any(user)
            src = f"usuário ({user.name})"
        else:
            y = synth(ln.get("tts", ln["text"]), ln.get("speaker", voices["default"]), voices, ROOT / ".cache" / "tts", raw_text="tts" in ln)
            src = "TTS"
        # normaliza fala para RMS alvo (voz sempre clara)
        r = rms(y[np.abs(y) > 0.01]) or 1e-3
        y = np.clip(y * (db(-18) / r), -0.98, 0.98)
        clips[ln["id"]] = y.astype(np.float32)
        print(f"  {ln['id']:>5} {len(y) / SR:5.2f}s [{src}] {ln.get('speaker', 'narrador')}: {ln['text'][:60]}")

    # ---------------------------------------------------------------- timeline
    t = 0.0
    shots_tl, lines_tl, sfx_tl = [], [], []
    line_times: dict[str, tuple[float, float]] = {}
    for s in script["shots"]:
        s0 = t
        cur = s0 + float(s.get("padStart", D["shotPadStart"]))
        for ln in s.get("lines", []):
            cur += float(ln.get("delay", 0))
            st = cur
            en = st + len(clips[ln["id"]]) / SR
            line_times[ln["id"]] = (st, en)
            lines_tl.append({"id": ln["id"], "shot": s["id"], "speaker": ln.get("speaker", voices["default"]), "text": ln["text"], "start": round(st, 3), "end": round(en, 3)})
            cur = en + float(ln.get("pauseAfter", D["pause"]))
        if s.get("lines"):
            cur -= float(s["lines"][-1].get("pauseAfter", D["pause"]))
        end = max(cur + float(s.get("padEnd", D["shotPadEnd"])), s0 + float(s.get("minDuration", D["minShot"])))
        if "duration" in s:
            end = s0 + float(s["duration"])
        end = round(end * 30) / 30  # alinha ao frame
        shots_tl.append({"id": s["id"], "start": round(s0, 4), "end": round(end, 4), "transition": s.get("transition", "cut"), "ambience": s.get("ambience"), "music": s.get("music")})
        t = end
    total = t + float(script.get("tail", 0.6))

    for s, stl in zip(script["shots"], shots_tl):
        for fx in s.get("sfx", []):
            at = resolve_at(fx["at"], stl["start"], stl["end"], line_times)
            sfx_tl.append({"name": fx["name"], "at": round(at, 3), "shot": s["id"], "gain": fx.get("gain", 0), "pan": fx.get("pan", 0), "args": fx.get("args", {})})

    # ---------------------------------------------------------------- stems
    N = int(total * SR) + SR
    voice = np.zeros(N, np.float32)
    for ln in lines_tl:
        i = int(ln["start"] * SR)
        c = clips[ln["id"]]
        voice[i:i + len(c)] += c[: N - i]

    sfx = np.zeros((N, 2), np.float32)
    for fx in sfx_tl:
        y = render_sfx(fx["name"], **fx["args"]) * db(-9 + fx["gain"])
        i = int(max(0, fx["at"]) * SR)
        pan = fx["pan"]
        seg = y[: N - i]
        sfx[i:i + len(seg), 0] += seg * (1 - max(0, pan)) ** 0.5
        sfx[i:i + len(seg), 1] += seg * (1 + min(0, pan)) ** 0.5

    amb = np.zeros((N, 2), np.float32)
    for s in shots_tl:
        if not s["ambience"]:
            continue
        d = s["end"] - s["start"] + 0.6
        y = AMBIENCES[s["ambience"]](d) * db(-24)
        fade = int(0.3 * SR)
        y[:fade] *= np.linspace(0, 1, fade)
        y[-fade:] *= np.linspace(1, 0, fade)
        i = int(max(0, s["start"] - 0.3) * SR)
        seg = y[: N - i]
        amb[i:i + len(seg)] += np.stack([seg, np.roll(seg, 480)], axis=1)

    # música: cues por cena ({"music": "curious"} inicia um clima que segue até o próximo)
    cues, cur_mood, cur_start = [], None, 0.0
    for s in shots_tl:
        if s["music"] is not None and s["music"] != cur_mood:
            if cur_mood is not None:
                cues.append((cur_start, s["start"], cur_mood))
            cur_mood, cur_start = s["music"], s["start"]
    if cur_mood is not None:
        cues.append((cur_start, total, cur_mood))
    music = render_cues(cues, N / SR) * db(-15)

    # ---------------------------------------------------------------- ducking
    win = int(0.05 * SR)
    venv = np.convolve(np.abs(voice), np.ones(win) / win, mode="same")
    talking = (venv > 0.01).astype(np.float32)
    # ataque rápido, release lento
    duck = np.zeros_like(talking)
    a, r = 1 - np.exp(-1 / (0.06 * SR)), 1 - np.exp(-1 / (0.45 * SR))
    acc = 0.0
    for i in range(0, len(talking), 64):
        target = talking[i]
        acc += (target - acc) * (a if target > acc else r) * 64
        acc = min(1.0, max(0.0, acc))
        duck[i:i + 64] = acc
    music *= (1 - duck * (1 - db(-11)))[:, None]
    amb *= (1 - duck * (1 - db(-6)))[:, None]
    sfx *= (1 - duck * (1 - db(-4)))[:, None]

    mix = np.stack([voice, voice], axis=1) + sfx + amb + music
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)  # soft clip de segurança
    mix = mix[: int(total * SR)]

    for name, arr in [("voice", voice), ("sfx", sfx), ("ambience", amb), ("music", music)]:
        sf.write(gen / "stems" / f"{name}.wav", arr[: int(total * SR)], SR)
    raw = gen / "mix_raw.wav"
    sf.write(raw, mix, SR)
    out = ROOT / "public" / "episodes" / ep_id / "mix.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "2", str(out)], check=True)
    raw.unlink()

    timeline = {"episode": ep_id, "fps": 30, "duration": round(total, 3), "shots": [{k: v for k, v in s.items() if k in ("id", "start", "end", "transition")} for s in shots_tl],
                "lines": lines_tl, "sfx": [{"name": f["name"], "at": f["at"], "shot": f["shot"]} for f in sfx_tl]}
    (gen / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1))
    write_srt(lines_tl, gen / "subtitles.srt")
    print(f"✔ áudio: {total:.1f}s · {len(lines_tl)} falas · {len(sfx_tl)} efeitos · {len(cues)} trechos de música → {out.relative_to(ROOT)}")
    return timeline


def fmt(t):
    h, m = int(t // 3600), int(t % 3600 // 60)
    s = t % 60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int((s - int(s)) * 1000):03d}"


def write_srt(lines, path: Path, maxc=42):
    out, k = [], 1
    for ln in lines:
        words = ln["text"].split()
        chunks, cur = [], ""
        for w in words:
            if len(cur) + len(w) + 1 > maxc * 2 and cur:
                chunks.append(cur)
                cur = w
            else:
                cur = f"{cur} {w}".strip()
        if cur:
            chunks.append(cur)
        dur = ln["end"] - ln["start"]
        total_c = sum(len(c) for c in chunks) or 1
        t0 = ln["start"]
        for c in chunks:
            t1 = t0 + dur * len(c) / total_c
            # quebra em 2 linhas
            if len(c) > maxc:
                ws, a = c.split(), ""
                while ws and len(a) + len(ws[0]) < len(c) / 2:
                    a = f"{a} {ws.pop(0)}".strip()
                c = a + "\n" + " ".join(ws)
            out.append(f"{k}\n{fmt(t0)} --> {fmt(t1)}\n{c}\n")
            k += 1
            t0 = t1
    path.write_text("\n".join(out), encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("uso: build_audio.py <episodio>")
    build(sys.argv[1])
