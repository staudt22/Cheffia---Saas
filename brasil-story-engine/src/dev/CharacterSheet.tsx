/** Ficha de personagens: todos os rigs, poses e expressões. Use para validar consistência. */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Character } from "../characters/Character";
import { CAST } from "../characters/cast";
import { PoseName, ExprName } from "../characters/library";
import { PAL } from "../core/color";
import { FONT_TITLE } from "../fonts";

const POSE_ROW: [PoseName, ExprName][] = [
  ["idle", "neutral"], ["point", "happy"], ["armsUp", "ecstatic"], ["shrug", "confused"],
  ["think", "calm"], ["shocked", "shocked"], ["holdPhone", "surprised"], ["sad", "sad"],
  ["crossArms", "angry"], ["facepalm", "worried"], ["cheer", "joy"], ["sit", "scared"],
];

export const CharacterSheet: React.FC<{ page?: number }> = ({ page = 0 }) => {
  const frame = useCurrentFrame();
  const ids = Object.keys(CAST) as (keyof typeof CAST)[];
  return (
    <AbsoluteFill style={{ background: "#f6efe3" }}>
      <svg width={1920} height={1080}>
        {page === 0 ? (
          <>
            <text x={60} y={80} fontFamily={FONT_TITLE} fontWeight={700} fontSize={54} fill={PAL.ink}>Elenco — estilo "Bairro"</text>
            {ids.map((id, i) => {
              const x = 170 + i * 315;
              return (
                <g key={id}>
                  <Character def={CAST[id]} frame={frame + i * 17} x={x} y={820} scale={1.1} pose="idle" expr="happy" />
                  <text x={x} y={900} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={34} fill={PAL.ink}>{CAST[id].name}</text>
                </g>
              );
            })}
          </>
        ) : (
          <>
            <text x={60} y={70} fontFamily={FONT_TITLE} fontWeight={700} fontSize={44} fill={PAL.ink}>Poses + expressões</text>
            {POSE_ROW.map(([p, e], i) => {
              const x = 140 + (i % 6) * 320;
              const y = i < 6 ? 500 : 1010;
              return (
                <g key={p}>
                  <Character def={CAST.voce} frame={frame} x={x} y={y - 30} scale={0.82} pose={p} expr={e} gaze={[0.6, p === "holdPhone" ? 0.8 : 0]} />
                  <text x={x} y={y + 10} textAnchor="middle" fontFamily={FONT_TITLE} fontSize={26} fill={PAL.ink}>{p} · {e}</text>
                </g>
              );
            })}
          </>
        )}
      </svg>
    </AbsoluteFill>
  );
};
