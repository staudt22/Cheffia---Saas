import { addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";

export const RANGE_PRESETS = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "month", label: "Este mês" },
  { key: "prev_month", label: "Mês passado" },
] as const;

export type RangeKey = (typeof RANGE_PRESETS)[number]["key"] | "custom";

export interface DateRange {
  key: RangeKey;
  label: string;
  from: string; // yyyy-MM-dd (restaurant local)
  to: string;
  prevFrom: string;
  prevTo: string;
  days: number;
}

/** Today's date in the restaurant's time zone, as yyyy-MM-dd. */
export function todayIn(timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return format(new Date(), "yyyy-MM-dd");
  }
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const isIsoDate = (v?: string) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(parseISO(v).getTime()));

export function resolveRange(timeZone: string, key?: string, customFrom?: string, customTo?: string): DateRange {
  const today = parseISO(todayIn(timeZone));
  let from: Date;
  let to: Date = today;
  let label: string;
  let k = (key ?? "30d") as RangeKey;

  switch (k) {
    case "today":
      from = today; label = "Hoje"; break;
    case "yesterday":
      from = addDays(today, -1); to = from; label = "Ontem"; break;
    case "7d":
      from = addDays(today, -6); label = "Últimos 7 dias"; break;
    case "month":
      from = startOfMonth(today); label = "Este mês"; break;
    case "prev_month":
      from = startOfMonth(subMonths(today, 1)); to = endOfMonth(from); label = "Mês passado"; break;
    case "custom":
      if (isIsoDate(customFrom) && isIsoDate(customTo) && customFrom! <= customTo!) {
        from = parseISO(customFrom!); to = parseISO(customTo!);
        if (differenceInCalendarDays(to, from) > 366) from = addDays(to, -366);
        label = `${format(from, "dd/MM")} – ${format(to, "dd/MM/yyyy")}`;
        break;
      }
      k = "30d";
      from = addDays(today, -29); label = "Últimos 30 dias"; break;
    default:
      k = "30d";
      from = addDays(today, -29); label = "Últimos 30 dias";
  }

  const days = differenceInCalendarDays(to, from) + 1;
  let prevFrom: Date, prevTo: Date;
  if (k === "month") {
    prevFrom = startOfMonth(subMonths(from, 1));
    prevTo = addDays(prevFrom, days - 1);
  } else if (k === "prev_month") {
    prevFrom = startOfMonth(subMonths(from, 1));
    prevTo = endOfMonth(prevFrom);
  } else {
    prevTo = addDays(from, -1);
    prevFrom = addDays(prevTo, -(days - 1));
  }
  return { key: k, label, from: iso(from), to: iso(to), prevFrom: iso(prevFrom), prevTo: iso(prevTo), days };
}

export function greeting(timeZone: string) {
  let hour = new Date().getHours();
  try {
    hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(new Date())) % 24;
  } catch {}
  return hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
}

export function formatDate(value: string | Date, locale = "pt-BR", timeZone?: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  const d = typeof value === "string" ? (value.length === 10 ? parseISO(value) : new Date(value)) : value;
  // Date-only strings are calendar dates: don't shift them by time zone.
  const tz = typeof value === "string" && value.length === 10 ? undefined : timeZone;
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: tz }).format(d);
}

export function formatTime(value: string | Date, locale = "pt-BR", timeZone?: string) {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(value));
}

export function minutesSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
}

/** ISO timestamp for `hours` ago (server-side helper). */
export function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}

/** Offset (ms) of a time zone at a given instant: local wall time minus UTC. */
function tzOffsetMs(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!, +parts.second!);
  return asUtc - at.getTime();
}

/** Converts a wall-clock time in the restaurant's time zone ("yyyy-MM-ddTHH:mm") to a UTC Date. */
export function zonedToUtc(local: string, timeZone: string): Date {
  const [d, t = "00:00"] = local.split("T");
  const [y, m, day] = d!.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const guess = Date.UTC(y!, m! - 1, day!, hh!, mm!);
  let result = guess - tzOffsetMs(new Date(guess), timeZone);
  result = guess - tzOffsetMs(new Date(result), timeZone);
  return new Date(result);
}

/** Formats a UTC instant as "yyyy-MM-ddTHH:mm" in the restaurant's time zone (for datetime-local inputs). */
export function utcToZonedInput(iso: string, timeZone: string) {
  const at = new Date(iso);
  return new Date(at.getTime() + tzOffsetMs(at, timeZone)).toISOString().slice(0, 16);
}

export function formatDuration(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  return h ? `${h}h${String(m % 60).padStart(2, "0")}` : `${m}min`;
}
