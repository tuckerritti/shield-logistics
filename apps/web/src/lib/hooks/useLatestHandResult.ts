"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { clientLogger } from "@/lib/client-logger";
import type { HandResult } from "@/types/database";

/**
 * Subscribe to the most recent hand_result for a room.
 * Used to drive winner/payout animations after the game_state row is deleted.
 */
export function useLatestHandResult(roomId: string | null) {
  const [handResult, setHandResult] = useState<HandResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const supabase = getBrowserClient();

    const fetchLatest = async () => {
      try {
        const { data, error } = await supabase
          .from("hand_results")
          .select("*")
          .eq("room_id", roomId)
          .order("hand_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          setError(error.message);
          return;
        }

        if (data) {
          setHandResult(data as HandResult);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        clientLogger.error("useLatestHandResult: fetch error", err instanceof Error ? err : { error: msg });
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();

    const channel = supabase
      .channel(`hand-results:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hand_results",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const latest = payload.new as HandResult;
          clientLogger.info("useLatestHandResult: new result", {
            roomId,
            handNumber: latest.hand_number,
            winners: latest.winners,
          });
          setHandResult(latest);
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  return { handResult, loading, error };
}
