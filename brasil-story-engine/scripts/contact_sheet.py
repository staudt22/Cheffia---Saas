"""Monta a prancha de storyboard (uma linha por cena: quadros + ficha da cena)."""
import json, sys, textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

out = Path(sys.argv[1])
meta = json.loads((out / "frames.json").read_text())
per, script, tl = meta["per"], meta["script"], meta["timeline"]
shots = {s["id"]: s for s in script["shots"]}
tshots = {s["id"]: s for s in tl["shots"]}
ids = sorted({f["shot"] for f in meta["frames"]}, key=lambda x: list(tshots).index(x))
TW, TH, INFO, PAD = 480, 270, 620, 16
W = PAD + per * (TW + PAD) + INFO + PAD
H = 110 + len(ids) * (TH + PAD) + PAD
img = Image.new("RGB", (W, H), (246, 239, 227))
d = ImageDraw.Draw(img)

def font(size, bold=False):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/System/Library/Fonts/Supplemental/Arial.ttf", "C:/Windows/Fonts/arial.ttf"]:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()

d.text((PAD, 24), f"STORYBOARD · {script.get('title', '')}", fill=(43, 34, 51), font=font(40, True))
d.text((PAD, 74), f"{len(ids)} cenas · {tl['duration']:.1f}s · {tl['fps']} fps", fill=(90, 80, 100), font=font(22))
y = 110
for sid in ids:
    s, t = shots[sid], tshots[sid]
    x = PAD
    for k in range(per):
        p = out / f"{sid}_{k}.jpg"
        if p.exists():
            img.paste(Image.open(p).resize((TW, TH)), (x, y))
        d.rectangle([x, y, x + TW, y + TH], outline=(43, 34, 51), width=3)
        x += TW + PAD
    lines = " ".join(f"{('['+l.get('speaker','')+'] ') if l.get('speaker','narrador')!='narrador' else ''}{l['text']}" for l in s.get("lines", []))
    d.text((x, y), f"{sid}  ·  {s.get('beat','')}", fill=(196, 69, 47), font=font(26, True))
    d.text((x, y + 36), f"{t['start']:.1f}s → {t['end']:.1f}s  ({t['end']-t['start']:.1f}s) · {s.get('scene','')} · trans: {t.get('transition','cut')}", fill=(43, 34, 51), font=font(18))
    yy = y + 66
    for ln in textwrap.wrap(lines, 58)[:7]:
        d.text((x, yy), ln, fill=(43, 34, 51), font=font(19)); yy += 25
    fx = ", ".join(sorted({f["name"] for f in s.get("sfx", [])}))
    d.text((x, y + TH - 26), f"sfx: {fx}"[:70], fill=(90, 80, 100), font=font(16))
    y += TH + PAD
img.save(out / "storyboard.jpg", quality=88)
print(f"✔ storyboard: {out / 'storyboard.jpg'}")
