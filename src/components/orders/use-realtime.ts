"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Refreshes server data when orders change. Uses Supabase Realtime (RLS-scoped),
 * with a polling fallback so screens stay current even if the socket drops.
 */
export function useRealtimeOrders(restaurantId?: string, pollMs = 30000) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [live, setLive] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; at: number } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 250);
    };
    const channel = supabase
      .channel(`orders-${restaurantId ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", ...(restaurantId ? { filter: `restaurant_id=eq.${restaurantId}` } : {}) }, (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        setLastEvent({ type: payload.eventType, at: Date.now() });
        refresh();
      })
      .subscribe((status: string) => setLive(status === "SUBSCRIBED"));
    const poll = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, pollMs);
    return () => {
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, pollMs, router]);

  return { live, lastEvent };
}
