/**
 * Derives a readable theme from a restaurant's brand colours.
 * Brand colours tint accents (active nav, primary buttons, single-series
 * charts) but text stays in neutral ink so readability never depends on them.
 */
type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

function rgbToHex([r, g, b]: RGB) {
  return "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

function luminance([r, g, b]: RGB) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

export function contrastRatio(a: string, b: string) {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const WHITE: RGB = [255, 255, 255];
const SURFACE: RGB = [16, 26, 46]; // --surface (#101a2e)
const DARK_INK = "#06101f";

/** Lightens a colour until it stands out against the navy surface. */
function ensureContrastOnDark(rgb: RGB, target = 3.2): RGB {
  let c = rgb;
  for (let i = 0; i < 20 && contrastRatio(rgbToHex(c), "#101a2e") < target; i++) c = mix(c, WHITE, 0.12);
  return c;
}

/** Best text colour for a fill: dark ink or white, whichever reads better. */
function foregroundFor(...fills: string[]) {
  const dark = Math.min(...fills.map((f) => contrastRatio(f, DARK_INK)));
  const light = Math.min(...fills.map((f) => contrastRatio(f, "#ffffff")));
  return dark >= light ? DARK_INK : "#ffffff";
}

export function isValidHex(v: string | null | undefined): v is string {
  return Boolean(v && /^#[0-9a-f]{6}$/i.test(v));
}

/**
 * Derives the workspace theme from the restaurant's colours. Brand colours
 * light up accents (active navigation, primary buttons, charts, highlight
 * cards) while body text stays in neutral ink, so readability never depends
 * on the colours a restaurant picks.
 */
export function brandVars(brand: string, accent: string): Record<string, string> {
  const raw = hexToRgb(isValidHex(brand) ? brand : "#38BDF8");
  const rawAccent = hexToRgb(isValidHex(accent) ? accent : "#A78BFA");
  const b = rgbToHex(ensureContrastOnDark(raw));
  const a = rgbToHex(ensureContrastOnDark(rawAccent));
  const [r, g, bl] = hexToRgb(b);
  return {
    "--brand": b,
    "--brand-raw": rgbToHex(raw),
    "--brand-foreground": foregroundFor(b),
    "--brand-soft": rgbToHex(mix(hexToRgb(b), SURFACE, 0.82)),
    "--brand-muted": rgbToHex(mix(hexToRgb(b), SURFACE, 0.55)),
    "--brand-glow": `rgb(${r} ${g} ${bl} / 0.35)`,
    "--accent": a,
    "--accent-soft": rgbToHex(mix(hexToRgb(a), SURFACE, 0.82)),
    "--grad-from": b,
    "--grad-to": a,
    "--grad-foreground": foregroundFor(b, a),
  };
}

export const BRAND_PRESETS = [
  { name: "Ocean", brand: "#38BDF8", accent: "#A78BFA" },
  { name: "Aurora", brand: "#2DD4BF", accent: "#818CF8" },
  { name: "Neon", brand: "#A78BFA", accent: "#F472B6" },
  { name: "Sunset", brand: "#FB923C", accent: "#F472B6" },
  { name: "Emerald", brand: "#34D399", accent: "#38BDF8" },
  { name: "Gold", brand: "#FBBF24", accent: "#FB7185" },
];
