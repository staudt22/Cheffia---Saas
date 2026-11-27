/**
 * Objetos reutilizáveis. Convenção: (0,0) é o ponto de apoio (chão ou palma da mão).
 * Todos usam contorno PAL.ink e uma face de sombra para volume.
 */
import React from "react";
import { PAL, shade } from "../core/color";
import { FONT_TITLE, FONT_UI } from "../fonts";

const INK = PAL.ink;
const S = 5;

/** Celular segurado na mão (palma = 0,0). `screen` desenha no espaço 0..100 x 0..180. */
export const Phone: React.FC<{ scale?: number; screen?: React.ReactNode; glow?: number; tilt?: number; buzz?: number }> = ({
  scale = 1, screen, glow = 0, tilt = 0, buzz = 0,
}) => (
  <g transform={`rotate(${tilt + buzz * 6}) scale(${scale}) translate(-22,-62)`}>
    {glow > 0 && <rect x={-20} y={-20} width={84} height={124} rx={24} fill="#bff3ff" opacity={glow * 0.5} />}
    <rect x={0} y={0} width={44} height={84} rx={8} fill="#2d2a38" stroke={INK} strokeWidth={4} />
    <rect x={4} y={7} width={36} height={68} rx={3} fill={glow > 0 ? "#e8fbff" : "#3d4a66"} />
    <g transform="translate(4,7) scale(0.36,0.378)">{screen}</g>
  </g>
);

/** Tela de app de banco (para close do celular em tela cheia, use <PhoneScreenUI>). */
export const BankNotif: React.FC<{ amount: string; label?: string; w?: number }> = ({ amount, label = "Pix recebido", w = 100 }) => (
  <g>
    <rect x={4} y={20} width={w - 8} height={40} rx={8} fill="#fff" stroke={PAL.moneyDark} strokeWidth={3} />
    <circle cx={16} cy={40} r={7} fill={PAL.money} />
    <text x={28} y={36} fontFamily={FONT_UI} fontWeight={800} fontSize={9} fill={INK}>{label}</text>
    <text x={28} y={50} fontFamily={FONT_UI} fontWeight={800} fontSize={11} fill={PAL.moneyDark}>{amount}</text>
  </g>
);

/** Pão francês (unidade). */
export const Bread: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <g transform={`scale(${scale})`}>
    <ellipse cx={0} cy={0} rx={34} ry={17} fill="#e0a25a" stroke={INK} strokeWidth={4} />
    <ellipse cx={-4} cy={-5} rx={24} ry={8} fill="#f0c27e" />
    <path d="M-14,-12 Q-4,0 6,-12" fill="none" stroke="#b9783a" strokeWidth={4} strokeLinecap="round" />
    <path d="M6,-10 Q14,-2 22,-10" fill="none" stroke="#b9783a" strokeWidth={3.5} strokeLinecap="round" />
  </g>
);

/** Saco de pão de papel. */
export const BreadBag: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <g transform={`scale(${scale}) translate(-30,-10)`}>
    <path d="M0,0 L60,0 L56,80 L4,80 Z" fill="#e9d4ae" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
    <path d="M0,0 L60,0 L56,80 L40,80 L44,0 Z" fill="#d9bf92" />
    <path d="M0,0 L60,0 L56,80 L4,80 Z" fill="none" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
    <ellipse cx={20} cy={-4} rx={18} ry={9} fill="#e0a25a" stroke={INK} strokeWidth={3} />
    <ellipse cx={40} cy={-6} rx={16} ry={9} fill="#e8ad62" stroke={INK} strokeWidth={3} />
  </g>
);

/** Nota de dinheiro estilizada (não reproduz cédula real). */
export const Bill: React.FC<{ scale?: number; rot?: number; value?: string }> = ({ scale = 1, rot = 0, value = "100" }) => (
  <g transform={`rotate(${rot}) scale(${scale}) translate(-40,-20)`}>
    <rect width={80} height={40} rx={4} fill={PAL.money} stroke={INK} strokeWidth={3.5} />
    <rect x={6} y={6} width={68} height={28} rx={3} fill="none" stroke={PAL.moneyDark} strokeWidth={2.5} />
    <circle cx={40} cy={20} r={9} fill={shade(PAL.money, 1.25)} stroke={PAL.moneyDark} strokeWidth={2} />
    <text x={12} y={18} fontFamily={FONT_TITLE} fontWeight={700} fontSize={10} fill={PAL.moneyDark}>{value}</text>
  </g>
);

/** Pilha/maço de dinheiro com volume. */
export const MoneyStack: React.FC<{ scale?: number; layers?: number }> = ({ scale = 1, layers = 5 }) => (
  <g transform={`scale(${scale})`}>
    {Array.from({ length: layers }).map((_, i) => (
      <g key={i} transform={`translate(0, ${-i * 9})`}>
        <path d="M-60,0 L60,0 L60,10 L-60,10 Z" fill={PAL.moneyDark} stroke={INK} strokeWidth={3} />
        <path d="M-60,-14 L60,-14 L60,0 L-60,0 Z" fill={PAL.money} stroke={INK} strokeWidth={3} />
      </g>
    ))}
    <rect x={-14} y={-layers * 9 - 14} width={28} height={layers * 9 + 24} fill="#f2e3b3" stroke={INK} strokeWidth={3} />
  </g>
);

/** Etiqueta de preço que pode trocar de valor (anime `price`). */
export const PriceTag: React.FC<{ price: string; scale?: number; color?: string; swing?: number }> = ({ price, scale = 1, color = PAL.gold, swing = 0 }) => (
  <g transform={`scale(${scale}) rotate(${swing})`}>
    <line x1={0} y1={-60} x2={0} y2={-30} stroke={INK} strokeWidth={3} />
    <path d="M-90,-30 L70,-30 L100,10 L70,50 L-90,50 Z" fill={color} stroke={INK} strokeWidth={S} strokeLinejoin="round" />
    <circle cx={74} cy={10} r={7} fill={PAL.white} stroke={INK} strokeWidth={3} />
    <text x={-10} y={26} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={44} fill={INK}>{price}</text>
  </g>
);

export const Box3D: React.FC<{ x: number; y: number; w: number; h: number; d?: number; color: string; stroke?: boolean }> = ({ x, y, w, h, d = 30, color, stroke = true }) => (
  <g stroke={stroke ? INK : "none"} strokeWidth={4} strokeLinejoin="round">
    <path d={`M${x},${y} L${x + d * 0.6},${y - d * 0.5} L${x + w + d * 0.6},${y - d * 0.5} L${x + w},${y} Z`} fill={shade(color, 1.15)} />
    <path d={`M${x + w},${y} L${x + w + d * 0.6},${y - d * 0.5} L${x + w + d * 0.6},${y + h - d * 0.5} L${x + w},${y + h} Z`} fill={shade(color, 0.78)} />
    <rect x={x} y={y} width={w} height={h} fill={color} />
  </g>
);

/** Cama de solteiro vista de lado (0,0 = canto inferior esquerdo no chão). */
export const Bed: React.FC<{ blanket?: string; blanketFold?: number }> = ({ blanket = "#5e8fd6", blanketFold = 0 }) => (
  <g>
    <rect x={0} y={-150} width={26} height={150} rx={6} fill={PAL.wood} stroke={INK} strokeWidth={S} />
    <rect x={20} y={-80} width={520} height={50} fill={PAL.woodDark} stroke={INK} strokeWidth={S} />
    <rect x={16} y={-30} width={18} height={30} fill={PAL.woodDark} stroke={INK} strokeWidth={4} />
    <rect x={510} y={-30} width={18} height={30} fill={PAL.woodDark} stroke={INK} strokeWidth={4} />
    <rect x={26} y={-118} width={510} height={42} rx={14} fill="#f7f1e6" stroke={INK} strokeWidth={S} />
    <path d="M40,-122 C40,-158 140,-160 150,-124 Z" fill="#fffaf2" stroke={INK} strokeWidth={S} />
    <path d={`M${170 + blanketFold * 200},-124 L536,-124 L540,-60 L${168 + blanketFold * 200},-60 Z`} fill={blanket} stroke={INK} strokeWidth={S} strokeLinejoin="round" />
    {[0, 1, 2, 3].map((i) => (
      <path key={i} d={`M${200 + blanketFold * 200 + i * 80},-124 L${190 + blanketFold * 200 + i * 80},-60`} stroke={shade(blanket, 0.8)} strokeWidth={8} opacity={0.6} />
    ))}
  </g>
);

export const Nightstand: React.FC<{ lampOn?: number }> = ({ lampOn = 0 }) => (
  <g>
    <Box3D x={0} y={-110} w={110} h={110} d={36} color={PAL.wood} />
    <rect x={14} y={-70} width={82} height={6} fill={PAL.woodDark} />
    <circle cx={55} cy={-40} r={6} fill={PAL.gold} stroke={INK} strokeWidth={3} />
    <rect x={34} y={-140} width={14} height={30} fill="#d9cfc1" stroke={INK} strokeWidth={4} />
    <path d="M10,-140 L72,-140 L60,-190 L22,-190 Z" fill={lampOn ? "#ffe9a8" : "#f2d6a2"} stroke={INK} strokeWidth={S} strokeLinejoin="round" />
    {lampOn > 0 && <ellipse cx={41} cy={-150} rx={110} ry={90} fill="#ffe9a8" opacity={0.25 * lampOn} />}
  </g>
);

export const Chair: React.FC<{ color?: string }> = ({ color = PAL.wood }) => (
  <g stroke={INK} strokeWidth={S} strokeLinejoin="round">
    <rect x={-60} y={-200} width={18} height={200} fill={shade(color, 0.85)} />
    <rect x={-60} y={-100} width={120} height={18} fill={color} />
    <rect x={44} y={-90} width={16} height={90} fill={shade(color, 0.85)} />
    <rect x={-56} y={-90} width={16} height={90} fill={shade(color, 0.85)} />
  </g>
);

/** Carro popular (hatch). (0,0) = centro no chão. */
export const Car: React.FC<{ color?: string; wheelRot?: number; flip?: boolean }> = ({ color = "#e5574d", wheelRot = 0, flip }) => (
  <g transform={flip ? "scale(-1,1)" : undefined}>
    <ellipse cx={0} cy={4} rx={220} ry={14} fill="#1a1020" opacity={0.18} />
    <path d="M-200,-40 L-200,-90 Q-196,-110 -170,-112 L-110,-116 L-60,-176 Q-50,-186 -30,-186 L90,-186 Q110,-186 126,-170 L176,-116 L196,-108 Q212,-100 212,-70 L212,-40 Z" fill={color} stroke={INK} strokeWidth={S} strokeLinejoin="round" />
    <path d="M-96,-118 L-54,-166 L20,-166 L20,-118 Z" fill="#bfe6f7" stroke={INK} strokeWidth={4} />
    <path d="M34,-118 L34,-166 L92,-166 Q104,-166 114,-154 L144,-118 Z" fill="#bfe6f7" stroke={INK} strokeWidth={4} />
    <path d="M-200,-70 L212,-70" stroke={shade(color, 0.75)} strokeWidth={6} />
    <rect x={186} y={-100} width={22} height={14} rx={4} fill="#fff6c8" stroke={INK} strokeWidth={3} />
    <rect x={-200} y={-100} width={14} height={14} rx={3} fill="#ff6b5a" stroke={INK} strokeWidth={3} />
    {[-120, 130].map((wx) => (
      <g key={wx} transform={`translate(${wx},-34) rotate(${wheelRot})`}>
        <circle r={38} fill="#2d2a38" stroke={INK} strokeWidth={S} />
        <circle r={18} fill="#c9c4cf" stroke={INK} strokeWidth={3} />
        <line x1={-18} y1={0} x2={18} y2={0} stroke={INK} strokeWidth={3} />
      </g>
    ))}
  </g>
);

/** Ônibus urbano. (0,0) = centro no chão. */
export const Bus: React.FC<{ color?: string; wheelRot?: number; line?: string }> = ({ color = "#2aa79b", wheelRot = 0, line = "407 · CENTRO" }) => (
  <g>
    <ellipse cx={0} cy={4} rx={420} ry={16} fill="#1a1020" opacity={0.18} />
    <rect x={-400} y={-300} width={800} height={260} rx={30} fill={color} stroke={INK} strokeWidth={S} />
    <rect x={-400} y={-120} width={800} height={30} fill={shade(color, 0.75)} />
    {[-360, -240, -120, 0, 120, 240].map((wx) => (
      <rect key={wx} x={wx} y={-270} width={100} height={110} rx={8} fill="#bfe6f7" stroke={INK} strokeWidth={4} />
    ))}
    <rect x={300} y={-270} width={80} height={220} rx={6} fill="#9fcfe2" stroke={INK} strokeWidth={4} />
    <rect x={-250} y={-330} width={500} height={34} rx={8} fill="#2d2a38" stroke={INK} strokeWidth={4} />
    <text x={0} y={-304} textAnchor="middle" fontFamily={FONT_UI} fontWeight={800} fontSize={24} fill="#ffcf4d">{line}</text>
    {[-260, 260].map((wx) => (
      <g key={wx} transform={`translate(${wx},-40) rotate(${wheelRot})`}>
        <circle r={44} fill="#2d2a38" stroke={INK} strokeWidth={S} />
        <circle r={20} fill="#c9c4cf" stroke={INK} strokeWidth={3} />
        <line x1={-20} y1={0} x2={20} y2={0} stroke={INK} strokeWidth={3} />
      </g>
    ))}
  </g>
);

export const Mug: React.FC<{ color?: string }> = ({ color = "#e5574d" }) => (
  <g transform="translate(-16,-36)">
    <path d="M32,8 Q48,8 48,20 Q48,32 32,32" fill="none" stroke={INK} strokeWidth={5} />
    <rect width={34} height={38} rx={5} fill={color} stroke={INK} strokeWidth={4} />
  </g>
);

export const Plant: React.FC<{ scale?: number }> = ({ scale = 1 }) => (
  <g transform={`scale(${scale})`}>
    {[-40, -15, 10, 35].map((a, i) => (
      <path key={i} d={`M0,-60 Q${a},-130 ${a * 1.6},-150 Q${a * 0.6},-110 0,-60`} fill={i % 2 ? PAL.grass : PAL.grassDark} stroke={INK} strokeWidth={4} />
    ))}
    <path d="M-36,-64 L36,-64 L28,0 L-28,0 Z" fill="#d97a4a" stroke={INK} strokeWidth={S} strokeLinejoin="round" />
  </g>
);

/** Partícula de dinheiro caindo (use dentro de <MoneyRain>). */
export const MoneyRain: React.FC<{ frame: number; count?: number; w?: number; h?: number; start?: number; seed?: number }> = ({
  frame, count = 30, w = 1920, h = 1080, start = 0, seed = 1,
}) => {
  if (frame < start) return null;
  const t = frame - start;
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => {
        const r1 = ((Math.sin(i * 91.7 + seed) * 10000) % 1 + 1) % 1;
        const r2 = ((Math.sin(i * 47.3 + seed * 3) * 10000) % 1 + 1) % 1;
        const x = r1 * w + Math.sin((t + i * 10) / 14) * 40;
        const y = -80 + ((t * (4 + r2 * 4) + r2 * h * 1.2) % (h + 160));
        return <g key={i} transform={`translate(${x},${y})`}><Bill scale={0.9 + r2 * 0.6} rot={Math.sin((t + i * 7) / 9) * 40} value="" /></g>;
      })}
    </g>
  );
};
