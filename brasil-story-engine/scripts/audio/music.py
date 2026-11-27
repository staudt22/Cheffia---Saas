"""
Trilha procedural original (sem samples, sem direitos de terceiros).
Instrumentos sintetizados: violão de nylon (Karplus-Strong), baixo, piano elétrico (FM),
pad, shaker, kick e aro. Climas ("moods") com sabor brasileiro (bossa / baião / samba leve).

Uso: python3 scripts/audio/music.py curious 30 saida.wav
"""
from __future__ import annotations
import sys
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
A4 = 440.0
NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
QUAL = {"maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10], "7": [0, 4, 7, 10], "m7b5": [0, 3, 6, 10], "6": [0, 4, 7, 9], "m6": [0, 3, 7, 9],
        "maj": [0, 4, 7], "m": [0, 3, 7], "dim7": [0, 3, 6, 9], "sus4": [0, 5, 7, 10], "9": [0, 4, 7, 10, 14], "m9": [0, 3, 7, 10, 14]}


def chord(sym: str, octave=3):
    root = sym[:2] if len(sym) > 1 and sym[1] in "#b" else sym[:1]
    q = sym[len(root):] or "maj"
    midi = 12 * (octave + 1) + NOTE[root]
    return midi, [midi + i for i in QUAL[q]]


def mtof(m):
    return A4 * 2 ** ((m - 69) / 12)


def lp(x, f):
    return sosfilt(butter(2, min(f / (SR / 2), 0.99), "low", output="sos"), x)


def hp(x, f):
    return sosfilt(butter(2, f / (SR / 2), "high", output="sos"), x)


# ------------------------------------------------------------------ instrumentos
def ks_pluck(freq, dur, rng, bright=0.5, decay=0.996):
    """Karplus-Strong: corda dedilhada (violão de nylon)."""
    n = int(dur * SR)
    p = max(2, int(SR / freq))
    buf = lp(rng.uniform(-1, 1, p * 4), 1500 + 5000 * bright)[-p:]
    out = np.zeros(n)
    b = buf.copy()
    idx = 0
    for i in range(n):
        v = b[idx]
        nxt = b[(idx + 1) % p]
        b[idx] = decay * 0.5 * (v + nxt)
        out[i] = v
        idx = (idx + 1) % p
    return out * np.minimum(1, np.arange(n) / (0.002 * SR))


_pluck_cache: dict = {}


def pluck(freq, dur, seed, bright=0.5):
    key = (round(freq, 2), round(dur, 2), seed % 8, round(bright, 2))
    if key not in _pluck_cache:
        _pluck_cache[key] = ks_pluck(freq, dur, np.random.default_rng(seed % 8 + int(freq)), bright)
    return _pluck_cache[key]


def epiano(freq, dur, vel=0.6):
    t = np.arange(int(dur * SR)) / SR
    mod = np.sin(2 * np.pi * freq * 14 * t) * np.exp(-t * 8) * 1.2
    car = np.sin(2 * np.pi * freq * t + mod)
    e = np.exp(-t * 2.2) * np.minimum(1, t / 0.004)
    tail = np.minimum(1, np.maximum(0, (dur - t) / 0.05))
    return car * e * tail * vel


def bass(freq, dur, vel=0.8):
    t = np.arange(int(dur * SR)) / SR
    y = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * freq * 2 * t) + 0.1 * np.sin(2 * np.pi * freq * 3 * t)
    e = np.minimum(1, t / 0.008) * np.exp(-t * 1.8) * np.minimum(1, np.maximum(0, (dur - t) / 0.04))
    return y * e * vel


def pad(freqs, dur, vel=0.3):
    t = np.arange(int(dur * SR)) / SR
    y = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 1.003 * t) for f in freqs)
    e = np.minimum(1, t / 0.4) * np.minimum(1, np.maximum(0, (dur - t) / 0.4))
    return lp(y, 1800) * e * vel / len(freqs)


def kick(vel=0.9):
    t = np.arange(int(0.35 * SR)) / SR
    return np.sin(2 * np.pi * np.cumsum(50 + 120 * np.exp(-t * 35)) / SR) * np.exp(-t * 9) * vel


def shaker(vel=0.3, seed=0):
    n = int(0.07 * SR)
    t = np.arange(n) / SR
    return hp(np.random.default_rng(seed).standard_normal(n), 5000) * np.exp(-t * 60) * vel


def rim(vel=0.4):
    t = np.arange(int(0.08 * SR)) / SR
    return (np.sin(2 * np.pi * 1700 * t) * 0.6 + hp(np.random.default_rng(3).standard_normal(len(t)), 2000) * 0.4) * np.exp(-t * 70) * vel


def triangle(vel=0.25):
    t = np.arange(int(0.4 * SR)) / SR
    return (np.sin(2 * np.pi * 4200 * t) + 0.5 * np.sin(2 * np.pi * 6100 * t)) * np.exp(-t * 9) * vel


# ------------------------------------------------------------------ climas
MOODS = {
    # bossa suave e curiosa (padrão para premissa/explicação)
    "curious": dict(bpm=96, prog=["Cmaj7", "A7", "Dm7", "G7"], style="bossa", key=0, bright=0.45, drums=0.6, ep=0.5),
    # alegre, saltitante (descobertas boas)
    "happy": dict(bpm=112, prog=["F6", "D7", "Gm7", "C7"], style="samba", key=0, bright=0.65, drums=0.9, ep=0.4),
    # tensão crescente (problema central)
    "tense": dict(bpm=100, prog=["Am", "Am", "F", "E7"], style="pulse", key=0, bright=0.3, drums=0.7, ep=0.6),
    # mistério / suspense leve
    "mystery": dict(bpm=84, prog=["Dm9", "Bbmaj7", "Gm7", "A7"], style="sparse", key=0, bright=0.3, drums=0.3, ep=0.7),
    # caos / clímax
    "chaos": dict(bpm=128, prog=["Dm", "Bb", "Gm", "A7"], style="baiao", key=0, bright=0.7, drums=1.0, ep=0.3),
    # melancólico / reflexão
    "sad": dict(bpm=76, prog=["Am7", "Dm7", "G7", "Cmaj7"], style="arpeggio", key=0, bright=0.35, drums=0.0, ep=0.6),
    # final / ironia leve
    "outro": dict(bpm=92, prog=["Ebmaj7", "Cm7", "Fm7", "Bb7"], style="bossa", key=0, bright=0.5, drums=0.5, ep=0.5),
}


def render_mood(mood: str, dur: float, seed: int = 7) -> np.ndarray:
    m = MOODS[mood]
    bpm = m["bpm"]
    beat = 60 / bpm
    bar = beat * 4
    n = int(dur * SR) + SR
    L = np.zeros(n)
    R = np.zeros(n)

    def add(sig, at, pan=0.0, gain=1.0):
        i = int(at * SR)
        if i >= n:
            return
        s = sig[: n - i] * gain
        L[i:i + len(s)] += s * (1 - max(0, pan)) ** 0.5
        R[i:i + len(s)] += s * (1 + min(0, pan)) ** 0.5

    rng = np.random.default_rng(seed)
    nbars = int(dur / bar) + 2
    for b in range(nbars):
        sym = m["prog"][b % len(m["prog"])]
        root, notes = chord(sym, 3)
        t0 = b * bar
        style = m["style"]
        # ----- violão
        if style in ("bossa", "samba", "baiao"):
            # polegar no baixo (tempos 1 e 3 / alternado), acordes sincopados em semicolcheias
            sixteenth = beat / 4
            hits = {"bossa": [0, 3, 6, 10, 12], "samba": [0, 2, 3, 6, 8, 10, 11, 14], "baiao": [0, 3, 6, 8, 11, 14]}[style]
            for k, h in enumerate(hits):
                for j, nn in enumerate(notes[1:] if len(notes) > 3 else notes):
                    f = mtof(nn + 12)
                    add(pluck(f, 0.6, seed + j + h, m["bright"]), t0 + h * sixteenth + j * 0.008, pan=0.25, gain=0.13)
            for k in range(2):
                bn = root - 12 + (7 if (k == 1 and style != "baiao") else 0)
                add(pluck(mtof(bn + 12), 0.9, seed + 50 + k, 0.3), t0 + k * 2 * beat, pan=-0.1, gain=0.3)
        elif style == "arpeggio":
            for k in range(8):
                nn = notes[[0, 1, 2, 3, 2, 1, 2, 3][k] % len(notes)] + 12
                add(pluck(mtof(nn), 1.2, seed + k, m["bright"]), t0 + k * beat / 2, pan=0.2 * ((k % 2) * 2 - 1), gain=0.2)
        elif style == "pulse":
            for k in range(8):
                add(bass(mtof(root - 12), beat / 2 * 0.9, 0.25), t0 + k * beat / 2, gain=1)
        elif style == "sparse":
            for k, h in enumerate([0, 1.5, 2.5]):
                nn = notes[(k * 2) % len(notes)] + 12
                add(pluck(mtof(nn), 1.6, seed + k, m["bright"]), t0 + h * beat, pan=0.3, gain=0.22)
        # ----- baixo
        if style != "pulse":
            add(lp(bass(mtof(root - 12), beat * 1.6, 0.3), 900), t0)
            add(lp(bass(mtof(root - 12 + 7), beat * 1.6, 0.25), 900), t0 + 2 * beat)
        # ----- piano elétrico (comping) e pad
        if m["ep"] > 0:
            for h in ([1.5, 3.0] if style != "sparse" else [0]):
                for j, nn in enumerate(notes):
                    add(epiano(mtof(nn + 12), beat * 1.2, 0.08 * m["ep"]), t0 + h * beat + j * 0.005, pan=-0.3)
        add(pad([mtof(x + 12) for x in notes], bar + 0.4, 0.07), t0, gain=1)
        # ----- percussão
        d = m["drums"]
        if d > 0:
            for k in range(16):
                add(shaker(0.12 * d * (1.3 if k % 4 == 2 else 0.8), seed + k), t0 + k * beat / 4, pan=0.4)
            add(kick(0.55 * d), t0)
            add(kick(0.45 * d), t0 + 2 * beat + (beat / 2 if style in ("samba", "baiao") else 0))
            if style in ("bossa", "samba"):
                for h in [3, 6, 10, 13]:  # aro (clave de bossa)
                    add(rim(0.22 * d), t0 + h * beat / 4, pan=-0.3)
            if style == "baiao":
                for k in range(8):
                    add(triangle(0.12 * d * (1.4 if k % 2 else 0.7)), t0 + k * beat / 2, pan=0.5)
        # ----- melodia leve ocasional (motivo gerado, determinístico)
        if b % 4 in (1, 3) and style in ("bossa", "samba", "sparse", "arpeggio"):
            scale = [notes[0], notes[1], notes[2], notes[-1], notes[0] + 12]
            for k in range(4):
                nn = scale[int(rng.integers(0, len(scale)))] + 24
                add(epiano(mtof(nn), beat * 0.8, 0.09), t0 + (k * 0.75 + 0.5) * beat, pan=0.1)

    y = np.stack([L, R], axis=1)[: int(dur * SR)]
    # fade in/out curtos
    f = int(0.5 * SR)
    y[:f] *= np.linspace(0, 1, f)[:, None]
    y[-f:] *= np.linspace(1, 0, f)[:, None]
    peak = np.max(np.abs(y)) or 1
    return (y / peak * 0.8).astype(np.float32)


def render_cues(cues: list[tuple[float, float, str]], total: float, xfade: float = 1.2) -> np.ndarray:
    """cues: [(início_s, fim_s, mood)] → faixa estéreo contínua com crossfades."""
    out = np.zeros((int(total * SR) + SR, 2), dtype=np.float32)
    for i, (a, b, mood) in enumerate(cues):
        if mood in (None, "", "none", "silence"):
            continue
        seg = render_mood(mood, (b - a) + xfade, seed=7 + i)
        s = int(a * SR)
        e = min(len(out), s + len(seg))
        out[s:e] += seg[: e - s]
    return out[: int(total * SR)]


if __name__ == "__main__":
    import soundfile as sf
    mood, d, o = sys.argv[1], float(sys.argv[2]), sys.argv[3]
    sf.write(o, render_mood(mood, d), SR)
    print("ok", o)
