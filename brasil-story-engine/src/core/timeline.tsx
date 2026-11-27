/**
 * Timeline do episódio: gerada por scripts/audio/build_audio.py a partir da
 * narração real (TTS ou áudio do usuário). As cenas consultam aqui QUANDO cada
 * fala começa, para sincronizar ação, expressão e câmera com a voz.
 */
import React, { createContext, useContext } from "react";
import { FPS } from "./anim";

export type TimelineLine = {
  id: string;
  shot: string;
  speaker: string;
  text: string;
  start: number; // segundos (global)
  end: number;
};
export type TimelineShot = {
  id: string;
  start: number; // segundos (global)
  end: number;
  transition?: string;
};
export type Timeline = {
  episode: string;
  fps: number;
  duration: number; // segundos
  shots: TimelineShot[];
  lines: TimelineLine[];
  sfx: { name: string; at: number; shot: string }[];
};

type ShotCtx = {
  shot: TimelineShot;
  timeline: Timeline;
  /** duração da cena em frames */
  frames: number;
};
const Ctx = createContext<ShotCtx | null>(null);
export const ShotProvider: React.FC<{ value: ShotCtx; children: React.ReactNode }> = ({ value, children }) => (
  <Ctx.Provider value={value}>{children}</Ctx.Provider>
);

export const useShot = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useShot fora de uma cena");
  return c;
};

/**
 * Início/fim (em frames LOCAIS da cena) de uma fala.
 * Uso: const l2 = useLine("l2"); ... track(frame, [[l2.start, 0], [l2.start+10, 1]])
 */
export const useLine = (id: string) => {
  const { shot, timeline } = useShot();
  const l = timeline.lines.find((x) => x.id === id);
  if (!l) return { start: 0, end: 0, mid: 0, text: "" };
  const start = Math.round((l.start - shot.start) * FPS);
  const end = Math.round((l.end - shot.start) * FPS);
  return { start, end, mid: Math.round((start + end) / 2), text: l.text };
};

/** Todas as falas da cena (para lip-sync de personagens que falam). */
export const useShotLines = () => {
  const { shot, timeline } = useShot();
  return timeline.lines
    .filter((l) => l.shot === shot.id)
    .map((l) => ({
      ...l,
      startF: Math.round((l.start - shot.start) * FPS),
      endF: Math.round((l.end - shot.start) * FPS),
    }));
};

/** true se algum personagem `speaker` está falando no frame local. */
export const useSpeaking = (speaker: string, frame: number) => {
  const lines = useShotLines();
  return lines.some((l) => l.speaker === speaker && frame >= l.startF && frame < l.endF - 3);
};
