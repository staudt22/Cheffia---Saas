"use client";

import { formatDistanceToNowStrict } from "date-fns";

/** Relative time ("5 minutes"). Server and browser clocks differ slightly, so hydration warnings are suppressed. */
export function RelativeTime({ date, suffix = false }: { date: string | Date; suffix?: boolean }) {
  return <time dateTime={new Date(date).toISOString()} suppressHydrationWarning>{formatDistanceToNowStrict(new Date(date), { addSuffix: suffix })}</time>;
}
