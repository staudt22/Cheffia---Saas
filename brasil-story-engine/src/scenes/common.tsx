/** Peças comuns de cenário: céu, nuvens, árvores, poste com fiação, iluminação. */
import React from "react";
import { AbsoluteFill } from "remotion";
import { PAL, shade, mix } from "../core/color";
import { noise } from "../core/anim";

const INK = PAL.ink;

export type TimeOfDay = "morning" | "day" | "sunset" | "night";

export const SKY: Record<TimeOfDay, [string, string]> = {
  morning: ["#9fd8f2", "#ffe7c2"],
  day: [PAL.skyTop, PAL.sky],
  sunset: ["#6f6bb8", "#ffb07a"],
  night: ["#121634", "#2d3770"],
};

/** Gradiente de céu em coordenadas de mundo (x0..x1). */
export const Sky: React.FC<{ time?: TimeOfDay; x0?: number; x1?: number; h?: number; frame: number }> = ({
  time = "day", x0 = -2000, x1 = 6000, h = 1080, frame,
}) => {
  const [top, bot] = SKY[time];
  const id = `sky-${time}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bot} />
        </linearGradient>
      </defs>
      <rect x={x0} y={-1000} width={x1 - x0} height={h + 2000} fill={`url(#${id})`} />
      {time === "night" &&
        Array.from({ length: 60 }).map((_, i) => (
          <circle key={i} cx={x0 + ((i * 397) % (x1 - x0))} cy={(i * 173) % 600} r={1.5 + (i % 3)} fill="#fff" opacity={0.4 + 0.4 * Math.abs(noise(frame / 20 + i, i))} />
        ))}
    </g>
  );
};

export const Sun: React.FC<{ x: number; y: number; r?: number; time?: TimeOfDay }> = ({ x, y, r = 70, time = "day" }) =>
  time === "night" ? (
    <g>
      <circle cx={x} cy={y} r={r * 0.8} fill="#f4f1d8" />
      <circle cx={x + r * 0.35} cy={y - r * 0.15} r={r * 0.7} fill={SKY.night[0]} />
    </g>
  ) : (
    <g>
      <circle cx={x} cy={y} r={r * 2.2} fill="#fff5c8" opacity={0.25} />
      <circle cx={x} cy={y} r={r} fill={time === "sunset" ? "#ffcf8a" : "#fff1a8"} />
    </g>
  );

export const Cloud: React.FC<{ x: number; y: number; s?: number; opacity?: number }> = ({ x, y, s = 1, opacity = 0.95 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={opacity}>
    <path d="M-120,30 Q-130,-10 -80,-14 Q-70,-60 -10,-50 Q30,-80 70,-40 Q130,-44 124,10 Q140,30 110,36 L-100,36 Q-130,36 -120,30 Z" fill="#fffaf2" />
    <path d="M-110,30 L110,30 Q120,36 100,38 L-100,38 Z" fill="#e4eef5" />
  </g>
);

export const Clouds: React.FC<{ frame: number; x0?: number; x1?: number; n?: number; y?: number; speed?: number }> = ({
  frame, x0 = -400, x1 = 4000, n = 6, y = 120, speed = 0.25,
}) => (
  <g>
    {Array.from({ length: n }).map((_, i) => {
      const span = x1 - x0;
      const cx = x0 + (((i * 0.618 * span + frame * speed * (1 + (i % 3) * 0.3)) % span) + span) % span;
      return <Cloud key={i} x={cx} y={y + ((i * 67) % 140)} s={0.6 + ((i * 37) % 50) / 100} />;
    })}
  </g>
);

export const Tree: React.FC<{ x: number; y: number; s?: number; frame?: number; color?: string }> = ({ x, y, s = 1, frame = 0, color = PAL.grass }) => {
  const sway = noise(frame / 50 + x, 4) * 3;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-16,0 L-10,-170 L10,-170 L16,0 Z" fill={PAL.woodDark} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      <g transform={`rotate(${sway}, 0, -170)`}>
        {[[-60, -200, 80], [50, -210, 85], [0, -270, 95], [-20, -190, 70]].map(([cx, cy, r], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={i === 2 ? shade(color, 1.08) : color} stroke={INK} strokeWidth={5} />
        ))}
        {[[-60, -200, 80], [50, -210, 85], [0, -270, 95], [-20, -190, 70]].map(([cx, cy, r], i) => (
          <circle key={`f${i}`} cx={cx} cy={cy + 4} r={r - 5} fill={i === 2 ? shade(color, 1.08) : color} />
        ))}
        <ellipse cx={-10} cy={-180} rx={90} ry={30} fill={shade(color, 0.82)} opacity={0.6} />
      </g>
    </g>
  );
};

export const Palm: React.FC<{ x: number; y: number; s?: number; frame?: number }> = ({ x, y, s = 1, frame = 0 }) => {
  const sway = noise(frame / 40 + x, 5) * 5;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-14,0 Q-30,-160 20,-330 L36,-326 Q-6,-160 14,0 Z" fill="#a8784c" stroke={INK} strokeWidth={5} />
      <g transform={`translate(28,-328) rotate(${sway})`}>
        {[-160, -120, -60, -20, 20, 200].map((a, i) => (
          <path key={i} transform={`rotate(${a})`} d="M0,0 Q70,-40 160,10 Q80,-10 0,0 Z" fill={i % 2 ? PAL.grass : PAL.grassDark} stroke={INK} strokeWidth={4} />
        ))}
        <circle cx={-6} cy={10} r={14} fill="#7a5a3a" stroke={INK} strokeWidth={3} />
      </g>
    </g>
  );
};

/** Poste de concreto com fiação embolada — bem brasileiro. */
export const PowerPole: React.FC<{ x: number; y: number; h?: number; wireTo?: number; frame?: number }> = ({ x, y, h = 620, wireTo, frame = 0 }) => (
  <g>
    <path d={`M${x - 14},${y} L${x - 9},${y - h} L${x + 9},${y - h} L${x + 14},${y} Z`} fill="#bdb6ad" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
    <rect x={x - 70} y={y - h + 40} width={140} height={14} fill="#8f877e" stroke={INK} strokeWidth={4} />
    <rect x={x - 24} y={y - h + 90} width={48} height={60} rx={6} fill="#9aa0a8" stroke={INK} strokeWidth={4} />
    {wireTo !== undefined &&
      [0, 1, 2, 3].map((i) => {
        const sag = 60 + i * 18 + noise(frame / 60 + i, 9) * 4;
        const y0 = y - h + 46 + i * 4;
        return <path key={i} d={`M${x - 60 + i * 40},${y0} Q${(x + wireTo) / 2},${y0 + sag} ${wireTo - 60 + i * 40},${y0}`} fill="none" stroke="#2b2233" strokeWidth={3} opacity={0.85} />;
      })}
    {/* emaranhado de fios */}
    <path d={`M${x - 30},${y - h + 120} q20,30 40,0 q10,-20 -20,-10 q-30,20 10,40`} fill="none" stroke="#2b2233" strokeWidth={3} />
  </g>
);

/** Feixe de luz (janela/sol) com poeira flutuando. */
export const LightBeam: React.FC<{ d: string; frame: number; color?: string; opacity?: number; dust?: { x: number; y: number; w: number; h: number } }> = ({
  d, frame, color = "#fff2b8", opacity = 0.35, dust,
}) => (
  <g style={{ mixBlendMode: "screen" as const }}>
    <path d={d} fill={color} opacity={opacity} />
    {dust &&
      Array.from({ length: 18 }).map((_, i) => (
        <circle
          key={i}
          cx={dust.x + ((i * 97 + frame * 0.6) % dust.w)}
          cy={dust.y + ((i * 53 + noise(frame / 30 + i, i) * 40 + frame * 0.2) % dust.h)}
          r={2 + (i % 3)}
          fill="#fff"
          opacity={0.5}
        />
      ))}
  </g>
);

/** Correção de cor/iluminação da cena inteira (tela). */
export const Grade: React.FC<{ time?: TimeOfDay; vignette?: number; tint?: string; tintAmount?: number }> = ({ time = "day", vignette = 0.35, tint, tintAmount = 0 }) => {
  const t = tint ?? (time === "sunset" ? "#ff8a4a" : time === "night" ? "#1c2a6b" : time === "morning" ? "#ffd9a0" : "#ffffff");
  const amt = tint ? tintAmount : time === "night" ? 0.38 : time === "sunset" ? 0.16 : time === "morning" ? 0.08 : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {amt > 0 && <AbsoluteFill style={{ background: t, opacity: amt, mixBlendMode: "multiply" }} />}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,10,30,${vignette}) 100%)` }} />
    </AbsoluteFill>
  );
};

export const groundShadow = (x: number, y: number, rx: number) => <ellipse cx={x} cy={y} rx={rx} ry={rx * 0.12} fill="#1a1020" opacity={0.16} />;

export { mix };
