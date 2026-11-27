/** Estilos de entrada da cena seguinte (p = 0..1). */
import type React from "react";

export type TransitionName = "cut" | "fade" | "whip" | "wipe" | "iris" | "flash" | "dip" | "zoom";

export const TRANSITIONS: Record<TransitionName, (p: number) => React.CSSProperties> = {
  cut: () => ({}),
  fade: (p) => ({ opacity: p }),
  dip: (p) => ({ opacity: p < 0.5 ? 0 : (p - 0.5) * 2 }), // passa pelo preto (o fundo é escuro)
  flash: (p) => ({ opacity: p, filter: `brightness(${1 + (1 - p) * 3})` }),
  whip: (p) => ({ transform: `translateX(${(1 - p) * 100}%)`, filter: `blur(${(1 - p) * 24}px)` }),
  wipe: (p) => ({ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }),
  iris: (p) => ({ clipPath: `circle(${p * 120}% at 50% 50%)` }),
  zoom: (p) => ({ opacity: p, transform: `scale(${1.25 - 0.25 * p})` }),
};
