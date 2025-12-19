import { supabase } from "./supabase.js";
import { logger } from "./logger.js";
import { HAND_COMPLETE_DELAY_MS } from "@poker/shared";

/**
 * Cleanup scheduler for completed hands.
 * Runs periodically to delete game_states where hand_completed_at is older than HAND_COMPLETE_DELAY_MS.
 *
 * This allows the engine to set hand_completed_at and return immediately from the HTTP request,
 * while the cleanup happens asynchronously in the background. This prevents blocking the request
 * handler for 5 seconds and is resilient to engine restarts (database-driven state recovery).
 */
export class HandCompletionCleanup {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = 1000; // Check every second
  private isRunning = false;

  /**
   * Start the cleanup scheduler.
   * Safe to call multiple times - will log a warning if already running.
   */
  start() {
    if (this.intervalId) {
      logger.warn("HandCompletionCleanup already running");
      return;
    }

    logger.info(
      { checkIntervalMs: this.checkIntervalMs, delayMs: HAND_COMPLETE_DELAY_MS },
      "Starting hand completion cleanup scheduler"
    );

    this.intervalId = setInterval(() => {
      this.cleanup().catch((err) => {
        logger.error({ err }, "Error in hand completion cleanup");
      });
    }, this.checkIntervalMs);
  }

  /**
   * Stop the cleanup scheduler.
   * Clears the interval and allows the process to exit cleanly.
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("Hand completion cleanup scheduler stopped");
    }
  }

  /**
   * Cleanup completed hands that have exceeded the delay period.
   * This is safe to run multiple times - it's idempotent.
   *
   * Finds all game_states where hand_completed_at is older than HAND_COMPLETE_DELAY_MS
   * and deletes them to trigger the frontend hand completion flow.
   */
  private async cleanup() {
    // Prevent concurrent executions
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const cutoffTime = new Date(Date.now() - HAND_COMPLETE_DELAY_MS).toISOString();

      // Find all game_states where hand_completed_at is older than cutoff
      const { data: completedHands, error: queryErr } = await supabase
        .from("game_states")
        .select("id, room_id, hand_number, hand_completed_at")
        .not("hand_completed_at", "is", null)
        .lte("hand_completed_at", cutoffTime);

      if (queryErr) {
        logger.error({ err: queryErr }, "Failed to query completed hands");
        return;
      }

      if (!completedHands || completedHands.length === 0) {
        return;
      }

      // Delete each completed hand
      for (const hand of completedHands) {
        const { error: deleteErr } = await supabase
          .from("game_states")
          .delete()
          .eq("id", hand.id);

        if (deleteErr) {
          logger.error(
            { err: deleteErr, gameStateId: hand.id, roomId: hand.room_id },
            "Failed to delete completed game_state"
          );
        } else {
          logger.info(
            {
              roomId: hand.room_id,
              handNumber: hand.hand_number,
              completedAt: hand.hand_completed_at,
            },
            "Cleaned up completed hand"
          );
        }
      }
    } finally {
      this.isRunning = false;
    }
  }
}

// Export singleton instance
export const handCompletionCleanup = new HandCompletionCleanup();
