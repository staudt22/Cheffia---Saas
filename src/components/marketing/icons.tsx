import type { SVGProps } from "react";

/**
 * CheffeData's own duotone icon set for marketing surfaces. Stroke uses currentColor,
 * the soft fill uses the same colour at low opacity, so they follow the brand.
 */
type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p });
const soft = { fill: "currentColor", fillOpacity: 0.16, stroke: "none" };

export function IconOrders(p: P) {
  return <svg {...base(p)}><path {...soft} d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9.5 7.5v3.2a1.3 1.3 0 0 0 2.6 0V7.5M10.8 11.5V15M14.5 7.5c1 .4 1.4 1.6 1.4 2.8 0 1-.5 1.6-1.4 1.8V15" /></svg>;
}
export function IconKitchen(p: P) {
  return <svg {...base(p)}><path {...soft} d="M4 11h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M4 11h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 13h3M8 4c-.8 1 .8 2 0 3.2M11.5 4c-.8 1 .8 2 0 3.2M15 4c-.8 1 .8 2 0 3.2" /></svg>;
}
export function IconMoney(p: P) {
  return <svg {...base(p)}><ellipse {...soft} cx="9" cy="16" rx="6" ry="3" /><ellipse cx="9" cy="16" rx="6" ry="3" /><path d="M3 12c0 1.7 2.7 3 6 3s6-1.3 6-3M3 8c0 1.7 2.7 3 6 3 1 0 2-.1 2.8-.4M3 8c0-1.7 2.7-3 6-3M15 9l3-3 3 3M18 6v8" /></svg>;
}
export function IconStock(p: P) {
  return <svg {...base(p)}><path {...soft} d="M3 8l9-4 9 4v9l-9 4-9-4z" /><path d="M3 8l9-4 9 4v9l-9 4-9-4zM3 8l9 4 9-4M12 12v9M7.5 6l9 4" /></svg>;
}
export function IconTeam(p: P) {
  return <svg {...base(p)}><rect {...soft} x="5" y="3" width="14" height="18" rx="3" /><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M10 3v2h4V3" /><circle cx="12" cy="11" r="2.2" /><path d="M8.5 17c.6-1.8 2-2.6 3.5-2.6s2.9.8 3.5 2.6" /></svg>;
}
export function IconTab(p: P) {
  return <svg {...base(p)}><rect {...soft} x="3" y="4" width="18" height="16" rx="2.5" /><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M7 9h6M7 12.5h10M7 16h4M17 8.2v1.6" /></svg>;
}
export function IconClock(p: P) {
  return <svg {...base(p)}><circle {...soft} cx="12" cy="13" r="8" /><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 1.5M9.5 2.5h5M19 5l1.5 1.5" /></svg>;
}
export function IconLink(p: P) {
  return <svg {...base(p)}><circle {...soft} cx="12" cy="12" r="3.5" /><circle cx="12" cy="12" r="3.5" /><circle cx="4.5" cy="6" r="2" /><circle cx="19.5" cy="6" r="2" /><circle cx="12" cy="20.5" r="2" /><path d="M6.3 7.2l2.8 2.4M17.7 7.2l-2.8 2.4M12 15.5v3" /></svg>;
}
export function IconCheckDone(p: P) {
  return <svg {...base(p)}><circle {...soft} cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="9" /><path d="M8 12.3l2.7 2.7L16.2 9.5" /></svg>;
}
export function IconPhoneOrder(p: P) {
  return <svg {...base(p)}><rect {...soft} x="6" y="2.5" width="12" height="19" rx="2.5" /><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M10.5 18.5h3M9 8h6l-.8 4.5H9.8zM10 14.5h4" /></svg>;
}
export function IconChart(p: P) {
  return <svg {...base(p)}><path {...soft} d="M3 20V14l5-4 4 3 8-7v14z" /><path d="M3 20h18M3 14l5-4 4 3 8-7" /><path d="M16 6h4v4" /></svg>;
}
