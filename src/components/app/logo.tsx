import { cn } from "@/lib/utils";

/*
 * CheffeData mark: a chef's toque whose body holds a rising bar chart —
 * the kitchen and the numbers in one shape.
 * Geometry is shared by the badge and the bare glyph (32×32 grid).
 */
const HAT_TOP = "M10.6 17.5a4.6 4.6 0 0 1 .9-9.1 5.4 5.4 0 0 1 9 0 4.6 4.6 0 0 1 .9 9.1z";
const HAT_BODY = "M10.6 15.5h10.8v7.3H10.6z";
const HAT_BAND = "M10.1 24.2h11.8v2.2a1.4 1.4 0 0 1-1.4 1.4h-9a1.4 1.4 0 0 1-1.4-1.4z";
const BARS = [
  { x: 12.1, y: 18.6, h: 3.4 },
  { x: 14.9, y: 16.9, h: 5.1 },
  { x: 17.7, y: 15, h: 7 },
];

function Bars({ fill }: { fill: string }) {
  return <>{BARS.map((b) => <rect key={b.x} x={b.x} y={b.y} width="2.2" height={b.h} rx="1.1" fill={fill} />)}</>;
}

/** Badge version: green gradient tile with the dark hat glyph. */
export function CheffeDataMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <defs>
        <linearGradient id="cheffedata-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#cheffedata-g)" />
      <g fill="#04140c">
        <path d={HAT_TOP} />
        <path d={HAT_BODY} />
        <path d={HAT_BAND} />
      </g>
      <Bars fill="url(#cheffedata-g)" />
    </svg>
  );
}

/** The bare glyph in currentColor; the chart bars are cut out with a mask. */
export function CheffeDataGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="8 6 16 23" className={className} aria-hidden>
      <defs>
        <mask id="cheffedata-glyph-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <Bars fill="#000" />
        </mask>
      </defs>
      <g fill="currentColor" mask="url(#cheffedata-glyph-cut)">
        <path d={HAT_TOP} />
        <path d={HAT_BODY} />
        <path d={HAT_BAND} />
      </g>
    </svg>
  );
}

export function CheffeDataLogo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <CheffeDataMark className={markClassName} />
      <span className="font-display text-[19px] font-semibold tracking-tight">Cheffe<span className="text-brand">Data</span></span>
    </span>
  );
}
