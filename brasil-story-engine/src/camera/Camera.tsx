/**
 * Câmera virtual 2D com parallax.
 *
 * O mundo é desenhado em coordenadas de "palco" (1920x1080 por padrão, mas pode
 * ser maior, ex.: uma rua de 4000px). A câmera define o ponto do mundo que fica
 * no centro da tela (x, y), o zoom e a rotação. Camadas <Layer depth> movem
 * menos que o mundo quando depth < 1 (fundo) e mais quando depth > 1 (primeiro plano).
 *
 * Planos prontos (use como ponto de partida):
 *   shotAt.wide(cx, cy)      plano geral  zoom 1
 *   shotAt.medium(x, feetY)  plano médio  zoom 1.6 enquadrando cintura pra cima
 *   shotAt.close(x, feetY)   close        zoom 2.6 no rosto
 *   shotAt.detail(x, y)      detalhe      zoom 3.5
 */
import React, { createContext, useContext } from "react";
import { AbsoluteFill } from "remotion";
import { H, W, Key, track, noise, clamp } from "../core/anim";

export type CamState = { x: number; y: number; zoom: number; rot: number };
const CamCtx = createContext<CamState>({ x: W / 2, y: H / 2, zoom: 1, rot: 0 });
export const useCamera = () => useContext(CamCtx);

export type CamKey = { f: number; x?: number; y?: number; zoom?: number; rot?: number; ease?: Key[2] };

/** Converte uma lista de keyframes de câmera em estado no frame. */
export const cameraAt = (frame: number, keys: CamKey[]): CamState => {
  const base: CamState = { x: W / 2, y: H / 2, zoom: 1, rot: 0 };
  const prop = (p: keyof CamState) => {
    const ks: Key[] = [];
    let last = base[p];
    for (const k of keys) {
      const v = k[p] ?? last;
      last = v;
      ks.push([k.f, v, k.ease]);
    }
    return ks.length ? track(frame, ks) : base[p];
  };
  return { x: prop("x"), y: prop("y"), zoom: prop("zoom"), rot: prop("rot") };
};

export const shotAt = {
  wide: (cx = W / 2, cy = H / 2) => ({ x: cx, y: cy, zoom: 1 }),
  medium: (x: number, feetY: number, s = 1) => ({ x, y: feetY - 260 * s, zoom: 1.7 / s }),
  close: (x: number, feetY: number, s = 1) => ({ x, y: feetY - 370 * s, zoom: 2.7 / s }),
  detail: (x: number, y: number) => ({ x, y, zoom: 3.6 }),
};

export type Shake = { at: number; dur?: number; amp?: number };

export const Camera: React.FC<{
  frame: number;
  keys?: CamKey[];
  state?: Partial<CamState>;
  shakes?: Shake[];
  /** deriva sutil de câmera na mão (0 = travada) */
  handheld?: number;
  children: React.ReactNode;
}> = ({ frame, keys = [], state, shakes = [], handheld = 0.6, children }) => {
  const c = { ...cameraAt(frame, keys), ...state } as CamState;
  // movimento de câmera na mão: muito sutil, ajuda a cena a "respirar"
  let sx = noise(frame / 45, 1) * 5 * handheld;
  let sy = noise(frame / 50, 2) * 4 * handheld;
  let sr = noise(frame / 60, 3) * 0.15 * handheld;
  for (const s of shakes) {
    const d = s.dur ?? 12;
    const p = (frame - s.at) / d;
    if (p >= 0 && p < 1) {
      const a = (s.amp ?? 18) * (1 - p) * (1 - p);
      sx += noise(frame * 0.9, 11) * a;
      sy += noise(frame * 0.9, 12) * a;
      sr += noise(frame * 0.7, 13) * a * 0.05;
    }
  }
  const cam: CamState = { x: c.x + sx / c.zoom, y: c.y + sy / c.zoom, zoom: c.zoom, rot: c.rot + sr };
  return (
    <CamCtx.Provider value={cam}>
      <AbsoluteFill style={{ overflow: "hidden" }}>{children}</AbsoluteFill>
    </CamCtx.Provider>
  );
};

/**
 * Camada com profundidade. depth=1: plano do personagem. depth=0: infinito (céu).
 * depth>1: primeiro plano (passa mais rápido, ótimo para folhas/postes na frente).
 */
export const Layer: React.FC<{ depth?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  depth = 1,
  children,
  style,
}) => {
  const cam = useCamera();
  const z = 1 + (cam.zoom - 1) * clamp(depth, 0, 3);
  const px = W / 2 + (cam.x - W / 2) * depth;
  const py = H / 2 + (cam.y - H / 2) * depth;
  const transform = `translate(${W / 2}px, ${H / 2}px) rotate(${cam.rot * depth}deg) scale(${z}) translate(${-px}px, ${-py}px)`;
  return (
    <AbsoluteFill style={{ transform, transformOrigin: "0 0", ...style }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", position: "absolute" }}>
        {children}
      </svg>
    </AbsoluteFill>
  );
};

/** Camada fixa na tela (HUD, legendas, UI de celular em tela cheia). */
export const ScreenLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute" }}>
      {children}
    </svg>
  </AbsoluteFill>
);
