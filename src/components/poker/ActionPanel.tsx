"use client";

import { useState } from "react";
import { getBettingLimits } from "@/lib/poker/betting";

interface ActionPanelProps {
  playerChips: number;
  playerCurrentBet: number;
  currentBet: number;
  potSize: number;
  bigBlind: number;
  onAction: (actionType: string, amount?: number) => void;
  disabled?: boolean;
}

export function ActionPanel({
  playerChips,
  playerCurrentBet,
  currentBet,
  potSize,
  bigBlind,
  onAction,
  disabled = false,
}: ActionPanelProps) {
  const [betAmount, setBetAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const limits = getBettingLimits(
    playerChips,
    playerCurrentBet,
    currentBet,
    potSize,
    0, // lastRaiseAmount - would need to track this
    bigBlind,
  );

  const handleAction = async (actionType: string, amount?: number) => {
    setIsSubmitting(true);
    try {
      await onAction(actionType, amount);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickBet = (multiplier: number) => {
    const quickBet = Math.floor(potSize * multiplier);
    const capped = Math.min(Math.max(quickBet, limits.minBet), limits.maxBet);
    setBetAmount(capped);
  };

  return (
    <div className="bg-gradient-to-t from-black/90 to-black/70 p-4 backdrop-blur-md border-t border-white/10">
      <div className="mx-auto max-w-4xl">
        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Fold */}
          {limits.canFold && (
            <button
              onClick={() => handleAction("fold")}
              disabled={disabled || isSubmitting}
              className="rounded-lg bg-red-600 px-12 py-3 font-bold text-white shadow-lg transition-all hover:bg-red-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              Fold
            </button>
          )}

          {/* Check */}
          {limits.canCheck && (
            <button
              onClick={() => handleAction("check")}
              disabled={disabled || isSubmitting}
              className="rounded-lg bg-blue-600 px-12 py-3 font-bold text-white shadow-lg transition-all hover:bg-blue-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              Check
            </button>
          )}

          {/* Call */}
          {limits.canCall && !limits.canCheck && (
            <button
              onClick={() => handleAction("call")}
              disabled={disabled || isSubmitting}
              className="rounded-lg bg-green-600 px-12 py-3 font-bold text-white shadow-lg transition-all hover:bg-green-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              Call ${limits.callAmount}
            </button>
          )}

          {/* Bet/Raise Section */}
          {limits.canRaise && (
            <div className="flex flex-1 gap-2">
              <div className="flex flex-1 flex-col gap-2">
                {/* Slider */}
                <input
                  type="range"
                  min={limits.minBet}
                  max={limits.maxBet}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full"
                  disabled={disabled || isSubmitting}
                />

                {/* Quick bet buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleQuickBet(0.5)}
                    disabled={disabled || isSubmitting}
                    className="flex-1 rounded bg-amber-700 px-2 py-1 text-xs text-white hover:bg-amber-800 disabled:opacity-50"
                  >
                    1/2 Pot
                  </button>
                  <button
                    onClick={() => handleQuickBet(0.75)}
                    disabled={disabled || isSubmitting}
                    className="flex-1 rounded bg-amber-700 px-2 py-1 text-xs text-white hover:bg-amber-800 disabled:opacity-50"
                  >
                    3/4 Pot
                  </button>
                  <button
                    onClick={() => handleQuickBet(1)}
                    disabled={disabled || isSubmitting}
                    className="flex-1 rounded bg-amber-700 px-2 py-1 text-xs text-white hover:bg-amber-800 disabled:opacity-50"
                  >
                    Pot
                  </button>
                  <button
                    onClick={() => setBetAmount(playerChips)}
                    disabled={disabled || isSubmitting}
                    className="flex-1 rounded bg-amber-700 px-2 py-1 text-xs text-white hover:bg-amber-800 disabled:opacity-50"
                  >
                    All-In
                  </button>
                </div>
              </div>

              {/* Bet/Raise Button */}
              <button
                onClick={() =>
                  handleAction(
                    currentBet === 0 ? "bet" : "raise",
                    betAmount,
                  )
                }
                disabled={
                  disabled ||
                  isSubmitting ||
                  betAmount < limits.minBet ||
                  betAmount > limits.maxBet
                }
                className="rounded-lg bg-orange-600 px-12 py-3 font-bold text-white shadow-lg transition-all hover:bg-orange-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <div className="text-xs">
                  {currentBet === 0 ? "Bet" : "Raise"}
                </div>
                <div className="text-lg">${betAmount}</div>
              </button>
            </div>
          )}

          {/* All-In (when can't raise normally) */}
          {!limits.canRaise && playerChips > 0 && (
            <button
              onClick={() => handleAction("all_in")}
              disabled={disabled || isSubmitting}
              className="rounded-lg bg-purple-600 px-12 py-3 font-bold text-white shadow-lg transition-all hover:bg-purple-700 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              All-In ${playerChips}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
