/**
 * Núcleo de animação determinística.
 * Tudo aqui é função pura de (frame, parâmetros) → valor. Nada de Math.random().
 */
import { Easing, interpolate } from "remotion";

export const FPS = 30;
export const W = 1920;
export const H = 1080;

export const sec = (s: number) => Math.round(s * FPS);

export type EaseName =
  | "linear" | "in" | "out" | "inOut" | "back" | "backOut" | "elastic" | "bounce" | "snap";

export const EASE: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  in: Easing.in(Easing.cubic),
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  back: Easing.inOut(Easing.back(1.6)),
  backOut: Easing.out(Easing.back(1.8)),
  elastic: Easing.out(Easing.elastic(1.2)),
  bounce: Easing.out(Easing.bounce),
  snap: Easing.out(Easing.exp),
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Progresso 0..1 entre f0 e f1 com easing. */
export const prog = (frame: number, f0: number, f1: number, ease: EaseName = "inOut") =>
  f1 <= f0 ? (frame >= f1 ? 1 : 0) : EASE[ease](clamp((frame - f0) / (f1 - f0)));

/**
 * Trilha de keyframes numéricos: [[frame, valor, ease?], ...]
 * O ease de cada keyframe controla a chegada NAQUELE keyframe.
 */
export type Key = [number, number, EaseName?];
export const track = (frame: number, keys: Key[]): number => {
  if (keys.length === 0) return 0;
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1, e] = keys[i];
    const [f0, v0] = keys[i - 1];
    if (frame <= f1) return lerp(v0, v1, prog(frame, f0, f1, e ?? "inOut"));
  }
  return keys[keys.length - 1][1];
};

/** Mola amortecida analítica (determinística, sem estado). Retorna 0→1 com overshoot. */
export const springAt = (frame: number, start: number, opts: { stiffness?: number; damping?: number } = {}) => {
  const t = (frame - start) / FPS;
  if (t <= 0) return 0;
  const k = opts.stiffness ?? 120;
  const c = opts.damping ?? 12;
  const w0 = Math.sqrt(k);
  const zeta = c / (2 * w0);
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
};

/** Pop: escala 0 → 1 com overshoot elástico. */
export const pop = (frame: number, start: number) => springAt(frame, start, { stiffness: 220, damping: 14 });

// ---------------------------------------------------------------- ruído determinístico
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};
export const seedOf = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
};
/** Ruído de valor 1D suave, -1..1 */
export const noise = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 1000), hash(i + 1 + seed * 1000), u) * 2 - 1;
};
export const rand = (i: number, seed = 0) => hash(i * 13.37 + seed * 7919);

/** Piscar natural: retorna 0 (aberto) .. 1 (fechado). Intervalos pseudo-aleatórios de 2–5 s. */
export const blinkAt = (frame: number, seed: number) => {
  let t = 0;
  let i = 0;
  while (t < frame + 10 && i < 5000) {
    const gap = sec(2 + rand(i, seed) * 3);
    const start = t + gap;
    if (frame >= start && frame < start + 6) {
      const p = (frame - start) / 6;
      return Math.sin(p * Math.PI);
    }
    // piscada dupla ocasional
    if (rand(i, seed + 3) > 0.82 && frame >= start + 8 && frame < start + 14) {
      return Math.sin(((frame - start - 8) / 6) * Math.PI);
    }
    t = start;
    i++;
  }
  return 0;
};

/** Mapeia o progresso para um valor (atalho do interpolate do Remotion com clamp). */
export const map = (frame: number, input: number[], output: number[]) =>
  interpolate(frame, input, output, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
