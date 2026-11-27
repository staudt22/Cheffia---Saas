"""
Quando o usuário envia UM arquivo de narração (audio_in/narration.wav|mp3),
divide automaticamente em falas por detecção de silêncio e associa às falas do roteiro
em ordem. Se o número de trechos não bater, une/divide trechos usando o tamanho do
texto de cada fala como guia. Resultado: audio_in/lines/<idDaFala>.wav

Dica: gravar com ~0,5 s de pausa entre as falas deixa o corte perfeito.
Se o corte errar, renomeie/ajuste os arquivos em audio_in/lines/ manualmente e rode
`npm run audio` de novo — arquivos por fala têm prioridade.
"""
from __future__ import annotations
from pathlib import Path
import numpy as np
import soundfile as sf

SR = 48000


def _segments(y: np.ndarray, min_sil=0.28, thr_db=-38):
    win = int(0.02 * SR)
    e = np.sqrt(np.convolve(y ** 2, np.ones(win) / win, mode="same"))
    thr = np.max(e) * 10 ** (thr_db / 20)
    voiced = e > thr
    segs, start, sil = [], None, 0
    for i in range(0, len(y), win):
        v = voiced[i]
        if v:
            if start is None:
                start = i
            sil = 0
        elif start is not None:
            sil += win
            if sil >= min_sil * SR:
                segs.append([start, i - sil + win])
                start, sil = None, 0
    if start is not None:
        segs.append([start, len(y)])
    return [s for s in segs if s[1] - s[0] > 0.12 * SR]


def split_to_lines(src: Path, lines: list[dict], out_dir: Path):
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from build_audio import load_any
    y = load_any(src)
    segs = _segments(y)
    n = len(lines)
    weights = np.array([max(4, len(l["text"])) for l in lines], float)
    # une segmentos excedentes (menor pausa primeiro)
    while len(segs) > n:
        gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
        k = int(np.argmin(gaps))
        segs[k] = [segs[k][0], segs[k + 1][1]]
        segs.pop(k + 1)
    # divide segmentos faltantes (maior segmento, no ponto de menor energia)
    while len(segs) < n and segs:
        k = int(np.argmax([b - a for a, b in segs]))
        a, b = segs[k]
        mid = a + (b - a) // 2
        lo, hi = a + (b - a) // 4, b - (b - a) // 4
        seg = y[lo:hi] ** 2
        win = int(0.05 * SR)
        en = np.convolve(seg, np.ones(win), mode="same")
        mid = lo + int(np.argmin(en))
        segs[k] = [a, mid]
        segs.insert(k + 1, [mid, b])
    out_dir.mkdir(parents=True, exist_ok=True)
    for ln, (a, b) in zip(lines, segs):
        pad = int(0.03 * SR)
        sf.write(out_dir / f"{ln['id']}.wav", y[max(0, a - pad):b + pad], SR)
    print(f"  {len(segs)} trechos → {out_dir}")
    _ = weights
