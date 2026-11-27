import React from "react";
import { AbsoluteFill } from "remotion";
import timeline from "./generated/timeline.json";
import { SHOTS } from "./shots";
import type { EpisodeModule } from "../../src/episode/types";
import type { Timeline } from "../../src/core/timeline";
import { Character } from "../../src/characters/Character";
import { CAST } from "../../src/characters/cast";
import { PAL } from "../../src/core/color";
import { FONT_TITLE } from "../../src/fonts";

const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 30% 45%, #ffb36b, #c4452f)" }}>
    <svg width={1280} height={720}>
      <Character def={CAST.voce} frame={0} x={380} y={1000} scale={1.6} pose="shocked" expr="shocked" still shadow={false} />
      <text x={880} y={330} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={96} fill={PAL.ink} stroke={PAL.ink} strokeWidth={20} strokeLinejoin="round">E SE...?</text>
      <text x={880} y={330} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={96} fill="#fff">E SE...?</text>
    </svg>
  </AbsoluteFill>
);

const ep: EpisodeModule = {
  id: "__SLUG__",
  title: "__TITLE__",
  timeline: timeline as Timeline,
  shots: SHOTS,
  Thumbnail,
  audio: "episodes/__SLUG__/mix.wav",
};
export default ep;
