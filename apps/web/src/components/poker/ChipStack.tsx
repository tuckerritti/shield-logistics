import React from "react";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export type ChipType = "chip" | "plaque";

export interface Denomination {
  value: number;
  label: string;
  type: ChipType;
  baseColor: string;
  edgeColor?: string;
  textColor?: string;
}

export interface ChipPiece {
  denom: Denomination;
  count: number;
}

export const STANDARD_DENOMS: Denomination[] = [
  { value: 25000, label: "25K", type: "plaque", baseColor: "#f6d65a", edgeColor: "#b68b00", textColor: "#1a1200" },
  { value: 10000, label: "10K", type: "plaque", baseColor: "#f59e0b", edgeColor: "#a75b00", textColor: "#1a1200" },
  { value: 5000, label: "5K", type: "plaque", baseColor: "#b91c1c", edgeColor: "#5c0c0c", textColor: "#fff5e6" },
  { value: 1000, label: "1K", type: "chip", baseColor: "#f1c40f", edgeColor: "#b8860b", textColor: "#1a1200" },
  { value: 500, label: "500", type: "chip", baseColor: "#8e44ad", edgeColor: "#4b2c5c", textColor: "#f8f5ff" },
  { value: 100, label: "100", type: "chip", baseColor: "#111827", edgeColor: "#4b5563", textColor: "#f8fafc" },
  { value: 25, label: "25", type: "chip", baseColor: "#0f766e", edgeColor: "#064e3b", textColor: "#e0fff7" },
  { value: 5, label: "5", type: "chip", baseColor: "#b91c1c", edgeColor: "#7f1d1d", textColor: "#fff1f2" },
  { value: 1, label: "1", type: "chip", baseColor: "#e5e7eb", edgeColor: "#9ca3af", textColor: "#0f172a" },
];

/**
 * Break an amount into casino-style chip and plaque pieces.
 * We always show a count badge when a denomination has more than 6 pieces
 * to keep the DOM light while keeping the math accurate.
 */
export function makeChipPieces(amount: number): ChipPiece[] {
  const pieces: ChipPiece[] = [];
  let remaining = Math.max(0, Math.round(amount));

  for (const denom of STANDARD_DENOMS) {
    if (remaining < denom.value) continue;
    const count = Math.floor(remaining / denom.value);
    if (count > 0) {
      pieces.push({ denom, count });
      remaining -= count * denom.value;
    }
  }

  // If anything is left because amount < smallest denom, stuff it into $1s
  if (remaining > 0) {
    pieces.push({ denom: STANDARD_DENOMS[STANDARD_DENOMS.length - 1], count: remaining });
  }

  return pieces;
}

interface ChipIconProps {
  denom: Denomination;
  size: "sm" | "md";
  className?: string;
  badge?: string;
  style?: React.CSSProperties;
}

function ChipIcon({ denom, size, className, badge, style }: ChipIconProps) {
  const isPlaque = denom.type === "plaque";
  const baseSize = size === "sm" ? (isPlaque ? "w-12 h-7" : "w-8 h-8") : isPlaque ? "w-16 h-10" : "w-10 h-10";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  const plaqueGradient = `linear-gradient(135deg, ${denom.baseColor} 0%, ${denom.edgeColor ?? "#111"} 40%, ${denom.baseColor} 100%)`;
  const chipGradient = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.22), transparent 55%), ${denom.baseColor}`;

  const stripes =
    "repeating-linear-gradient(90deg, transparent, transparent 18%, rgba(255,255,255,0.45) 18%, rgba(255,255,255,0.45) 26%, transparent 26%, transparent 44%)";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center font-semibold drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]",
        baseSize,
        isPlaque ? "rounded-md" : "rounded-full border-[3px]",
        className,
      )}
      style={{
        background: isPlaque ? plaqueGradient : chipGradient,
        borderColor: denom.edgeColor ?? "rgba(0,0,0,0.35)",
        ...style,
      }}
    >
      {/* Edge stripes */}
      <div
        className={cn("absolute inset-[8%]", isPlaque ? "rounded-sm" : "rounded-full")}
        style={{
          backgroundImage: stripes,
          opacity: 0.65,
          mixBlendMode: "screen",
        }}
      />

      {/* Center inlay */}
      <div
        className={cn(
          "relative flex items-center justify-center font-bold tracking-tight",
          textSize,
          isPlaque ? "px-2 py-1 rounded-sm" : "w-[68%] h-[68%] rounded-full border border-black/20",
        )}
        style={{
          background: isPlaque ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.92)",
          color: denom.textColor ?? "#111",
          boxShadow: isPlaque ? "inset 0 2px 6px rgba(0,0,0,0.22)" : "inset 0 1px 4px rgba(0,0,0,0.25)",
        }}
      >
        {denom.label}
      </div>

      {badge && (
        <span className="absolute -right-1 -top-1 rounded-full bg-black/80 px-1.5 py-[2px] text-[10px] font-bold text-white shadow">
          {badge}
        </span>
      )}
    </div>
  );
}

interface ChipStackProps {
  amount: number;
  size?: "sm" | "md";
  showValue?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * Visual stack used for bets and pot. Shows numeric value plus stylized chips/plaques.
 */
export function ChipStack({
  amount,
  size = "md",
  showValue = true,
  className,
  compact = false,
}: ChipStackProps) {
  const pieces = makeChipPieces(amount);
  const offset = size === "sm" ? 6 : 8;
  const maxVisual = 6;

  return (
    <div className={cn("flex items-end gap-1", compact ? "gap-0.5" : "gap-1", className)}>
      {pieces.map((piece, idx) => {
        const visible = Math.min(piece.count, maxVisual);
        const extra = piece.count - visible;
        const stackHeight = (visible - 1) * offset;

        return (
          <div
            key={`${piece.denom.value}-${idx}`}
            className="relative flex items-end"
            style={{ height: size === "sm" ? 32 + stackHeight : 40 + stackHeight }}
          >
            {Array.from({ length: visible }).map((_, chipIdx) => (
              <ChipIcon
                key={chipIdx}
                denom={piece.denom}
                size={size}
                className="absolute left-0"
                style={
                  {
                    transform: `translateY(-${chipIdx * offset}px)`,
                  } as React.CSSProperties
                }
              />
            ))}
            {extra > 0 && (
              <span className="absolute -right-1.5 -top-1 rounded-full bg-black/80 px-1.5 py-[2px] text-[10px] font-bold text-white shadow">
                +{extra}
              </span>
            )}
          </div>
        );
      })}

      {showValue && (
        <div
          className="ml-1 whitespace-nowrap rounded-md bg-black/75 px-2 py-1 text-[11px] font-bold text-cream-parchment shadow"
          style={{ fontFamily: "Roboto Mono, monospace" }}
        >
          ${amount}
        </div>
      )}
    </div>
  );
}
