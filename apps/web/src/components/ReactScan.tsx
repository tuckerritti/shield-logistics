"use client";

import { useEffect } from "react";
import { scan } from "react-scan";

export function ReactScan({ enabled = false }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    scan({ enabled: true });
  }, [enabled]);

  return null;
}
