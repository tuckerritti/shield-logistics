"use client";

import { useState } from "react";

/**
 * Hook to manage anonymous user sessions
 * Generates and persists a session ID in localStorage
 */
export function useSession() {
  // Use lazy initialization to avoid setState in effect
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === "undefined") return "";

    let id = localStorage.getItem("poker_session_id");

    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("poker_session_id", id);
    }

    return id;
  });

  const [isLoading] = useState(false);

  const clearSession = () => {
    localStorage.removeItem("poker_session_id");
    const newId = crypto.randomUUID();
    localStorage.setItem("poker_session_id", newId);
    setSessionId(newId);
  };

  return {
    sessionId,
    isLoading,
    clearSession,
  };
}
