/** Utilidades de cor para sombras/iluminação simulada. */
const toRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/** f < 1 escurece, f > 1 clareia */
export const shade = (hex: string, f: number) => {
  const [r, g, b] = toRgb(hex);
  if (f <= 1) return toHex(r * f, g * f, b * f);
  const t = f - 1;
  return toHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
};

/** mistura duas cores (t=0 → a, t=1 → b) */
export const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};

/** Paleta base do estilo "Bairro" — cores quentes, levemente dessaturadas, contorno ameixa. */
export const PAL = {
  ink: "#2b2233", // contorno de tudo (nunca preto puro)
  inkSoft: "#4a3f55",
  white: "#fffaf2",
  sky: "#8fd3f4",
  skyTop: "#5fb4e8",
  sunset1: "#ff9e6b",
  sunset2: "#ffcf8a",
  night: "#1d2347",
  grass: "#7cc26b",
  grassDark: "#5aa24f",
  asphalt: "#5c5a66",
  sidewalk: "#d9cfc1",
  wallWarm: "#f3e2c7",
  wallBlue: "#b9d7e6",
  wallGreen: "#cfe3b4",
  wallPink: "#f2c6c0",
  wood: "#b9784a",
  woodDark: "#8a5434",
  tileA: "#e9e3d6",
  tileB: "#d8d0c0",
  money: "#76c08a",
  moneyDark: "#3f8f5a",
  gold: "#ffc83d",
  red: "#e5574d",
  accent: "#ff7a3d",
  teal: "#2aa79b",
};
