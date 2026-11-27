/**
 * Elementos gráficos de storytelling: notificação, tela de celular em tela cheia,
 * contador numérico, carimbo de título, barra de comparação, balão de fala.
 * Coordenadas SVG (use dentro de <Layer> ou <ScreenLayer>).
 */
import React from "react";
import { PAL, shade } from "../core/color";
import { FONT_TITLE, FONT_UI } from "../fonts";
import { clamp, pop, prog, springAt, EASE } from "../core/anim";

const INK = PAL.ink;

/** Formata número como moeda brasileira. */
export const brl = (v: number, cents = true) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

/** Notificação estilo app que "salta" no frame `at`. */
export const NotifBubble: React.FC<{ frame: number; at: number; x: number; y: number; title: string; body: string; scale?: number; color?: string; out?: number }> = ({
  frame, at, x, y, title, body, scale = 1, color = PAL.money, out,
}) => {
  const s = pop(frame, at) * (out !== undefined ? 1 - prog(frame, out, out + 8, "in") : 1);
  if (s <= 0.001) return null;
  return (
    <g transform={`translate(${x},${y}) scale(${s * scale})`}>
      <rect x={-230} y={-60} width={460} height={120} rx={28} fill="#fffdf8" stroke={INK} strokeWidth={6} />
      <rect x={-210} y={-40} width={80} height={80} rx={20} fill={color} stroke={INK} strokeWidth={5} />
      <text x={-170} y={16} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={50} fill="#fff">$</text>
      <text x={-112} y={-8} fontFamily={FONT_UI} fontWeight={800} fontSize={30} fill={INK}>{title}</text>
      <text x={-112} y={34} fontFamily={FONT_UI} fontWeight={800} fontSize={34} fill={shade(color, 0.7)}>{body}</text>
    </g>
  );
};

/** Celular grande em tela cheia com app de banco fictício ("Banco Bairro"). */
export const PhoneScreen: React.FC<{
  frame: number;
  balance: number;
  notifAt?: number;
  notifText?: string;
  highlight?: number; // 0..1 brilho verde no saldo
  x?: number;
  y?: number;
  tilt?: number;
  scale?: number;
}> = ({ frame, balance, notifAt = -1, notifText = "Pix recebido", highlight = 0, x = 960, y = 560, tilt = 0, scale = 1 }) => (
  <g transform={`translate(${x},${y}) rotate(${tilt}) scale(${scale})`}>
    <rect x={-330} y={-560} width={660} height={1220} rx={80} fill="#2d2a38" stroke={INK} strokeWidth={10} />
    <rect x={-300} y={-520} width={600} height={1140} rx={56} fill="#f6f3ee" />
    <rect x={-80} y={-540} width={160} height={30} rx={15} fill="#2d2a38" />
    {/* cabeçalho do app */}
    <path d="M-300,-464 Q-300,-520 -244,-520 L244,-520 Q300,-520 300,-464 L300,-260 L-300,-260 Z" fill={PAL.teal} />
    <text x={-250} y={-430} fontFamily={FONT_UI} fontWeight={800} fontSize={30} fill="#fff">09:14</text>
    <text x={-250} y={-350} fontFamily={FONT_TITLE} fontWeight={700} fontSize={46} fill="#fff">Banco Bairro</text>
    <text x={-250} y={-300} fontFamily={FONT_UI} fontWeight={600} fontSize={28} fill="#d8f3ef">Olá! Seu saldo:</text>
    <rect x={-260} y={-220} width={520} height={190} rx={28} fill="#fff" stroke={highlight > 0 ? PAL.money : "#e0dbd2"} strokeWidth={4 + highlight * 6} />
    {highlight > 0 && <rect x={-260} y={-220} width={520} height={190} rx={28} fill={PAL.money} opacity={0.15 * highlight} />}
    <text x={0} y={-140} textAnchor="middle" fontFamily={FONT_UI} fontWeight={600} fontSize={28} fill="#8a8494">Conta corrente</text>
    <text x={0} y={-72} textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={balance >= 1e6 ? 60 : 72} fill={INK}>{brl(balance)}</text>
    {/* atalhos */}
    {["Pix", "Pagar", "Transferir", "Cartão"].map((l, i) => (
      <g key={l} transform={`translate(${-210 + i * 140},60)`}>
        <circle r={46} fill="#e8f6f4" stroke={PAL.teal} strokeWidth={4} />
        <text y={86} textAnchor="middle" fontFamily={FONT_UI} fontWeight={600} fontSize={22} fill="#5a5466">{l}</text>
      </g>
    ))}
    {/* extrato */}
    {[["Padaria Estrela", "- R$ 6,40"], ["Conta de luz", "- R$ 187,90"], ["Mercadinho", "- R$ 52,17"]].map(([a, b], i) => (
      <g key={a} transform={`translate(0,${240 + i * 90})`}>
        <line x1={-260} y1={-50} x2={260} y2={-50} stroke="#e0dbd2" strokeWidth={3} />
        <text x={-260} y={0} fontFamily={FONT_UI} fontWeight={600} fontSize={28} fill="#5a5466">{a}</text>
        <text x={260} y={0} textAnchor="end" fontFamily={FONT_UI} fontWeight={800} fontSize={28} fill="#c4452f">{b}</text>
      </g>
    ))}
    {notifAt >= 0 && (
      <g transform={`translate(0, ${-480 + 140 * EASE.backOut(clamp((frame - notifAt) / 10))})`} opacity={frame >= notifAt ? 1 : 0}>
        <NotifBubble frame={frame} at={notifAt} x={0} y={0} title={notifText} body={brl(1_000_000)} scale={1.1} />
      </g>
    )}
  </g>
);

/** Número que conta até `to` (ease out). */
export const Counter: React.FC<{ frame: number; from?: number; to: number; f0: number; f1: number; x: number; y: number; size?: number; fmt?: (v: number) => string; color?: string; anchor?: "start" | "middle" | "end" }> = ({
  frame, from = 0, to, f0, f1, x, y, size = 120, fmt = (v) => Math.round(v).toLocaleString("pt-BR"), color = PAL.white, anchor = "middle",
}) => {
  const v = from + (to - from) * prog(frame, f0, f1, "out");
  const s = 1 + 0.06 * Math.sin(clamp((frame - f1) / 8) * Math.PI);
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <text textAnchor={anchor} fontFamily={FONT_TITLE} fontWeight={700} fontSize={size} fill={INK} stroke={INK} strokeWidth={size * 0.12} strokeLinejoin="round" paintOrder="stroke">{fmt(v)}</text>
      <text textAnchor={anchor} fontFamily={FONT_TITLE} fontWeight={700} fontSize={size} fill={color}>{fmt(v)}</text>
    </g>
  );
};

/** Texto-carimbo que bate na tela (palavra-chave do roteiro). */
export const Stamp: React.FC<{ frame: number; at: number; x: number; y: number; text: string; size?: number; color?: string; rot?: number; bg?: string }> = ({
  frame, at, x, y, text, size = 140, color = PAL.gold, rot = -4, bg,
}) => {
  if (frame < at) return null;
  const p = springAt(frame, at, { stiffness: 260, damping: 15 });
  const sc = 2.2 - 1.2 * p;
  const w = text.length * size * 0.56 + 80;
  return (
    <g transform={`translate(${x},${y}) rotate(${rot}) scale(${sc})`} opacity={clamp((frame - at) / 3)}>
      {bg && <rect x={-w / 2} y={-size * 0.85} width={w} height={size * 1.2} rx={24} fill={bg} stroke={INK} strokeWidth={8} />}
      <text textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={size} fill={INK} stroke={INK} strokeWidth={size * 0.14} strokeLinejoin="round" y={0}>{text}</text>
      <text textAnchor="middle" fontFamily={FONT_TITLE} fontWeight={700} fontSize={size} fill={color} y={0}>{text}</text>
    </g>
  );
};

/** Barra horizontal de comparação com rótulo, cresce com mola. */
export const CompareBar: React.FC<{ frame: number; at: number; x: number; y: number; w: number; h?: number; color: string; label: string; value: string; maxW?: number }> = ({
  frame, at, x, y, w, h = 90, color, label, value,
}) => {
  const p = clamp(springAt(frame, at, { stiffness: 90, damping: 14 }), 0, 1.15);
  return (
    <g opacity={clamp((frame - at + 4) / 6)}>
      <text x={x} y={y - 18} fontFamily={FONT_UI} fontWeight={800} fontSize={40} fill="#fff">{label}</text>
      <rect x={x} y={y} width={Math.max(h * 0.3, w * p)} height={h} rx={h / 3} fill={color} stroke={INK} strokeWidth={6} />
      <rect x={x + 10} y={y + 10} width={Math.max(0, w * p - 20)} height={h * 0.25} rx={h / 8} fill="#fff" opacity={0.3} />
      <text x={x + Math.max(h * 0.3, w * p) + 24} y={y + h * 0.68} fontFamily={FONT_TITLE} fontWeight={700} fontSize={56} fill="#fff" stroke={INK} strokeWidth={8} paintOrder="stroke">{value}</text>
    </g>
  );
};

/** Balão de fala (para diálogos curtos visíveis). Ponta aponta para (tx, ty). */
export const SpeechBubble: React.FC<{ frame: number; at: number; until?: number; x: number; y: number; tx: number; ty: number; text: string; w?: number; size?: number }> = ({
  frame, at, until, x, y, tx, ty, text, w = 520, size = 40,
}) => {
  const s = pop(frame, at) * (until ? 1 - prog(frame, until, until + 6, "in") : 1);
  if (s <= 0.001) return null;
  const lines = wrap(text, Math.floor(w / (size * 0.52)));
  const h = lines.length * size * 1.2 + 50;
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d={`M${-30},${h / 2 - 10} L${tx - x},${ty - y} L${30},${h / 2 - 10} Z`} fill="#fff" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={40} fill="#fff" stroke={INK} strokeWidth={6} />
      <path d={`M${-26},${h / 2 - 4} L${26},${h / 2 - 4}`} stroke="#fff" strokeWidth={10} />
      {lines.map((l, i) => (
        <text key={i} x={0} y={-h / 2 + 25 + size * (i + 0.95) * 1.2 - size * 0.2} textAnchor="middle" fontFamily={FONT_UI} fontWeight={800} fontSize={size} fill={INK}>{l}</text>
      ))}
    </g>
  );
};

const wrap = (t: string, n: number) => {
  const out: string[] = [];
  let cur = "";
  for (const w of t.split(" ")) {
    if ((cur + " " + w).trim().length > n && cur) {
      out.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  return out;
};

/** Linhas de impacto/velocidade em volta de um ponto (ênfase de reação). */
export const ImpactLines: React.FC<{ frame: number; at: number; x: number; y: number; r?: number; n?: number; color?: string }> = ({ frame, at, x, y, r = 260, n = 14, color = INK }) => {
  const p = clamp((frame - at) / 10);
  if (p <= 0 || p >= 1) return null;
  return (
    <g opacity={1 - p}>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        const r0 = r * (0.6 + p * 0.5);
        const r1 = r0 + 60 + (i % 3) * 30;
        return <line key={i} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * r1} y2={y + Math.sin(a) * r1} stroke={color} strokeWidth={10} strokeLinecap="round" />;
      })}
    </g>
  );
};

/** Confete colorido explodindo de um ponto. */
export const Confetti: React.FC<{ frame: number; at: number; x: number; y: number; n?: number }> = ({ frame, at, x, y, n = 40 }) => {
  const t = frame - at;
  if (t < 0 || t > 70) return null;
  const cols = [PAL.gold, PAL.red, PAL.teal, "#a684d6", PAL.money, PAL.accent];
  return (
    <g>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2 + i;
        const v = 14 + (i % 7) * 3;
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t * 0.8 + 0.5 * 0.9 * t * t;
        return <rect key={i} x={px} y={py} width={18} height={10} fill={cols[i % cols.length]} transform={`rotate(${t * 12 + i * 30}, ${px}, ${py})`} opacity={1 - t / 70} />;
      })}
    </g>
  );
};
