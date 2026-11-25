import { addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";

export const RANGE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "prev_month", label: "Previous month" },
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
      from = today; label = "Today"; break;
    case "yesterday":
      from = addDays(today, -1); to = from; label = "Yesterday"; break;
    case "7d":
      from = addDays(today, -6); label = "Last 7 days"; break;
    case "month":
      from = startOfMonth(today); label = "This month"; break;
    case "prev_month":
      from = startOfMonth(subMonths(today, 1)); to = endOfMonth(from); label = "Previous month"; break;
    case "custom":
      if (isIsoDate(customFrom) && isIsoDate(customTo) && customFrom! <= customTo!) {
        from = parseISO(customFrom!); to = parseISO(customTo!);
        if (differenceInCalendarDays(to, from) > 366) from = addDays(to, -366);
        label = `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
        break;
      }
      k = "30d";
      from = addDays(today, -29); label = "Last 30 days"; break;
    default:
      k = "30d";
      from = addDays(today, -29); label = "Last 30 days";
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
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export function formatDate(value: string | Date, locale = "en-US", timeZone?: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  const d = typeof value === "string" ? (value.length === 10 ? parseISO(value) : new Date(value)) : value;
  // Date-only strings are calendar dates: don't shift them by time zone.
  const tz = typeof value === "string" && value.length === 10 ? undefined : timeZone;
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: tz }).format(d);
}

export function formatTime(value: string | Date, locale = "en-US", timeZone?: string) {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(value));
}

export function minutesSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
}
