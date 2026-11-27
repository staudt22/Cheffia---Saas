/** Quarto brasileiro: cama de solteiro, criado-mudo, ventilador, janela com cortina, pôster, guarda-roupa. Chão em y=900. */
import React from "react";
import { Layer } from "../camera/Camera";
import { PAL, shade } from "../core/color";
import { Bed, Box3D, Nightstand, Plant } from "../props/props";
import { Grade, LightBeam, TimeOfDay } from "./common";

const INK = PAL.ink;
export const BEDROOM_FLOOR = 900;

export const Bedroom: React.FC<{
  frame: number;
  time?: TimeOfDay;
  lampOn?: number;
  blanketFold?: number;
  /** objetos sobre o criado-mudo (0,0 = tampo) */
  onNightstand?: React.ReactNode;
  children?: React.ReactNode;
  fg?: React.ReactNode;
}> = ({ frame, time = "morning", lampOn = 0, blanketFold = 0, onNightstand, children, fg }) => {
  const F = BEDROOM_FLOOR;
  const wall = "#f1dcc0";
  const fanRot = (frame * 22) % 360;
  return (
    <>
      <Layer depth={0.92}>
        {/* parede com textura de tinta + rodapé */}
        <rect x={-600} y={-400} width={3200} height={F + 400} fill={wall} />
        {Array.from({ length: 26 }).map((_, i) => (
          <rect key={i} x={-600 + i * 120} y={-400} width={60} height={F + 400} fill={shade(wall, 0.975)} />
        ))}
        {/* janela */}
        <g transform="translate(1180,170)">
          <rect x={-10} y={-10} width={420} height={380} fill={PAL.white} stroke={INK} strokeWidth={6} />
          <rect x={10} y={10} width={380} height={340} fill={time === "night" ? "#1d2347" : "#bfe6f7"} />
          {time !== "night" && (
            <>
              <circle cx={300} cy={90} r={46} fill="#fff1a8" />
              <path d="M10,300 Q90,250 160,280 Q240,230 390,270 L390,350 L10,350 Z" fill="#9cc98a" />
              <rect x={60} y={230} width={70} height={90} fill="#f2c6c0" stroke={INK} strokeWidth={3} />
              <path d="M50,232 L95,195 L140,232 Z" fill="#d9734a" stroke={INK} strokeWidth={3} />
              <rect x={240} y={200} width={90} height={120} fill="#cfe3b4" stroke={INK} strokeWidth={3} />
            </>
          )}
          <rect x={195} y={10} width={10} height={340} fill={PAL.white} stroke={INK} strokeWidth={3} />
          <rect x={10} y={175} width={380} height={10} fill={PAL.white} stroke={INK} strokeWidth={3} />
          {/* cortinas balançando */}
          {[-1, 1].map((sd) => {
            const sway = Math.sin(frame / 28 + sd) * 8;
            const x0 = sd < 0 ? -50 : 330;
            return (
              <path key={sd} d={`M${x0},-30 L${x0 + 120},-30 Q${x0 + 110 + sway},180 ${x0 + 90 + sway * 1.6},380 L${x0 + 10},380 Q${x0 + sway},180 ${x0},-30 Z`} fill="#e86f5a" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
            );
          })}
          <rect x={-70} y={-44} width={540} height={18} rx={9} fill={PAL.woodDark} stroke={INK} strokeWidth={4} />
        </g>
        {/* pôster original (geométrico) */}
        <g transform="translate(320,200) rotate(-3)">
          <rect width={230} height={300} fill="#2d3770" stroke={INK} strokeWidth={6} />
          <circle cx={115} cy={120} r={70} fill="#ffc83d" />
          <path d="M0,300 L80,180 L140,250 L180,200 L230,300 Z" fill="#2aa79b" />
          <rect x={20} y={20} width={60} height={8} fill="#fff" opacity={0.7} />
        </g>
        {/* prateleira com livros */}
        <g transform="translate(660,330)">
          <rect x={0} y={0} width={300} height={18} fill={PAL.wood} stroke={INK} strokeWidth={5} />
          {["#e5574d", "#4f7fbf", "#ffd34d", "#2aa79b", "#a684d6"].map((c, i) => (
            <rect key={i} x={20 + i * 34} y={-90 + (i % 2) * 14} width={28} height={90 - (i % 2) * 14} fill={c} stroke={INK} strokeWidth={4} />
          ))}
          <g transform="translate(230,0)">
            <Plant scale={0.6} />
          </g>
        </g>
        {/* ventilador de parede */}
        <g transform="translate(1000,120)">
          <rect x={-8} y={0} width={16} height={60} fill="#e9e3d6" stroke={INK} strokeWidth={4} />
          <circle cx={0} cy={80} r={70} fill="#fffaf2" opacity={0.5} stroke={INK} strokeWidth={4} />
          <g transform={`translate(0,80) rotate(${fanRot})`} opacity={0.7}>
            {[0, 120, 240].map((a) => (
              <ellipse key={a} transform={`rotate(${a}) translate(0,-32)`} rx={16} ry={30} fill="#9fcfe2" />
            ))}
          </g>
          <circle cx={0} cy={80} r={12} fill="#4f7fbf" stroke={INK} strokeWidth={4} />
        </g>
        {/* guarda-roupa */}
        <g transform="translate(1660,0)">
          <Box3D x={0} y={260} w={360} h={F - 260} d={50} color="#d9a56f" />
          <line x1={180} y1={270} x2={180} y2={F - 10} stroke={INK} strokeWidth={4} />
          <circle cx={165} cy={560} r={7} fill={PAL.gold} stroke={INK} strokeWidth={3} />
          <circle cx={195} cy={560} r={7} fill={PAL.gold} stroke={INK} strokeWidth={3} />
        </g>
        {/* rodapé */}
        <rect x={-600} y={F - 26} width={3200} height={26} fill="#e9e3d6" stroke={INK} strokeWidth={4} />
      </Layer>
      <Layer depth={1}>
        {/* piso de madeira em perspectiva */}
        <rect x={-600} y={F} width={3200} height={500} fill="#c98f5c" />
        {Array.from({ length: 30 }).map((_, i) => (
          <line key={i} x1={-600 + i * 120} y1={F} x2={-600 + i * 120 + (i * 120 - 1560) * 0.5} y2={F + 500} stroke="#a8713f" strokeWidth={4} />
        ))}
        <line x1={-600} y1={F} x2={2600} y2={F} stroke={INK} strokeWidth={5} />
        {/* tapete */}
        <ellipse cx={980} cy={F + 70} rx={360} ry={50} fill="#6aa5a0" stroke={INK} strokeWidth={5} />
        <ellipse cx={980} cy={F + 70} rx={290} ry={36} fill="none" stroke="#f6efe3" strokeWidth={5} strokeDasharray="14 12" />
        {/* luz da janela no chão/parede */}
        {time !== "night" && (
          <LightBeam d={`M1190,180 L1580,180 L1380,${F + 160} L760,${F + 160} Z`} frame={frame} opacity={0.18} dust={{ x: 900, y: 300, w: 600, h: 600 }} />
        )}
        <g transform={`translate(80,${F + 10})`}>
          <Bed blanketFold={blanketFold} />
        </g>
        <g transform={`translate(640,${F + 10})`}>
          <Nightstand lampOn={lampOn} />
          <g transform="translate(70,-112)">{onNightstand}</g>
        </g>
        {children}
      </Layer>
      {fg && <Layer depth={1.25}>{fg}</Layer>}
      <Grade time={time} />
    </>
  );
};
