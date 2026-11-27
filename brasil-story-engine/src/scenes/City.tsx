/**
 * Panorama de cidade grande (prédios em 3 profundidades, avenida com carros e ônibus).
 * Ótimo para planos gerais de "o país inteiro", explicações e mudanças de escala.
 * Avenida em y=900.
 */
import React from "react";
import { Layer } from "../camera/Camera";
import { PAL, shade } from "../core/color";
import { Car, Bus } from "../props/props";
import { Clouds, Grade, Sky, Sun, TimeOfDay, Palm } from "./common";
import { rand } from "../core/anim";

const INK = PAL.ink;
export const CITY_GROUND = 900;

const Building: React.FC<{ x: number; base: number; w: number; h: number; color: string; seed: number; night?: boolean; lit?: number; detail?: boolean }> = ({
  x, base, w, h, color, seed, night, lit = 0.3, detail = true,
}) => {
  const cols = Math.max(2, Math.floor(w / 46));
  const rows = Math.max(2, Math.floor(h / 60));
  return (
    <g>
      <rect x={x} y={base - h} width={w} height={h} fill={color} stroke={detail ? INK : "none"} strokeWidth={detail ? 5 : 0} />
      <rect x={x + w - w * 0.18} y={base - h} width={w * 0.18} height={h} fill={shade(color, 0.85)} />
      {detail &&
        Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((__, c) => {
            const on = rand(r * 31 + c + seed * 97, seed) < (night ? lit + 0.3 : lit);
            return (
              <rect key={`${r}-${c}`} x={x + 14 + c * ((w - 28) / cols)} y={base - h + 20 + r * 60} width={(w - 28) / cols - 12} height={34} fill={on ? (night ? "#ffe08a" : "#e8f8ff") : night ? "#2d3770" : "#8fb8cf"} />
            );
          }),
        )}
      {detail && <rect x={x - 6} y={base - h - 12} width={w + 12} height={14} fill={shade(color, 0.75)} stroke={INK} strokeWidth={4} />}
    </g>
  );
};

export const City: React.FC<{
  frame: number;
  time?: TimeOfDay;
  traffic?: number; // 0 = rua vazia, 1 = trânsito normal
  children?: React.ReactNode;
  fg?: React.ReactNode;
  sky?: React.ReactNode;
}> = ({ frame, time = "day", traffic = 1, children, fg, sky }) => {
  const night = time === "night";
  const COLS = ["#e9c98a", "#b9d7e6", "#f2c6c0", "#cfe3b4", "#d9cfc1", "#c9c4cf", "#f3e2c7"];
  return (
    <>
      <Layer depth={0.04}>
        <Sky time={time} frame={frame} x0={-3000} x1={5000} />
        <Sun x={1450} y={220} r={80} time={time} />
        {sky}
      </Layer>
      <Layer depth={0.15}>
        <Clouds frame={frame} x0={-1500} x1={3500} n={6} y={80} speed={0.3} />
      </Layer>
      <Layer depth={0.3}>
        {Array.from({ length: 30 }).map((_, i) => (
          <rect key={i} x={-1400 + i * 160} y={CITY_GROUND - 360 - rand(i, 2) * 300} width={150} height={800} fill={night ? "#2a3060" : "#b8c7d6"} />
        ))}
      </Layer>
      <Layer depth={0.6}>
        {Array.from({ length: 22 }).map((_, i) => (
          <Building key={i} x={-1200 + i * 210} base={CITY_GROUND - 40} w={180} h={300 + rand(i, 5) * 380} color={COLS[(i * 3) % COLS.length]} seed={i + 40} night={night} detail />
        ))}
      </Layer>
      <Layer depth={1}>
        {Array.from({ length: 14 }).map((_, i) => (
          <Building key={i} x={-700 + i * 260} base={CITY_GROUND - 30} w={220 + rand(i, 8) * 40} h={260 + rand(i, 9) * 260} color={COLS[(i * 5 + 2) % COLS.length]} seed={i + 7} night={night} />
        ))}
        {[-500, 300, 1100, 1900, 2700].map((px) => <Palm key={px} x={px} y={CITY_GROUND - 20} s={0.8} frame={frame} />)}
        <rect x={-1500} y={CITY_GROUND - 40} width={6000} height={50} fill={PAL.sidewalk} stroke={INK} strokeWidth={4} />
        <rect x={-1500} y={CITY_GROUND + 10} width={6000} height={400} fill={PAL.asphalt} />
        {Array.from({ length: 50 }).map((_, i) => (
          <rect key={i} x={-1500 + i * 150} y={CITY_GROUND + 110} width={80} height={10} fill="#f2e3b3" />
        ))}
        {traffic > 0 &&
          Array.from({ length: 6 }).map((_, i) => {
            const span = 4400;
            const dirn = i % 2 ? 1 : -1;
            const x = (((i * 733 + frame * 9 * dirn * (0.8 + (i % 3) * 0.2)) % span) + span) % span - 1200;
            const y = CITY_GROUND + (dirn > 0 ? 200 : 110);
            if (rand(i, 3) > traffic) return null;
            return (
              <g key={i} transform={`translate(${x},${y}) scale(0.7)`}>
                {i === 2 ? <Bus wheelRot={x} /> : <Car color={["#e5574d", "#4f7fbf", "#ffd34d", "#f4f1ea", "#2aa79b"][i % 5]} flip={dirn < 0} wheelRot={x} />}
              </g>
            );
          })}
        {children}
      </Layer>
      {fg && <Layer depth={1.3}>{fg}</Layer>}
      <Grade time={time} vignette={0.3} />
    </>
  );
};
