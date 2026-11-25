"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Tempo relativo ("5 minutos"). Server and browser clocks differ slightly, so hydration warnings are suppressed. */
export function RelativeTime({ date, suffix = false }: { date: string | Date; suffix?: boolean }) {
  return <time dateTime={new Date(date).toISOString()} suppressHydrationWarning>{formatDistanceToNowStrict(new Date(date), { addSuffix: suffix, locale: ptBR })}</time>;
}
