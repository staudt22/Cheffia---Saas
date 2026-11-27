"""
REVISÃO AUTOMÁTICA (Fase 9). Uso: python3 scripts/review.py <episodio>
Verifica: cenas sem fala longas (estáticas), falas cortadas por fim de cena, sincronia
duração vídeo × áudio, telas pretas, trechos de imagem congelada, clipping no áudio,
volume da voz vs. música/efeitos, cenas sem componente.
Saída: out/<ep>/review.md  (lista de problemas; vazio = aprovado)
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf

ep = sys.argv[1]
root = Path(__file__).resolve().parents[1]
E = root / "episodes" / ep
tl = json.loads((E / "generated/timeline.json").read_text())
issues, notes = [], []

shots_src = (E / "shots.tsx").read_text()
for s in tl["shots"]:
    d = s["end"] - s["start"]
    lines = [l for l in tl["lines"] if l["shot"] == s["id"]]
    if not re.search(rf"\b{s['id']}\s*:", shots_src):
        issues.append(f"cena {s['id']} não tem componente em shots.tsx")
    if not lines and d > 4:
        issues.append(f"cena {s['id']} tem {d:.1f}s sem narração — garanta movimento contínuo")
    for l in lines:
        if l["end"] > s["end"] + 0.01:
            issues.append(f"fala {l['id']} termina depois do fim da cena {s['id']}")
    if d > 12:
        notes.append(f"cena {s['id']} longa ({d:.1f}s): confira se há pelo menos 2 mudanças de câmera/ação")

mix = root / "public/episodes" / ep / "mix.wav"
y, sr = sf.read(mix)
peak = float(np.max(np.abs(y)))
if peak > 0.99:
    issues.append(f"clipping no mix (pico {peak:.3f})")
stems = E / "generated/stems"
if stems.exists():
    v, _ = sf.read(stems / "voice.wav")
    m, _ = sf.read(stems / "music.wav")
    fx, _ = sf.read(stems / "sfx.wav")
    vm = np.abs(v) > 0.02
    def r(x):
        x = x.mean(axis=1) if x.ndim > 1 else x
        return 20 * np.log10(np.sqrt(np.mean(x[vm[: len(x)]] ** 2)) + 1e-9)
    gap = r(v) - max(r(m), r(fx))
    notes.append(f"voz {gap:.1f} dB acima de música/efeitos durante a fala")
    if gap < 8:
        issues.append(f"voz só {gap:.1f} dB acima do fundo (mínimo recomendado: 8 dB)")

video = root / "out" / ep / f"{ep}.mp4"
if video.exists():
    probe = lambda stream: float(subprocess.run(["ffprobe", "-v", "error", "-select_streams", stream, "-show_entries", "stream=duration", "-of", "csv=p=0", str(video)], capture_output=True, text=True).stdout.strip().strip(",").split(",")[0] or 0)
    dv, da = probe("v:0"), probe("a:0")
    if abs(dv - da) > 0.15:
        issues.append(f"vídeo ({dv:.2f}s) e áudio ({da:.2f}s) com durações diferentes")
    notes.append(f"duração final {dv:.2f}s")
    log = subprocess.run(["ffmpeg", "-i", str(video), "-vf", "blackdetect=d=0.4:pix_th=0.08,freezedetect=n=0.002:d=2.5", "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
    for m_ in re.finditer(r"black_start:([\d.]+) black_end:([\d.]+)", log):
        a, b = float(m_.group(1)), float(m_.group(2))
        if b < dv - 1.5:
            issues.append(f"tela preta {a:.1f}s–{b:.1f}s")
    for m_ in re.finditer(r"freeze_start: ([\d.]+)", log):
        issues.append(f"imagem congelada a partir de {float(m_.group(1)):.1f}s (cena estática?)")
else:
    notes.append("vídeo final ainda não renderizado — rode npm run render")

out = root / "out" / ep
out.mkdir(parents=True, exist_ok=True)
txt = f"# Revisão automática — {ep}\n\n## Problemas ({len(issues)})\n" + ("\n".join(f"- [ ] {i}" for i in issues) or "- nenhum ✅") + "\n\n## Observações\n" + "\n".join(f"- {n}" for n in notes) + "\n\n## Checklist visual (manual, olhando o storyboard e o vídeo)\n- [ ] personagens idênticos à ficha (cores/cabelo/roupa)\n- [ ] nenhum objeto atravessando personagem\n- [ ] pés no chão (sem flutuar/afundar)\n- [ ] cortes motivados pela narrativa\n- [ ] transições limpas\n"
(out / "review.md").write_text(txt)
print(txt)
sys.exit(1 if issues else 0)
