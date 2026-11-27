"""
Efeitos sonoros 100% sintetizados (numpy) — sem samples, sem direitos autorais,
determinísticos. Cada função retorna mono float32 @ 48 kHz, pico ~0.9.

Listar: python3 scripts/audio/sfx.py --list
Ouvir/exportar todos: python3 scripts/audio/sfx.py --export pasta/
"""
from __future__ import annotations
import sys
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000


def t_(d):
    return np.arange(int(d * SR)) / SR


def rng(seed):
    return np.random.default_rng(seed)


def env(n, a=0.005, r=0.2, shape=4.0):
    """envelope ataque linear + decaimento exponencial"""
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * shape / max(r, 1e-4))
    return e


def bp(x, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), min(hi / (SR / 2), 0.99)], btype="band", output="sos")
    return sosfilt(sos, x)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f / (SR / 2), 0.99), btype="low", output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), btype="high", output="sos"), x)


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return (x / m * peak).astype(np.float32)


def sweep_noise(d, f0, f1, seed=1, q=0.35):
    """ruído filtrado com centro varrendo de f0 a f1 (implementado em blocos)"""
    n = int(d * SR)
    x = rng(seed).standard_normal(n)
    out = np.zeros(n)
    blk = 1024
    for i in range(0, n, blk):
        p = i / n
        fc = f0 * (f1 / f0) ** p
        lo, hi = max(40, fc * (1 - q)), min(20000, fc * (1 + q))
        out[i:i + blk] = bp(x[max(0, i - 2048):i + blk], lo, hi)[-len(x[i:i + blk]):]
    return out


# ------------------------------------------------------------------ biblioteca
def whoosh(d=0.45, seed=1):
    x = sweep_noise(d, 300, 3500, seed)
    n = len(x)
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return norm(x * e, 0.7)


def whoosh_down(d=0.5, seed=2):
    x = sweep_noise(d, 3000, 250, seed)
    return norm(x * np.sin(np.linspace(0, np.pi, len(x))) ** 1.5, 0.7)


def swish(d=0.22, seed=3):
    x = sweep_noise(d, 1500, 6000, seed, 0.5)
    return norm(x * np.sin(np.linspace(0, np.pi, len(x))) ** 3, 0.6)


def pop(d=0.12):
    t = t_(d)
    f = 900 * np.exp(-t * 30) + 250
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.05), 0.8)


def click(d=0.03):
    t = t_(d)
    return norm(np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 300), 0.6)


def tick(d=0.05):
    t = t_(d)
    return norm((np.sin(2 * np.pi * 3200 * t) + 0.5 * np.sin(2 * np.pi * 5200 * t)) * np.exp(-t * 180), 0.5)


def bell(freq, d=1.2, partials=((1, 1), (2.76, 0.5), (5.4, 0.25), (8.9, 0.12)), decay=3.5):
    t = t_(d)
    y = sum(a * np.sin(2 * np.pi * freq * m * t) * np.exp(-t * decay * (1 + m * 0.3)) for m, a in partials)
    return y * np.minimum(1, t / 0.003)


def ding(d=1.0):
    return norm(bell(1318, d), 0.7)


def notification():
    a = bell(1175, 0.5, decay=6)
    b = bell(1568, 0.9, decay=4)
    y = np.zeros(int(1.1 * SR))
    y[: len(a)] += a
    o = int(0.13 * SR)
    y[o:o + len(b)] += b
    return norm(y, 0.7)


def phone_buzz(d=0.9):
    t = t_(d)
    motor = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.5 + np.sin(2 * np.pi * 300 * t) * 0.5
    gate = (np.sin(2 * np.pi * 2.2 * t) > -0.2).astype(float)
    gate = lp(gate, 40)
    rattle = rng(4).standard_normal(len(t)) * 0.2
    y = lp(motor + rattle, 1800) * gate
    return norm(y, 0.6)


def kaching():
    """caixa registradora: alavanca + gaveta + sino metálico + moedas"""
    y = np.zeros(int(1.4 * SR))
    lever = bp(rng(5).standard_normal(int(0.08 * SR)), 800, 4000) * env(int(0.08 * SR), 0.002, 0.04)
    y[: len(lever)] += lever * 1.2
    drawer = bp(rng(6).standard_normal(int(0.25 * SR)), 200, 1200) * env(int(0.25 * SR), 0.01, 0.12)
    o = int(0.1 * SR)
    y[o:o + len(drawer)] += drawer
    b = bell(2093, 1.1, partials=((1, 1), (2.4, 0.7), (3.9, 0.5), (6.3, 0.3)), decay=3)
    o = int(0.16 * SR)
    y[o:o + len(b)] += b * 1.3
    for i in range(6):
        c = bell(3000 + i * 377, 0.25, decay=18)
        o = int((0.2 + i * 0.05 + (i % 2) * 0.02) * SR)
        y[o:o + len(c)] += c * 0.35
    return norm(y, 0.8)


def coin():
    a = bell(1975, 0.15, decay=25)
    b = bell(2637, 0.7, decay=5)
    y = np.zeros(int(0.8 * SR))
    y[: len(a)] += a
    o = int(0.07 * SR)
    y[o:o + len(b)] += b
    return norm(y, 0.6)


def footstep(seed=0):
    n = int(0.14 * SR)
    thud = np.sin(2 * np.pi * 90 * t_(0.14)) * env(n, 0.003, 0.04)
    scuff = bp(rng(seed + 10).standard_normal(n), 600, 3500) * env(n, 0.002, 0.03) * 0.5
    return thud + scuff


def footsteps(d=2.0, rate=2.0):
    y = np.zeros(int(d * SR))
    k = 0
    tt = 0.0
    while tt < d - 0.15:
        s = footstep(k) * (0.8 + 0.2 * (k % 2))
        o = int(tt * SR)
        y[o:o + len(s)] += s
        tt += 1 / rate
        k += 1
    return norm(y, 0.55)


def gate_metal():
    """portão de ferro: rangido + batida metálica"""
    d = 1.1
    t = t_(d)
    f = 400 + 120 * np.sin(2 * np.pi * 3 * t) + 60 * rng(7).standard_normal(len(t)).cumsum() / SR
    creak = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (np.sin(2 * np.pi * 37 * t) > 0.3)
    creak = bp(creak, 500, 3000) * np.sin(np.linspace(0, np.pi, len(t))) * 0.35
    clang = bell(520, 0.8, partials=((1, 1), (2.3, 0.8), (4.1, 0.6), (6.7, 0.4)), decay=5)
    y = np.zeros(int(1.6 * SR))
    y[: len(creak)] += creak
    o = int(0.95 * SR)
    y[o:o + len(clang)] += clang[: len(y) - o]
    return norm(y, 0.7)


def door():
    y = np.zeros(int(0.9 * SR))
    knob = bp(rng(8).standard_normal(int(0.06 * SR)), 1000, 5000) * env(int(0.06 * SR), 0.001, 0.02)
    y[: len(knob)] += knob
    t = t_(0.5)
    creak = bp(np.sign(np.sin(2 * np.pi * np.cumsum(300 + 200 * t) / SR)), 400, 2500) * np.sin(np.linspace(0, np.pi, len(t))) * 0.3
    o = int(0.1 * SR)
    y[o:o + len(creak)] += creak
    return norm(y, 0.6)


def boing(d=0.6):
    t = t_(d)
    f = 180 + 260 * np.exp(-t * 6) + 40 * np.sin(2 * np.pi * 14 * t) * np.exp(-t * 4)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.003, 0.25), 0.7)


def impact(d=1.2):
    t = t_(d)
    sub = np.sin(2 * np.pi * np.cumsum(30 + 90 * np.exp(-t * 12)) / SR) * np.exp(-t * 3)
    crack = lp(rng(9).standard_normal(len(t)), 3000) * np.exp(-t * 18)
    return norm(sub + crack * 0.6, 0.9)


def boom(d=2.0):
    t = t_(d)
    sub = np.sin(2 * np.pi * np.cumsum(25 + 60 * np.exp(-t * 6)) / SR) * np.exp(-t * 1.6)
    rumble = lp(rng(10).standard_normal(len(t)), 400) * np.exp(-t * 1.2)
    return norm(sub + rumble * 0.8, 0.9)


def riser(d=2.0):
    t = t_(d)
    n = sweep_noise(d, 200, 8000, 11, 0.4) * (t / d) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(200 * 2 ** (3 * t / d)) / SR) * (t / d) ** 2 * 0.4
    return norm(n + tone, 0.6)


def slide_up(d=0.5):
    t = t_(d)
    f = 400 * 2 ** (2 * t / d)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, len(t))) ** 0.5, 0.5)


def slide_down(d=0.6):
    t = t_(d)
    f = 1600 * 2 ** (-2 * t / d)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, len(t))) ** 0.5, 0.5)


def sparkle(d=1.0):
    y = np.zeros(int(d * SR))
    r = rng(12)
    for i in range(14):
        b = bell(2000 + r.random() * 4000, 0.3, partials=((1, 1), (2, 0.3)), decay=14)
        o = int(r.random() * (d - 0.3) * SR)
        y[o:o + len(b)] += b * (0.4 + r.random() * 0.4)
    return norm(y, 0.45)


def record_scratch(d=0.5):
    t = t_(d)
    f = 800 * (1 + np.sin(2 * np.pi * 6 * t))
    y = bp(rng(13).standard_normal(len(t)), 300, 4000) * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR / 20))
    return norm(y * np.exp(-t * 2), 0.6)


def car_pass(d=2.5):
    t = t_(d)
    p = np.exp(-((t - d / 2) ** 2) / 0.25)
    f = 90 * (1.15 - 0.3 / (1 + np.exp(-(t - d / 2) * 6)))
    engine = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.4
    road = lp(rng(14).standard_normal(len(t)), 1200)
    return norm(lp(engine + road, 2500) * p, 0.6)


def car_horn(d=0.5):
    t = t_(d)
    y = np.sign(np.sin(2 * np.pi * 410 * t)) + np.sign(np.sin(2 * np.pi * 520 * t))
    return norm(lp(y, 2500) * env(len(t), 0.01, 0.5, 1.2), 0.5)


def bus_brake(d=1.4):
    t = t_(d)
    hiss = hp(rng(15).standard_normal(len(t)), 3000) * np.exp(-t * 1.5) * 0.5
    squeal = np.sin(2 * np.pi * 1800 * t + 3 * np.sin(2 * np.pi * 6 * t)) * np.exp(-((t - 0.3) ** 2) / 0.05) * 0.4
    return norm(hiss + squeal, 0.5)


def crowd(d=4.0, intensity=0.5, seed=16):
    """burburinho de multidão (ruído com formantes de voz)"""
    t = t_(d)
    r = rng(seed)
    y = np.zeros(len(t))
    for f in (500, 900, 1500, 2500):
        mod = lp(r.standard_normal(len(t)), 6)
        mod = mod / (np.max(np.abs(mod)) or 1)
        y += bp(r.standard_normal(len(t)), f * 0.8, f * 1.2) * (0.6 + 0.4 * mod)
    return norm(y * (0.6 + intensity * 0.4), 0.4 + intensity * 0.3)


def cheer(d=2.5):
    t = t_(d)
    return norm(crowd(d, 1.0, 17) * np.minimum(1, t / 0.15) * np.exp(-np.maximum(0, t - 0.8) * 1.2), 0.7)


def gasp_crowd(d=1.2):
    t = t_(d)
    x = bp(rng(18).standard_normal(len(t)), 700, 3000) * np.sin(np.linspace(0, np.pi, len(t))) ** 2
    return norm(x, 0.5)


# ------------------------------------------------------------------ ambientes (loops)
def amb_room(d=10.0):
    return norm(lp(rng(20).standard_normal(int(d * SR)), 300), 0.15)


def amb_birds(d=10.0):
    y = amb_room(d) * 0.5
    r = rng(21)
    for _ in range(int(d * 1.5)):
        n = int(0.12 * SR)
        tt = np.arange(n) / SR
        f = 3000 + r.random() * 2000 + 1500 * np.sin(2 * np.pi * (8 + r.random() * 10) * tt)
        c = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, n)) ** 2
        o = int(r.random() * (d - 0.2) * SR)
        y[o:o + n] += c * 0.25
    return norm(y, 0.3)


def amb_street(d=10.0):
    r = rng(22)
    y = lp(r.standard_normal(int(d * SR)), 500) * 0.6 + amb_birds(d) * 0.5
    return norm(y, 0.3)


def amb_city(d=10.0):
    r = rng(23)
    y = lp(r.standard_normal(int(d * SR)), 250) * 1.0
    for k in range(3):
        c = car_pass(2.5)
        o = int((1 + k * 3.1) * SR)
        if o + len(c) < len(y):
            y[o:o + len(c)] += c * 0.25
    return norm(y, 0.35)


def amb_bakery(d=10.0):
    y = amb_room(d) + crowd(d, 0.2, 24) * 0.5
    t = t_(d)
    y += np.sin(2 * np.pi * 60 * t) * 0.02  # geladeira
    return norm(y, 0.3)


def amb_beach(d=10.0):
    t = t_(d)
    waves = lp(rng(25).standard_normal(len(t)), 900) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 5) ** 2)
    return norm(waves + amb_birds(d) * 0.2, 0.35)


SFX = {
    "whoosh": whoosh, "whoosh_down": whoosh_down, "swish": swish, "pop": pop, "click": click, "tick": tick,
    "ding": ding, "notification": notification, "phone_buzz": phone_buzz, "kaching": kaching, "coin": coin,
    "footsteps": footsteps, "gate": gate_metal, "door": door, "boing": boing, "impact": impact, "boom": boom,
    "riser": riser, "slide_up": slide_up, "slide_down": slide_down, "sparkle": sparkle, "record_scratch": record_scratch,
    "car_pass": car_pass, "car_horn": car_horn, "bus_brake": bus_brake, "crowd": crowd, "cheer": cheer, "gasp_crowd": gasp_crowd,
}
AMBIENCES = {"room": amb_room, "birds": amb_birds, "street": amb_street, "city": amb_city, "bakery": amb_bakery, "beach": amb_beach}


def render_sfx(name: str, **kw) -> np.ndarray:
    if name not in SFX:
        raise KeyError(f"SFX desconhecido: {name}. Disponíveis: {', '.join(SFX)}")
    return np.asarray(SFX[name](**kw), dtype=np.float32)


if __name__ == "__main__":
    if "--list" in sys.argv:
        print("SFX:", ", ".join(SFX))
        print("Ambientes:", ", ".join(AMBIENCES))
    elif "--export" in sys.argv:
        import soundfile as sf
        out = Path(sys.argv[sys.argv.index("--export") + 1])
        out.mkdir(parents=True, exist_ok=True)
        for k in SFX:
            sf.write(out / f"{k}.wav", render_sfx(k), SR)
        for k, f in AMBIENCES.items():
            sf.write(out / f"amb_{k}.wav", f(6.0), SR)
        print("exportado em", out)
