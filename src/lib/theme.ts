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
const INK: RGB = [31, 29, 26];

/** Darkens a colour until it reaches the target contrast against white. */
function ensureContrastOnWhite(rgb: RGB, target = 4.5): RGB {
  let c = rgb;
  for (let i = 0; i < 20 && contrastRatio(rgbToHex(c), "#ffffff") < target; i++) c = mix(c, INK, 0.12);
  return c;
}

export function isValidHex(v: string | null | undefined): v is string {
  return Boolean(v && /^#[0-9a-f]{6}$/i.test(v));
}

export function brandVars(brand: string, accent: string): Record<string, string> {
  const b = hexToRgb(isValidHex(brand) ? brand : "#3F6B4E");
  const a = hexToRgb(isValidHex(accent) ? accent : "#C8743A");
  const strong = ensureContrastOnWhite(b, 4.5);
  const fg = contrastRatio(rgbToHex(strong), "#ffffff") >= 4.5 ? "#ffffff" : "#1f1d1a";
  return {
    "--brand": rgbToHex(strong),
    "--brand-raw": rgbToHex(b),
    "--brand-foreground": fg,
    "--brand-soft": rgbToHex(mix(b, WHITE, 0.9)),
    "--brand-muted": rgbToHex(mix(b, WHITE, 0.75)),
    "--accent": rgbToHex(ensureContrastOnWhite(a, 3)),
    "--accent-soft": rgbToHex(mix(a, WHITE, 0.88)),
  };
}

export const BRAND_PRESETS = [
  { name: "Olive", brand: "#3F6B4E", accent: "#C8743A" },
  { name: "Charcoal", brand: "#2B2A28", accent: "#B8893B" },
  { name: "Bordeaux", brand: "#7A2E3A", accent: "#D4A15A" },
  { name: "Ocean", brand: "#1F5F7A", accent: "#E07A4F" },
  { name: "Terracotta", brand: "#B5532F", accent: "#3F6B4E" },
  { name: "Plum", brand: "#5B3A6B", accent: "#E0A458" },
];
