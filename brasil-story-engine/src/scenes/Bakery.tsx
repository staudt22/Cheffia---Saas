/**
 * Interior de padaria de bairro: azulejo, prateleiras de pão, balcão de vidro,
 * lousa de preços, máquina de café, geladeira de bebidas. Chão em y=940.
 * Personagem ATRÁS do balcão → `behind`; na frente → `children`.
 */
import React from "react";
import { Layer } from "../camera/Camera";
import { PAL, shade } from "../core/color";
import { Bread, Box3D } from "../props/props";
import { Grade, TimeOfDay } from "./common";
import { FONT_TITLE, FONT_UI } from "../fonts";

const INK = PAL.ink;
export const BAKERY_FLOOR = 940;
export const BAKERY_COUNTER = { x0: 560, x1: 1460, top: 700 };

export const Bakery: React.FC<{
  frame: number;
  time?: TimeOfDay;
  prices?: { item: string; price: string; highlight?: number }[];
  behind?: React.ReactNode;
  children?: React.ReactNode;
  /** objetos sobre o balcão (coordenadas de mundo) */
  onCounter?: React.ReactNode;
  fg?: React.ReactNode;
  breadCount?: number;
}> = ({ frame, time = "day", prices, behind, children, onCounter, fg, breadCount = 18 }) => {
  const F = BAKERY_FLOOR;
  const P = prices ?? [
    { item: "Pão francês", price: "R$ 0,80" },
    { item: "Pão de queijo", price: "R$ 2,50" },
    { item: "Cafezinho", price: "R$ 3,00" },
    { item: "Sonho", price: "R$ 5,00" },
  ];
  const steam = (i: number) => {
    const t = (frame + i * 20) % 60;
    return <path key={i} d={`M${1590 + i * 14},${400 - t * 1.4} q10,-14 0,-28 q-10,-14 0,-28`} fill="none" stroke="#fff" strokeWidth={5} opacity={(1 - t / 60) * 0.7} />;
  };
  return (
    <>
      <Layer depth={0.9}>
        <rect x={-600} y={-400} width={3200} height={F + 400} fill="#f6ead2" />
        {/* azulejo */}
        {Array.from({ length: 40 }).map((_, i) =>
          Array.from({ length: 6 }).map((__, j) => (
            <rect key={`${i}-${j}`} x={-600 + i * 80} y={F - 480 + j * 80} width={80} height={80} fill={(i + j) % 2 ? "#e4f0f2" : "#fff"} stroke="#c9dde0" strokeWidth={3} />
          )),
        )}
        <rect x={-600} y={F - 490} width={3200} height={16} fill="#2aa79b" stroke={INK} strokeWidth={4} />
        {/* letreiro interno */}
        <text x={960} y={110} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={70} fill="#c4452f">Padaria Estrela</text>
        {/* prateleiras de pão */}
        <g transform="translate(560,170)">
          {[0, 1, 2].map((r) => (
            <g key={r} transform={`translate(0, ${r * 110})`}>
              <rect x={0} y={80} width={900} height={18} fill={PAL.wood} stroke={INK} strokeWidth={4} />
              {Array.from({ length: Math.max(0, Math.min(9, breadCount - r * 9)) }).map((_, i) => (
                <g key={i} transform={`translate(${60 + i * 95},${62})`}>
                  <Bread scale={0.9} />
                </g>
              ))}
            </g>
          ))}
        </g>
        {/* lousa de preços */}
        <g transform="translate(40,150)">
          <rect x={0} y={0} width={440} height={400} rx={10} fill="#2d3a2f" stroke={PAL.wood} strokeWidth={16} />
          <text x={220} y={60} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={40} fill="#fff6dd">HOJE</text>
          {P.map((p, i) => (
            <g key={i} transform={`translate(30, ${120 + i * 70})`}>
              {p.highlight ? <rect x={-10} y={-40} width={400} height={56} rx={8} fill="#e5574d" opacity={p.highlight * 0.85} /> : null}
              <text x={0} y={0} fontFamily={FONT_UI} fontWeight={800} fontSize={30} fill="#fff">{p.item}</text>
              <text x={380} y={0} textAnchor="end" fontFamily={FONT_UI} fontWeight={800} fontSize={30} fill={PAL.gold}>{p.price}</text>
            </g>
          ))}
        </g>
        {/* máquina de café */}
        <g transform="translate(1540,420)">
          <Box3D x={0} y={0} w={180} h={150} d={40} color="#c9c4cf" />
          <rect x={40} y={30} width={100} height={40} rx={6} fill="#2d2a38" stroke={INK} strokeWidth={4} />
          <circle cx={70} cy={100} r={12} fill="#e5574d" stroke={INK} strokeWidth={3} />
        </g>
        {[0, 1, 2].map(steam)}
        {/* geladeira de bebidas */}
        <g transform="translate(1800,260)">
          <Box3D x={0} y={0} w={240} h={F - 260} d={40} color="#e5574d" />
          <rect x={20} y={20} width={200} height={F - 320} fill="#bfe6f7" stroke={INK} strokeWidth={4} />
          {Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 5 }).map((__, c) => (
              <rect key={`${r}${c}`} x={34 + c * 38} y={50 + r * 140} width={24} height={70} rx={8} fill={["#7cc26b", "#ffd34d", "#ff8a3d", "#4f7fbf"][(r + c) % 4]} stroke={INK} strokeWidth={3} />
            )),
          )}
        </g>
        <rect x={-600} y={F - 20} width={3200} height={20} fill="#c9c4cf" stroke={INK} strokeWidth={4} />
      </Layer>
      <Layer depth={1}>
        {/* piso quadriculado */}
        <rect x={-600} y={F} width={3200} height={500} fill={PAL.tileA} />
        {Array.from({ length: 34 }).map((_, i) =>
          Array.from({ length: 4 }).map((__, j) =>
            (i + j) % 2 ? <rect key={`${i}-${j}`} x={-600 + i * 100 + j * 30} y={F + j * 40} width={100} height={40} fill={PAL.tileB} /> : null,
          ),
        )}
        <line x1={-600} y1={F} x2={2600} y2={F} stroke={INK} strokeWidth={5} />
        {behind}
        {/* balcão de vidro */}
        <g>
          <Box3D x={BAKERY_COUNTER.x0} y={BAKERY_COUNTER.top + 130} w={BAKERY_COUNTER.x1 - BAKERY_COUNTER.x0} h={F - BAKERY_COUNTER.top - 120} d={50} color="#d9a56f" />
          <rect x={BAKERY_COUNTER.x0} y={BAKERY_COUNTER.top} width={BAKERY_COUNTER.x1 - BAKERY_COUNTER.x0} height={130} fill="#cfeef7" opacity={0.75} stroke={INK} strokeWidth={5} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <circle key={i} cx={BAKERY_COUNTER.x0 + 70 + i * 120} cy={BAKERY_COUNTER.top + 92} r={26} fill={["#f2c6c0", "#e0a25a", "#ffd34d", "#a86f48"][i % 4]} stroke={INK} strokeWidth={3} />
          ))}
          <path d={`M${BAKERY_COUNTER.x0 + 30},${BAKERY_COUNTER.top + 20} L${BAKERY_COUNTER.x0 + 120},${BAKERY_COUNTER.top + 110}`} stroke="#fff" strokeWidth={12} opacity={0.6} />
          <rect x={BAKERY_COUNTER.x0 - 10} y={BAKERY_COUNTER.top - 14} width={BAKERY_COUNTER.x1 - BAKERY_COUNTER.x0 + 20} height={16} fill={shade("#d9a56f", 1.1)} stroke={INK} strokeWidth={4} />
          {/* caixa registradora */}
          <g transform={`translate(${BAKERY_COUNTER.x1 - 170},${BAKERY_COUNTER.top - 14})`}>
            <path d="M0,0 L130,0 L120,-80 L10,-80 Z" fill="#6f7f8f" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
            <rect x={30} y={-120} width={70} height={40} fill="#2d2a38" stroke={INK} strokeWidth={4} />
            <rect x={38} y={-112} width={54} height={22} fill="#7cf0a8" />
          </g>
        </g>
        {onCounter}
        {children}
      </Layer>
      {fg && <Layer depth={1.3}>{fg}</Layer>}
      <Grade time={time} vignette={0.32} tint="#ffd9a0" tintAmount={0.06} />
    </>
  );
};
