import React from "react";
import { AbsoluteFill } from "remotion";
import timeline from "./generated/timeline.json";
import { SHOTS } from "./shots";
import type { EpisodeModule } from "../../src/episode/types";
import type { Timeline } from "../../src/core/timeline";
import { Character } from "../../src/characters/Character";
import { CAST } from "../../src/characters/cast";
import { Phone, Bread, PriceTag, MoneyRain } from "../../src/props/props";
import { PAL } from "../../src/core/color";
import { FONT_TITLE } from "../../src/fonts";

/** Thumbnail 1280x720: rosto expressivo + contraste + 3 palavras. */
const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(circle at 30% 45%, #3fd18a 0%, #127a52 55%, #0b3d2b 100%)" }}>
    <svg width={1280} height={720} viewBox="0 0 1280 720">
      <g transform="scale(0.6667)">
        <MoneyRain frame={40} count={28} seed={9} />
        <Character def={CAST.voce} frame={12} x={560} y={1500} scale={2.4} pose={{ base: "phoneUp", handF: "hold" }} expr="shocked" gaze={[0.9, 0.2]} holdF={<Phone glow={1} scale={1.2} />} still shadow={false} />
        <g transform="translate(1440,560)">
          <PriceTag price="R$ 900" scale={2.0} color={PAL.red} swing={-8} />
        </g>
        <g transform="translate(1520,840) scale(2.6)"><Bread /></g>
      </g>
      <g transform="translate(890,120) rotate(-4)">
        <text textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={104} fill={PAL.ink} stroke={PAL.ink} strokeWidth={22} strokeLinejoin="round">R$ 1 MILHÃO</text>
        <text textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={104} fill={PAL.gold}>R$ 1 MILHÃO</text>
        <text y={96} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={70} fill={PAL.ink} stroke={PAL.ink} strokeWidth={18} strokeLinejoin="round">PRA TODO MUNDO?</text>
        <text y={96} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={70} fill="#fff">PRA TODO MUNDO?</text>
      </g>
    </svg>
  </AbsoluteFill>
);

const ep: EpisodeModule = {
  id: "um-milhao",
  title: "E se todo brasileiro ganhasse R$ 1 milhão amanhã?",
  timeline: timeline as Timeline,
  shots: SHOTS,
  Thumbnail,
  audio: "episodes/um-milhao/mix.wav",
};
export default ep;
