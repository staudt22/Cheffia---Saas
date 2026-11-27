/**
 * Rua residencial brasileira (mundo de -400 a 4400 px de largura).
 * Casa com muro, portão de garagem e caixa d'água · casa da vizinha · postes com fiação ·
 * ponto de ônibus · fachada de padaria. Personagens andam na calçada em y = STREET_WALK.
 */
import React from "react";
import { Layer } from "../camera/Camera";
import { PAL, shade } from "../core/color";
import { Box3D, Car, Plant } from "../props/props";
import { Clouds, Grade, PowerPole, Sky, Sun, TimeOfDay, Tree } from "./common";
import { FONT_TITLE, FONT_UI } from "../fonts";

const INK = PAL.ink;
export const STREET_WALK = 940; // linha dos pés na calçada
export const STREET_ROAD = 1010; // pista
export const STREET_SPOTS = {
  myGate: 480, // portão de pedestre da sua casa
  myGarage: 260,
  neideGate: 1350,
  busStop: 2700,
  bakeryDoor: 3560,
};

/** Casa térrea com telhado de telha, caixa d'água e muro com portão. */
export const House: React.FC<{ x: number; base: number; w?: number; color?: string; roof?: string; wallColor?: string; gateOpen?: number; garageOpen?: number; frame: number; name?: string }> = ({
  x, base, w = 820, color = PAL.wallWarm, roof = "#d9734a", wallColor = "#e9e3d6", gateOpen = 0, garageOpen = 0, name,
}) => {
  const houseTop = base - 560;
  const muroH = 250;
  return (
    <g transform={`translate(${x},0)`}>
      {/* caixa d'água */}
      <g transform={`translate(${w * 0.68},${houseTop - 70})`}>
        <path d="M-60,0 L60,0 L50,90 L-50,90 Z" fill="#3f8fd1" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        <ellipse cx={0} cy={0} rx={60} ry={14} fill="#5aa6e0" stroke={INK} strokeWidth={5} />
        <path d="M-30,10 L-26,80" stroke="#7fc0f0" strokeWidth={8} strokeLinecap="round" />
      </g>
      {/* antena */}
      <path d={`M${w * 0.25},${houseTop + 10} L${w * 0.25},${houseTop - 90} M${w * 0.25 - 40},${houseTop - 70} L${w * 0.25 + 40},${houseTop - 70} M${w * 0.25 - 26},${houseTop - 50} L${w * 0.25 + 26},${houseTop - 50}`} stroke={INK} strokeWidth={4} />
      {/* fachada */}
      <rect x={40} y={houseTop + 60} width={w - 80} height={500} fill={color} stroke={INK} strokeWidth={6} />
      <rect x={40} y={houseTop + 60} width={w - 80} height={30} fill={shade(color, 0.85)} />
      {/* telhado de telha colonial */}
      <path d={`M0,${houseTop + 70} L${w * 0.18},${houseTop} L${w * 0.82},${houseTop} L${w},${houseTop + 70} Z`} fill={roof} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      {Array.from({ length: Math.floor(w / 40) }).map((_, i) => (
        <path key={i} d={`M${20 + i * 40},${houseTop + 66} q20,-14 40,0`} fill="none" stroke={shade(roof, 0.75)} strokeWidth={4} />
      ))}
      {/* janela com grade */}
      <g transform={`translate(${w * 0.55},${houseTop + 150})`}>
        <rect width={180} height={140} fill="#bfe6f7" stroke={INK} strokeWidth={5} />
        <path d="M0,0 L180,140" stroke="#e8f8ff" strokeWidth={10} opacity={0.6} />
        {[30, 60, 90, 120, 150].map((gx) => <line key={gx} x1={gx} y1={0} x2={gx} y2={140} stroke={INK} strokeWidth={4} />)}
        <rect x={-14} y={140} width={208} height={16} fill={shade(color, 0.8)} stroke={INK} strokeWidth={4} />
      </g>
      {/* muro */}
      <rect x={0} y={base - muroH} width={w} height={muroH} fill={wallColor} stroke={INK} strokeWidth={6} />
      <rect x={0} y={base - muroH} width={w} height={18} fill={shade(wallColor, 0.85)} stroke={INK} strokeWidth={4} />
      {/* número + nome */}
      <rect x={w * 0.74} y={base - 190} width={110} height={56} rx={6} fill="#2d3770" stroke={INK} strokeWidth={4} />
      <text x={w * 0.74 + 55} y={base - 150} textAnchor="middle" fontFamily={FONT_UI} fontWeight={800} fontSize={30} fill="#fff">{name ?? "128"}</text>
      {/* portão de garagem (basculante) */}
      <g>
        <rect x={110} y={base - 230} width={330} height={230} fill="#2d2a38" />
        <g transform={`translate(0, ${-garageOpen * 200})`}>
          <rect x={110} y={base - 230} width={330} height={230} fill="#6f7f8f" stroke={INK} strokeWidth={5} />
          {Array.from({ length: 10 }).map((_, i) => <line key={i} x1={110 + 16 + i * 32} y1={base - 220} x2={110 + 16 + i * 32} y2={base - 6} stroke={shade("#6f7f8f", 0.7)} strokeWidth={5} />)}
        </g>
      </g>
      {/* portão de pedestre (abre) */}
      <g>
        <rect x={460} y={base - 220} width={110} height={220} fill="#3a3445" />
        <g transform={`translate(460,0) scale(${1 - gateOpen * 0.85},1)`}>
          <rect x={0} y={base - 220} width={110} height={220} fill="none" stroke={INK} strokeWidth={6} />
          {[18, 36, 54, 72, 90].map((gx) => <line key={gx} x1={gx} y1={base - 220} x2={gx} y2={base} stroke="#4a4f5c" strokeWidth={6} />)}
          <rect x={0} y={base - 220} width={110} height={220} fill="none" stroke="#4a4f5c" strokeWidth={4} />
        </g>
      </g>
    </g>
  );
};

/** Fachada de padaria com toldo listrado. */
export const BakeryFront: React.FC<{ x: number; base: number; frame: number; name?: string }> = ({ x, base, name = "PADARIA ESTRELA" }) => (
  <g transform={`translate(${x},0)`}>
    <rect x={0} y={base - 620} width={900} height={620} fill="#f2e3b3" stroke={INK} strokeWidth={6} />
    <rect x={0} y={base - 700} width={900} height={90} fill="#c4452f" stroke={INK} strokeWidth={6} />
    <text x={450} y={base - 640} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={56} fill="#fff6dd">{name}</text>
    <path d={`M${450 + 400},${base - 690} l12,24 26,4 -19,18 5,26 -24,-12 -24,12 5,-26 -19,-18 26,-4 Z`} fill={PAL.gold} />
    {/* toldo */}
    <g>
      {Array.from({ length: 9 }).map((_, i) => (
        <path key={i} d={`M${i * 100},${base - 600} L${i * 100 + 100},${base - 600} L${i * 100 + 100},${base - 520} Q${i * 100 + 50},${base - 490} ${i * 100},${base - 520} Z`} fill={i % 2 ? "#fff6dd" : "#e5574d"} stroke={INK} strokeWidth={5} strokeLinejoin="round" />
      ))}
    </g>
    {/* porta de enrolar aberta + interior */}
    <rect x={380} y={base - 440} width={260} height={440} fill="#5a3b2e" stroke={INK} strokeWidth={6} />
    <rect x={380} y={base - 440} width={260} height={40} fill="#9aa0a8" stroke={INK} strokeWidth={4} />
    <rect x={400} y={base - 340} width={220} height={20} fill="#d9a56f" />
    {[420, 470, 520, 570].map((bx) => <ellipse key={bx} cx={bx} cy={base - 352} rx={20} ry={10} fill="#e0a25a" stroke={INK} strokeWidth={3} />)}
    {/* vitrine */}
    <rect x={60} y={base - 420} width={260} height={260} fill="#bfe6f7" stroke={INK} strokeWidth={6} />
    <rect x={60} y={base - 240} width={260} height={80} fill="#d9a56f" stroke={INK} strokeWidth={4} />
    {[100, 160, 220, 280].map((bx, i) => <circle key={bx} cx={bx} cy={base - 262} r={20} fill={["#f2c6c0", "#e0a25a", "#ffd34d", "#a86f48"][i]} stroke={INK} strokeWidth={3} />)}
    <path d={`M80,${base - 400} L150,${base - 300}`} stroke="#fff" strokeWidth={10} opacity={0.6} />
    <rect x={700} y={base - 420} width={150} height={260} fill="#bfe6f7" stroke={INK} strokeWidth={6} />
    {/* placa de oferta */}
    <g transform={`translate(720,${base - 130})`}>
      <path d="M0,0 L60,-120 L120,0" fill="none" stroke={INK} strokeWidth={6} />
      <rect x={-6} y={-130} width={132} height={110} fill="#2d3a2f" stroke={INK} strokeWidth={5} />
      <text x={60} y={-90} textAnchor="middle" fontFamily={FONT_UI} fontWeight={800} fontSize={22} fill="#fff">PÃO</text>
      <text x={60} y={-56} textAnchor="middle" fontFamily={FONT_UI} fontWeight={800} fontSize={26} fill={PAL.gold}>QUENTINHO</text>
    </g>
  </g>
);

/** Ponto de ônibus com cobertura e banco. */
export const BusStop: React.FC<{ x: number; base: number }> = ({ x, base }) => (
  <g transform={`translate(${x},0)`}>
    <rect x={-210} y={base - 330} width={12} height={330} fill="#9aa0a8" stroke={INK} strokeWidth={4} />
    <rect x={198} y={base - 330} width={12} height={330} fill="#9aa0a8" stroke={INK} strokeWidth={4} />
    <rect x={-200} y={base - 320} width={400} height={230} fill="#bfe6f7" opacity={0.45} stroke={INK} strokeWidth={4} />
    <path d={`M-250,${base - 330} L250,${base - 330} L230,${base - 370} L-230,${base - 370} Z`} fill="#2aa79b" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
    <Box3D x={-150} y={base - 110} w={300} h={18} d={20} color={PAL.wood} />
    <rect x={-130} y={base - 92} width={12} height={92} fill="#6b6570" />
    <rect x={118} y={base - 92} width={12} height={92} fill="#6b6570" />
    {/* placa */}
    <rect x={-300} y={base - 420} width={10} height={420} fill="#9aa0a8" stroke={INK} strokeWidth={4} />
    <rect x={-340} y={base - 460} width={90} height={90} rx={10} fill="#3f8fd1" stroke={INK} strokeWidth={5} />
    <path d={`M-320,${base - 430} h50 v30 h-50 Z M-316,${base - 396} a6,6 0 1,0 0.1,0 M-282,${base - 396} a6,6 0 1,0 0.1,0`} fill="#fff" />
  </g>
);

export const Street: React.FC<{
  frame: number;
  time?: TimeOfDay;
  gateOpen?: number;
  garageOpen?: number;
  /** carros passando: posições x calculadas pela cena */
  cars?: { x: number; color?: string; flip?: boolean }[];
  /** elementos entre muro e calçada (atrás dos personagens) */
  back?: React.ReactNode;
  children?: React.ReactNode;
  fg?: React.ReactNode;
  /** conteúdo da vitrine/placa de preço da padaria */
  bakeryName?: string;
}> = ({ frame, time = "day", gateOpen = 0, garageOpen = 0, cars = [], back, children, fg, bakeryName }) => {
  const base = 870; // base dos muros (fundo da calçada)
  return (
    <>
      <Layer depth={0.05}>
        <Sky time={time} frame={frame} x0={-3000} x1={6000} />
        <Sun x={1500} y={200} time={time} />
      </Layer>
      <Layer depth={0.18}>
        <Clouds frame={frame} x0={-1200} x1={3400} n={7} y={90} />
      </Layer>
      <Layer depth={0.35}>
        {/* morro com casinhas e prédios ao longe */}
        <path d="M-1200,760 Q-600,520 0,640 Q500,520 1100,620 Q1700,500 2300,640 Q2900,540 3500,700 L3500,1100 L-1200,1100 Z" fill="#9cc98a" />
        {Array.from({ length: 34 }).map((_, i) => {
          const hx = -1100 + i * 135;
          const hy = 640 + Math.sin(i * 1.3) * 50;
          const c = ["#f2c6c0", "#b9d7e6", "#f3e2c7", "#cfe3b4", "#e9c98a"][i % 5];
          return (
            <g key={i} opacity={0.85}>
              <rect x={hx} y={hy} width={90} height={70 + (i % 3) * 20} fill={c} />
              <rect x={hx + 20} y={hy + 20} width={22} height={20} fill="#6b8fa8" />
            </g>
          );
        })}
        {[2600, 2800, 3050].map((bx, i) => (
          <rect key={bx} x={bx} y={420 + i * 40} width={170} height={400} fill="#c9cfd8" opacity={0.9} />
        ))}
      </Layer>
      <Layer depth={1}>
        {/* faixa de grama/terra atrás */}
        <rect x={-1000} y={600} width={6000} height={300} fill="#b9c99a" />
        <Tree x={-140} y={base} s={1.1} frame={frame} />
        <House x={0} base={base} frame={frame} gateOpen={gateOpen} garageOpen={garageOpen} name="128" />
        <Tree x={940} y={base} s={0.9} frame={frame} color="#6fb35e" />
        <House x={1020} base={base} w={760} color={PAL.wallPink} roof="#c4673f" wallColor="#f6efe3" frame={frame} name="130" />
        <g transform={`translate(1700,${base - 250})`}>
          <Plant scale={0.8} />
        </g>
        <House x={1860} base={base} w={560} color={PAL.wallGreen} roof="#b85c3a" wallColor="#ede4d4" frame={frame} name="132" />
        <BusStop x={2700} base={base + 60} />
        <Tree x={3000} y={base} s={1.05} frame={frame} />
        <BakeryFront x={3120} base={base} frame={frame} name={bakeryName} />
        <PowerPole x={960} y={base + 40} wireTo={2440} frame={frame} />
        <PowerPole x={2440} y={base + 40} wireTo={4140} frame={frame} />
        <PowerPole x={4140} y={base + 40} frame={frame} />
        {back}
        {/* calçada */}
        <rect x={-1000} y={base} width={6000} height={STREET_ROAD - base} fill={PAL.sidewalk} />
        {Array.from({ length: 70 }).map((_, i) => (
          <line key={i} x1={-1000 + i * 90} y1={base} x2={-1000 + i * 90 - 20} y2={STREET_ROAD} stroke={shade(PAL.sidewalk, 0.88)} strokeWidth={3} />
        ))}
        <line x1={-1000} y1={base} x2={5000} y2={base} stroke={INK} strokeWidth={5} />
        {/* meio-fio + asfalto */}
        <rect x={-1000} y={STREET_ROAD} width={6000} height={22} fill="#bdb6ad" stroke={INK} strokeWidth={4} />
        <rect x={-1000} y={STREET_ROAD + 22} width={6000} height={500} fill={PAL.asphalt} />
        {Array.from({ length: 40 }).map((_, i) => (
          <rect key={i} x={-1000 + i * 160} y={STREET_ROAD + 140} width={90} height={12} fill="#f2e3b3" opacity={0.8} />
        ))}
        {cars.map((c, i) => (
          <g key={i} transform={`translate(${c.x},${STREET_ROAD + 100})`}>
            <Car color={c.color} flip={c.flip} wheelRot={c.x * 0.6} />
          </g>
        ))}
        {children}
      </Layer>
      {fg && <Layer depth={1.3}>{fg}</Layer>}
      <Grade time={time} vignette={0.3} />
    </>
  );
};
