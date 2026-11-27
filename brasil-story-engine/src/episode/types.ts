import React from "react";
import type { Timeline } from "../core/timeline";

/** Componente de uma cena: recebe frame LOCAL e duração da cena em frames. */
export type ShotComponent = React.FC<{ frame: number; dur: number }>;

export type EpisodeModule = {
  id: string;
  title: string;
  timeline: Timeline;
  shots: Record<string, ShotComponent>;
  Thumbnail?: React.FC;
  /** arquivo de áudio mixado relativo a /public */
  audio: string;
};
