/**
 * Cenários adicionais da biblioteca: Cozinha, Praia, Sala de aula.
 * Mesmo padrão de camadas: parede/céu (depth<1) → chão + objetos + personagens (1) → frente (>1).
 */
import React from "react";
import { Layer } from "../camera/Camera";
import { PAL, shade } from "../core/color";
import { Box3D, Chair, Mug, Plant } from "../props/props";
import { Clouds, Grade, Palm, Sky, Sun, TimeOfDay } from "./common";
import { FONT_UI, FONT_TITLE } from "../fonts";
import { noise } from "../core/anim";

const INK = PAL.ink;

// ------------------------------------------------------------------ COZINHA
export const KITCHEN_FLOOR = 920;
export const Kitchen: React.FC<{ frame: number; time?: TimeOfDay; fridgeOpen?: number; children?: React.ReactNode; fg?: React.ReactNode }> = ({
  frame, time = "day", fridgeOpen = 0, children, fg,
}) => {
  const F = KITCHEN_FLOOR;
  return (
    <>
      <Layer depth={0.9}>
        <rect x={-600} y={-400} width={3200} height={F + 400} fill="#cfe3b4" />
        {Array.from({ length: 40 }).map((_, i) =>
          Array.from({ length: 4 }).map((__, j) => (
            <rect key={`${i}${j}`} x={-600 + i * 70} y={F - 560 + j * 70} width={70} height={70} fill={(i + j) % 2 ? "#fff" : "#f6efe3"} stroke="#d9d2c4" strokeWidth={2} />
          )),
        )}
        {/* janela */}
        <g transform="translate(820,140)">
          <rect width={360} height={260} fill={time === "night" ? "#1d2347" : "#bfe6f7"} stroke={INK} strokeWidth={6} />
          <line x1={180} y1={0} x2={180} y2={260} stroke={INK} strokeWidth={5} />
          <path d="M-20,-20 L380,-20 L360,40 L0,40 Z" fill="#ffd34d" stroke={INK} strokeWidth={5} />
        </g>
        {/* armários de cima */}
        <Box3D x={200} y={120} w={520} h={180} d={30} color="#f2c6c0" />
        <Box3D x={1280} y={120} w={380} h={180} d={30} color="#f2c6c0" />
        <line x1={460} y1={120} x2={460} y2={300} stroke={INK} strokeWidth={4} />
        {/* filtro de barro (clássico) */}
        <g transform={`translate(240,${F - 362}) scale(0.75)`}>
          <path d="M-50,0 Q-60,-60 -40,-100 L40,-100 Q60,-60 50,0 Z" fill="#c4673f" stroke={INK} strokeWidth={5} />
          <path d="M-46,-110 Q-56,-160 -36,-190 L36,-190 Q56,-160 46,-110 Z" fill="#d9734a" stroke={INK} strokeWidth={5} />
          <rect x={-8} y={-30} width={30} height={10} fill="#9aa0a8" stroke={INK} strokeWidth={3} />
        </g>
      </Layer>
      <Layer depth={1}>
        <rect x={-600} y={F} width={3200} height={500} fill="#e3c9a0" />
        {Array.from({ length: 30 }).map((_, i) => <line key={i} x1={-600 + i * 110} y1={F} x2={-600 + i * 110 + (i * 110 - 1560) * 0.4} y2={F + 500} stroke="#cdb085" strokeWidth={4} />)}
        <line x1={-600} y1={F} x2={2600} y2={F} stroke={INK} strokeWidth={5} />
        {/* bancada + pia + fogão */}
        <Box3D x={160} y={F - 340} w={640} h={340} d={50} color="#f2c6c0" />
        <rect x={150} y={F - 360} width={680} height={24} fill="#e9e3d6" stroke={INK} strokeWidth={5} />
        <rect x={300} y={F - 356} width={180} height={14} fill="#9aa0a8" stroke={INK} strokeWidth={3} />
        <path d={`M390,${F - 356} q0,-70 50,-70`} fill="none" stroke="#9aa0a8" strokeWidth={10} />
        <g transform={`translate(560,${F - 360})`}>
          <Box3D x={0} y={0} w={220} h={360} d={40} color="#f4f1ea" />
          {[40, 110, 180].map((bx) => <circle key={bx} cx={bx} cy={-8} r={16} fill="#2d2a38" />)}
          <rect x={20} y={60} width={180} height={140} rx={8} fill="#2d2a38" stroke={INK} strokeWidth={4} />
          <g transform="translate(60,-30)">
            <Mug color="#4f7fbf" />
          </g>
        </g>
        {/* geladeira (abre) */}
        <g transform={`translate(1300,${F})`}>
          <rect x={0} y={-520} width={260} height={520} rx={18} fill="#2d2a38" stroke={INK} strokeWidth={5} />
          <rect x={14} y={-500} width={232} height={480} fill="#eef8ff" />
          {[-400, -300, -200].map((sy) => <rect key={sy} x={14} y={sy} width={232} height={8} fill="#c9dde0" />)}
          {fridgeOpen > 0.1 && (
            <g>
              <rect x={40} y={-460} width={50} height={56} fill="#ffd34d" stroke={INK} strokeWidth={3} />
              <rect x={110} y={-370} width={90} height={60} rx={10} fill="#e5574d" stroke={INK} strokeWidth={3} />
              <ellipse cx={180} cy={-240} rx={34} ry={24} fill="#7cc26b" stroke={INK} strokeWidth={3} />
              <ellipse cx={130} cy={-480} rx={200 * fridgeOpen} ry={120} fill="#eaffff" opacity={0.25 * fridgeOpen} />
            </g>
          )}
          <g transform={`translate(0,0) scale(${1 - fridgeOpen * 1.6},1)`}>
            <rect x={0} y={-520} width={260} height={520} rx={18} fill="#f4f1ea" stroke={INK} strokeWidth={5} />
            <line x1={0} y1={-360} x2={260} y2={-360} stroke={INK} strokeWidth={4} />
            <rect x={220} y={-460} width={14} height={80} rx={6} fill="#c9c4cf" stroke={INK} strokeWidth={3} />
            <rect x={220} y={-320} width={14} height={120} rx={6} fill="#c9c4cf" stroke={INK} strokeWidth={3} />
            <circle cx={70} cy={-440} r={16} fill="#e5574d" />
          </g>
        </g>
        {/* mesa com cadeira */}
        <g transform={`translate(1880,${F})`}>
          <Chair />
        </g>
        <g transform={`translate(1000,${F})`}>
          <Plant scale={0.9} />
        </g>
        {children}
      </Layer>
      {fg && <Layer depth={1.3}>{fg}</Layer>}
      <Grade time={time} />
    </>
  );
};

// ------------------------------------------------------------------ PRAIA
export const BEACH_SAND = 900;
export const Beach: React.FC<{ frame: number; time?: TimeOfDay; children?: React.ReactNode; fg?: React.ReactNode }> = ({ frame, time = "day", children, fg }) => {
  const waves = (y: number, amp: number, col: string, spd: number, ph: number) => {
    let d = `M-1500,${y}`;
    for (let x = -1500; x <= 4000; x += 60) d += ` L${x},${y + Math.sin(x / 120 + frame * spd + ph) * amp}`;
    d += ` L4000,1400 L-1500,1400 Z`;
    return <path d={d} fill={col} />;
  };
  return (
    <>
      <Layer depth={0.04}>
        <Sky time={time} frame={frame} x0={-3000} x1={5000} />
        <Sun x={1500} y={240} r={80} time={time} />
      </Layer>
      <Layer depth={0.15}>
        <Clouds frame={frame} x0={-1500} x1={3500} n={5} y={100} />
        {/* morros no horizonte */}
        <path d="M-1500,600 Q-1100,380 -800,560 Q-500,300 -200,560 L300,600 Z" fill="#6aa58a" />
        <path d="M2200,600 Q2500,360 2800,520 Q3000,420 3400,600 Z" fill="#6aa58a" />
      </Layer>
      <Layer depth={0.4}>
        {waves(600, 6, "#3f8fd1", 0.05, 0)}
        {waves(660, 8, "#4fa3de", 0.07, 1)}
        {waves(720, 10, "#6bbbe8", 0.09, 2)}
      </Layer>
      <Layer depth={1}>
        {/* espuma */}
        <path d={`M-1500,780 ${Array.from({ length: 60 }).map((_, i) => `L${-1500 + i * 100},${780 + Math.sin(i + frame / 12) * 14}`).join(" ")} L4500,840 L-1500,840 Z`} fill="#f4fbff" />
        <rect x={-1500} y={820} width={6000} height={600} fill="#f2d9a0" />
        {Array.from({ length: 80 }).map((_, i) => <circle key={i} cx={-1400 + ((i * 337) % 5000)} cy={860 + ((i * 97) % 300)} r={3} fill="#d9bf82" />)}
        <Palm x={120} y={BEACH_SAND + 20} frame={frame} />
        <Palm x={1880} y={BEACH_SAND + 10} s={1.1} frame={frame} />
        {/* guarda-sol + cadeira */}
        <g transform={`translate(400,${BEACH_SAND + 40})`}>
          <line x1={0} y1={0} x2={-20} y2={-300} stroke={INK} strokeWidth={8} />
          <path d="M-220,-280 Q-20,-420 180,-300 Z" fill="#e5574d" stroke={INK} strokeWidth={6} />
          <path d="M-90,-318 L-20,-300 L-40,-366 Z M40,-300 L120,-312 L60,-360 Z" fill="#fff6dd" />
        </g>
        {/* quiosque */}
        <g transform={`translate(1500,${BEACH_SAND})`}>
          <Box3D x={-200} y={-200} w={400} h={200} d={40} color="#2aa79b" />
          <path d="M-260,-200 L0,-340 L260,-200 Z" fill="#e9c98a" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
          <rect x={-120} y={-160} width={240} height={50} rx={8} fill="#fff6dd" stroke={INK} strokeWidth={4} />
          <text x={0} y={-124} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={34} fill="#c4452f">ÁGUA DE COCO</text>
        </g>
        {children}
      </Layer>
      {fg && <Layer depth={1.3}>{fg}</Layer>}
      <Grade time={time} vignette={0.25} />
    </>
  );
};

// ------------------------------------------------------------------ SALA DE AULA
export const CLASSROOM_FLOOR = 930;
export const Classroom: React.FC<{ frame: number; board?: string[]; children?: React.ReactNode; fg?: React.ReactNode }> = ({ frame, board = ["Hoje: frações", "1/2 + 1/4 = ?"], children, fg }) => {
  const F = CLASSROOM_FLOOR;
  return (
    <>
      <Layer depth={0.9}>
        <rect x={-600} y={-400} width={3200} height={F + 400} fill="#f3e2c7" />
        <rect x={-600} y={F - 360} width={3200} height={360} fill="#b9d7e6" />
        <rect x={-600} y={F - 364} width={3200} height={8} fill="#7fa8c0" />
        {/* lousa verde */}
        <g transform="translate(560,170)">
          <rect x={0} y={0} width={800} height={360} fill="#2f5a43" stroke={PAL.wood} strokeWidth={18} />
          {board.map((l, i) => (
            <text key={i} x={50} y={90 + i * 90} fontFamily={FONT_UI} fontWeight={800} fontSize={58} fill="#f4f1ea" opacity={0.92}>{l}</text>
          ))}
          <rect x={300} y={360} width={200} height={14} fill={PAL.wood} />
        </g>
        {/* janelas basculantes */}
        {[1500, 1800].map((wx) => (
          <g key={wx} transform={`translate(${wx},140)`}>
            <rect width={240} height={300} fill="#bfe6f7" stroke={INK} strokeWidth={6} />
            {[75, 150, 225].map((wy) => <line key={wy} x1={0} y1={wy} x2={240} y2={wy} stroke={INK} strokeWidth={5} />)}
          </g>
        ))}
        {/* relógio */}
        <g transform="translate(300,180)">
          <circle r={60} fill="#fff" stroke={INK} strokeWidth={6} />
          <line x1={0} y1={0} x2={0} y2={-40} stroke={INK} strokeWidth={6} strokeLinecap="round" transform={`rotate(${frame * 0.5})`} />
          <line x1={0} y1={0} x2={26} y2={0} stroke={INK} strokeWidth={6} strokeLinecap="round" />
        </g>
        {/* ventilador de teto */}
        <g transform="translate(960,-20)">
          <line x1={0} y1={-100} x2={0} y2={60} stroke={INK} strokeWidth={8} />
          <ellipse cx={0} cy={60} rx={240} ry={30} fill="#9aa0a8" opacity={0.35} />
          <g transform={`translate(0,60) scale(1,0.18) rotate(${frame * 25})`}>
            {[0, 120, 240].map((a) => <ellipse key={a} transform={`rotate(${a}) translate(0,-120)`} rx={34} ry={110} fill="#c9c4cf" stroke={INK} strokeWidth={10} />)}
          </g>
          <circle cx={0} cy={60} r={20} fill="#6f7f8f" stroke={INK} strokeWidth={4} />
        </g>
      </Layer>
      <Layer depth={1}>
        <rect x={-600} y={F} width={3200} height={500} fill="#d9cfc1" />
        {Array.from({ length: 34 }).map((_, i) => <line key={i} x1={-600 + i * 100} y1={F} x2={-600 + i * 100 + (i * 100 - 1560) * 0.4} y2={F + 500} stroke="#c4b8a6" strokeWidth={3} />)}
        <line x1={-600} y1={F} x2={2600} y2={F} stroke={INK} strokeWidth={5} />
        {/* mesa do professor */}
        <Box3D x={1500} y={F - 200} w={360} h={200} d={40} color={PAL.wood} />
        {children}
        {/* carteiras em primeiro plano */}
        {[200, 760, 1320].map((cx) => (
          <g key={cx} transform={`translate(${cx},${F + 120})`}>
            <rect x={-120} y={-160} width={240} height={24} fill="#e9c98a" stroke={INK} strokeWidth={5} />
            <rect x={-110} y={-136} width={14} height={136} fill="#6f7f8f" />
            <rect x={96} y={-136} width={14} height={136} fill="#6f7f8f" />
          </g>
        ))}
      </Layer>
      {fg && <Layer depth={1.3}>{fg}</Layer>}
      <Grade vignette={0.3} />
    </>
  );
};

/** Fundo abstrato colorido para inserts gráficos (números, explicações). */
export const GraphicBg: React.FC<{ frame: number; color?: string; color2?: string; children?: React.ReactNode }> = ({ frame, color = "#2d3770", color2 = "#3f4a8f", children }) => (
  <>
    <Layer depth={0.2}>
      <rect x={-2000} y={-2000} width={6000} height={6000} fill={color} />
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={i} cx={-200 + ((i * 397) % 2400)} cy={((i * 233) % 1200) + noise(frame / 60 + i, i) * 30} r={60 + (i % 4) * 50} fill={color2} opacity={0.5} />
      ))}
    </Layer>
    <Layer depth={1}>{children}</Layer>
    <Grade vignette={0.4} />
  </>
);

export { shade };
