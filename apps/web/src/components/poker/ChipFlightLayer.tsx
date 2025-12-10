import { useEffect, useState } from "react";
import type { ChipPiece } from "./ChipStack";
import { ChipStack, makeChipPieces } from "./ChipStack";

export type ChipFlightKind = "bet" | "collect" | "payout";

export interface ChipFlight {
  id: string;
  amount: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  kind: ChipFlightKind;
  durationMs?: number;
}

interface ChipFlightLayerProps {
  flights: ChipFlight[];
  onFlightEnd: (id: string) => void;
}

const kindTint: Record<ChipFlightKind, string> = {
  bet: "drop-shadow-[0_0_10px_rgba(212,175,55,0.45)]",
  collect: "drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]",
  payout: "drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]",
};

function MiniStack({ amount }: { amount: number }) {
  // Keep flying stacks light: cap to a few pieces but keep amount honest with ChipStack label
  const pieces: ChipPiece[] = makeChipPieces(amount).map((p) => ({
    ...p,
    count: Math.min(p.count, 3),
  }));

  return (
    <div className="flex items-end gap-0.5">
      {pieces.slice(0, 2).map((p) => (
        <div key={p.denom.value} className="relative">
          <div className="scale-90 origin-bottom">
            <ChipStack amount={p.denom.value} size="sm" showValue={false} compact />
          </div>
          {p.count > 1 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-black/85 px-1.5 py-[1px] text-[10px] font-bold text-white shadow">
              x{p.count}
            </span>
          )}
        </div>
      ))}
      <div className="rounded-md bg-black/80 px-1.5 py-[2px] text-[11px] font-bold text-cream-parchment shadow">
        ${amount}
      </div>
    </div>
  );
}

export function ChipFlightLayer({ flights, onFlightEnd }: ChipFlightLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible z-[60]">
      {flights.map((flight) => (
        <SingleFlight key={flight.id} flight={flight} onFlightEnd={onFlightEnd} />
      ))}
    </div>
  );
}

function SingleFlight({
  flight,
  onFlightEnd,
}: {
  flight: ChipFlight;
  onFlightEnd: (id: string) => void;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setActive(true));
    const timeout = setTimeout(() => onFlightEnd(flight.id), flight.durationMs ?? 650);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [flight, onFlightEnd]);

  const dx = flight.to.x - flight.from.x;
  const dy = flight.to.y - flight.from.y;

  return (
    <div
      className={`absolute ${kindTint[flight.kind]}`}
      style={{
        left: flight.from.x,
        top: flight.from.y,
        transform: `translate(-50%, -50%) translate(${active ? dx : 0}px, ${active ? dy : 0}px) scale(${active ? 1 : 0.85})`,
        transition: `transform ${flight.durationMs ?? 650}ms cubic-bezier(0.22, 0.84, 0.48, 1)`,
        zIndex: 50,
      }}
    >
      <MiniStack amount={flight.amount} />
    </div>
  );
}
