/** Tiny inline trend line. Pure SVG — no axes, no interaction needed. */
export function Sparkline({ values, className, color = "var(--brand)" }: { values: number[]; className?: string; color?: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return <div className={className} aria-hidden />;
  const w = 100, h = 28, pad = 2;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (w - pad * 2), h - pad - ((v - min) / span) * (h - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)![0].toFixed(1)},${h} L${pts[0]![0].toFixed(1)},${h} Z`;
  const id = `sg-${Math.abs(values.reduce((s, v, i) => s + v * (i + 1), 0)).toString(36).slice(0, 8)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
