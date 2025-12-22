"use client";

import { useEffect } from "react";

export function ReactScan({ enabled = false }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;
    void (async () => {
      try {
        const { scan } = await import("react-scan");
        if (isMounted) {
          scan({ enabled: true });
        }
      } catch (error) {
        console.warn("react-scan is not available:", error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return null;
}
