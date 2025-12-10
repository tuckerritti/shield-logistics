import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { HandResult, RoomPlayer } from "@/types/database";
import { Card } from "./Card";
import { CommunityCards } from "./CommunityCards";
import { ChipStack } from "./ChipStack";
import { ChipFlightLayer, type ChipFlight } from "./ChipFlightLayer";

interface PokerTableProps {
  players: RoomPlayer[];
  maxPlayers: number;
  myPlayerId?: string;
  myHoleCards?: string[];
  currentActorSeat?: number | null;
  buttonSeat?: number | null;
  boardA?: string[];
  boardB?: string[];
  potSize?: number;
  phase?: string;
  handNumber?: number | null;
  handResult?: HandResult | null;
  onSeatClick: (seatNumber: number) => void;
}

export function PokerTable({
  players,
  maxPlayers,
  myPlayerId,
  myHoleCards = [],
  currentActorSeat,
  buttonSeat,
  boardA = [],
  boardB = [],
  potSize = 0,
  phase,
  handNumber = null,
  handResult = null,
  onSeatClick,
}: PokerTableProps) {
  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(max-width: 640px)").matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Rotate felt sideways on mobile for better use of vertical space; seats stay upright
  const tableRotation = isMobile ? 90 : 0;
  // Enlarge felt on mobile only (cards/seats unaffected)
  const tableScale = isMobile ? 1.3 : 1;

  const tableRef = useRef<HTMLDivElement | null>(null);
  const potRef = useRef<HTMLDivElement | null>(null);
  const seatRefs = useRef<Map<number, HTMLElement>>(new Map());
  const betRefs = useRef<Map<number, HTMLElement>>(new Map());
  const prevPlayersRef = useRef<RoomPlayer[]>([]);
  const prevPhaseRef = useRef<string | null>(null);
  const lastHandNumberRef = useRef<number | null>(handNumber);
  const lastPotRef = useRef<number>(potSize ?? 0);
  const payoutDoneRef = useRef<Set<number>>(new Set());
  const [flights, setFlights] = useState<ChipFlight[]>([]);
  const [displayPot, setDisplayPot] = useState<number>(potSize ?? 0);

  // Get seated players (not spectators)
  const seatedPlayers = players.filter((p) => !p.is_spectating);
  const occupiedSeats = new Map(seatedPlayers.map((p) => [p.seat_number, p]));

  // Check if current user already has a seat
  const userHasSeat = seatedPlayers.some((p) => p.id === myPlayerId);

  // Helper function to find next occupied seat clockwise from a position
  const findNextOccupiedSeat = (startSeat: number): number | null => {
    if (seatedPlayers.length === 0) return null;

    for (let i = 1; i <= maxPlayers; i++) {
      const nextSeat = (startSeat + i) % maxPlayers;
      if (occupiedSeats.has(nextSeat)) {
        return nextSeat;
      }
    }
    return null;
  };

  // Calculate small blind and big blind positions (next occupied seats clockwise)
  let smallBlindSeat: number | null = null;
  let bigBlindSeat: number | null = null;

  if (buttonSeat !== null && buttonSeat !== undefined) {
    smallBlindSeat = findNextOccupiedSeat(buttonSeat);
    if (smallBlindSeat !== null) {
      bigBlindSeat = findNextOccupiedSeat(smallBlindSeat);
    }
  }

  const setSeatRef = (seatNumber: number, el: HTMLElement | null) => {
    if (el) {
      seatRefs.current.set(seatNumber, el);
    } else {
      seatRefs.current.delete(seatNumber);
    }
  };

  const setBetRef = (seatNumber: number, el: HTMLElement | null) => {
    if (el) {
      betRefs.current.set(seatNumber, el);
    } else {
      betRefs.current.delete(seatNumber);
    }
  };

  const getPoint = (el?: HTMLElement | null) => {
    if (!el || !tableRef.current) return null;
    const rect = el.getBoundingClientRect();
    const parentRect = tableRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - parentRect.left,
      y: rect.top + rect.height / 2 - parentRect.top,
    };
  };

  const createFlight = useCallback(
    (
      kind: ChipFlight["kind"],
      amount: number,
      fromEl?: HTMLElement | null,
      toEl?: HTMLElement | null,
      durationMs = 650,
    ) => {
      if (!fromEl || !toEl || !tableRef.current || amount <= 0) return;
      const from = getPoint(fromEl);
      const to = getPoint(toEl);
      if (!from || !to) return;
      setFlights((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          amount: Math.round(amount),
          from,
          to,
          kind,
          durationMs,
        },
      ]);
    },
    [],
  );

  const handleFlightEnd = useCallback((id: string) => {
    setFlights((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const winners = useMemo(() => {
    if (!handResult) return [];
    const raw = handResult.winners as unknown;
    if (Array.isArray(raw)) {
      return raw
        .map((w) => Number(w))
        .filter((n) => Number.isFinite(n));
    }
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .map((w: unknown) => Number(w))
            .filter((n) => Number.isFinite(n));
        }
      } catch (err) {
        console.error("Failed to parse winners json", err);
      }
    }
    return [];
  }, [handResult]);

  // Calculate seat positions on a flattened "stadium" path so ends feel rounded
  const getSeatPosition = (seatNumber: number) => {
    const angle = (seatNumber / maxPlayers) * 2 * Math.PI - Math.PI / 2;
    // "Superellipse" keeps top/bottom tight while giving straight-ish sides
    // Mobile: pull seats inward on the x-axis, stretch on y-axis to use vertical space
    const radiusX = isMobile ? 38 : 48;
    const radiusY = isMobile ? 52 : 38;
    const n = 4; // higher = squarer sides
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x =
      50 +
      radiusX *
        Math.sign(cos) *
        Math.pow(Math.abs(cos), 2 / n);
    const y =
      50 +
      radiusY *
        Math.sign(sin) *
        Math.pow(Math.abs(sin), 2 / n);
    return { x, y };
  };

  // Track hand number to reset payout bookkeeping
  useEffect(() => {
    if (handNumber !== null && handNumber !== undefined) {
      lastHandNumberRef.current = handNumber;
      payoutDoneRef.current.clear();
    }
  }, [handNumber]);

  // Keep a stable pot value while the hand is active; freeze when phase becomes null
  useEffect(() => {
    if (phase) {
      lastPotRef.current = potSize ?? 0;
      setDisplayPot(potSize ?? 0);
    }
  }, [phase, potSize]);

  // Core animation logic: detect bet additions, collections to the pot, and payouts to winners.
  useEffect(() => {
    const prevPlayers = prevPlayersRef.current;
    const prevPhase = prevPhaseRef.current;
    const phaseChanged = prevPhase !== phase && prevPhase !== null && prevPhase !== undefined;
    const handEnded = Boolean(prevPhase) && !phase;

    if (!prevPlayers.length) {
      prevPlayersRef.current = players;
      prevPhaseRef.current = phase ?? null;
      return;
    }

    // Player puts chips forward (bet or raise)
    players.forEach((player) => {
      const prev = prevPlayers.find((p) => p.id === player.id);
      if (!prev) return;
      const prevBet = prev.current_bet ?? 0;
      const newBet = player.current_bet ?? 0;
      const delta = newBet - prevBet;
      if (delta > 0) {
        const seatEl = seatRefs.current.get(player.seat_number);
        const betEl = betRefs.current.get(player.seat_number) ?? seatEl;
        createFlight("bet", delta, seatEl, betEl, 550);
      }
    });

    // Collect tabled bets into the pot when the street advances or the hand ends
    if (phaseChanged || handEnded) {
      prevPlayers.forEach((player) => {
        const outstandingBet = player.current_bet ?? 0;
        if (outstandingBet > 0) {
          const betEl = betRefs.current.get(player.seat_number) ?? seatRefs.current.get(player.seat_number);
          createFlight("collect", outstandingBet, betEl, potRef.current, 620);
        }
      });
    }

    // Payout animation once the hand ends and Supabase writes the hand_result
    if (handEnded && handResult && handResult.hand_number === lastHandNumberRef.current) {
      const potAmount = lastPotRef.current || 0;
      if (potAmount > 0) {
        setDisplayPot(potAmount);
      }

      players.forEach((player) => {
        const prev = prevPlayers.find((p) => p.id === player.id);
        const stackDelta = (player.chip_stack ?? 0) - (prev?.chip_stack ?? 0);
        if (
          stackDelta > 0 &&
          winners.includes(player.seat_number) &&
          !payoutDoneRef.current.has(player.seat_number)
        ) {
          payoutDoneRef.current.add(player.seat_number);
          createFlight("payout", stackDelta, potRef.current, seatRefs.current.get(player.seat_number), 720);
        }
      });

      prevPlayersRef.current = players;
      prevPhaseRef.current = phase ?? null;
      // Fade pot display after payouts animate
      const timer = setTimeout(() => setDisplayPot(0), 850);
      return () => clearTimeout(timer);
    }

    prevPlayersRef.current = players;
    prevPhaseRef.current = phase ?? null;
  }, [players, phase, handResult, winners, createFlight]);

  return (
    <div
      ref={tableRef}
      className="relative mx-auto aspect-[3/2] sm:aspect-[4/3] w-full max-w-[100vw] sm:max-w-5xl max-h-[98vh] sm:max-h-none overflow-visible"
    >
      <ChipFlightLayer flights={flights} onFlightEnd={handleFlightEnd} />

      {/* Poker table surface */}
      <div className="absolute inset-0 flex items-center justify-center p-0 sm:p-8">
        <div
          className="relative h-full w-full transition-transform duration-500"
          style={{ transform: `rotate(${tableRotation}deg) scale(${tableScale})` }}
        >
          <svg
            className="h-full w-full"
            viewBox="-4 -4 108 68"
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient id="felt" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14213d" />
                <stop offset="100%" stopColor="#0f1b33" />
              </linearGradient>
              <linearGradient id="rail" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f1b1b" />
                <stop offset="100%" stopColor="#2d0f0f" />
              </linearGradient>
            </defs>

            {/* Outer rail with stadium silhouette */}
            <path
              d="M25 5 H75 A25 25 0 0 1 100 30 A25 25 0 0 1 75 55 H25 A25 25 0 0 1 0 30 A25 25 0 0 1 25 5 Z"
              fill="url(#rail)"
              stroke="#5e2525"
              strokeWidth="1.5"
            />

            {/* Inner felt */}
            <path
              d="M28 10 H72 A20 20 0 0 1 92 30 A20 20 0 0 1 72 50 H28 A20 20 0 0 1 8 30 A20 20 0 0 1 28 10 Z"
              fill="url(#felt)"
              stroke="#e0c58f"
              strokeWidth="0.8"
              strokeOpacity="0.6"
            />

            {/* Inscription */}
            <text
              x="50"
              y="33"
              textAnchor="middle"
              fontSize="5"
              fontFamily="Cinzel, serif"
              letterSpacing="0.25"
              fill="#0b152a" // slightly darker than the felt for subtle emboss
              opacity="0.7"
            >
              DEGENERATE
            </text>
          </svg>
        </div>
      </div>

      {/* Seats around the table */}
      {Array.from({ length: maxPlayers }, (_, i) => {
        const seatNumber = i;
        const player = occupiedSeats.get(seatNumber);
        const position = getSeatPosition(seatNumber);
        const isMyPlayer = player?.id === myPlayerId;
        const isCurrentActor = currentActorSeat === seatNumber;
        const isEmpty = !player;
        const hasButton = buttonSeat === seatNumber;
        const isSmallBlind = smallBlindSeat === seatNumber;
        const isBigBlind = bigBlindSeat === seatNumber;

        return (
          <button
            key={seatNumber}
            onClick={() => isEmpty && !userHasSeat && onSeatClick(seatNumber)}
            disabled={!isEmpty || userHasSeat}
            ref={(el) => setSeatRef(seatNumber, el)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all ${
              isEmpty && !userHasSeat
                ? "cursor-pointer hover:scale-105"
                : "cursor-default"
            }`}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          >
            {/* Seat container */}
            <div
              className={`relative z-10 min-w-20 sm:min-w-28 lg:min-w-32 rounded-lg border-2 px-2 py-2 sm:px-4 sm:py-3 shadow-lg backdrop-blur-md ${
                isEmpty && !userHasSeat
                  ? "border-white/20 bg-black/40 hover:border-whiskey-gold/50 hover:bg-black/50"
                  : isEmpty && userHasSeat
                    ? "border-white/20 bg-black/40"
                    : isMyPlayer
                      ? "border-whiskey-gold bg-whiskey-gold/20"
                      : "border-white/20 bg-black/40"
              } ${
                isCurrentActor
                  ? "ring-2 sm:ring-4 ring-whiskey-gold ring-offset-1 sm:ring-offset-2 ring-offset-royal-blue glow-gold"
                  : ""
              }`}
              style={{ fontFamily: "Lato, sans-serif" }}
            >
              {isEmpty ? (
                <div className="text-center">
                  <div className="text-xs font-semibold text-cigar-ash">
                    Seat {seatNumber + 1}
                  </div>
                  {!userHasSeat && (
                    <div className="text-xs text-cigar-ash hidden sm:block">
                      Click to sit
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-xs sm:text-sm font-bold text-cream-parchment truncate">
                    {player.display_name}
                  </div>
                  <div
                    className="mt-1 text-base sm:text-lg font-bold text-whiskey-gold"
                    style={{ fontFamily: "Roboto Mono, monospace" }}
                  >
                    ${player.chip_stack}
                  </div>
                  {player.has_folded && (
                    <div className="text-xs font-semibold text-velvet-red">
                      Folded
                    </div>
                  )}
                  {player.is_all_in && (
                    <div className="text-xs font-semibold text-whiskey-gold glow-gold">
                      All-In
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current bet chips in front of player */}
            <div
              ref={(el) => setBetRef(seatNumber, el)}
              className="mt-1 sm:mt-2 flex min-h-[18px] flex-col items-center"
            >
              {!isEmpty && (player.current_bet ?? 0) > 0 && (
                <ChipStack
                  amount={player.current_bet ?? 0}
                  size={isMobile ? "sm" : "md"}
                  showValue={true}
                  compact
                />
              )}
            </div>

            {/* Dealer button */}
            {hasButton && (
              <div className="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-cream-parchment border-2 border-mahogany shadow-lg">
                <span
                  className="text-sm font-bold text-mahogany"
                  style={{ fontFamily: "Cinzel, serif" }}
                >
                  D
                </span>
              </div>
            )}

            {/* Small Blind indicator */}
            {isSmallBlind && !hasButton && (
              <div className="absolute -left-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-royal-blue border-2 border-whiskey-gold shadow-lg">
                <span
                  className="text-xs font-bold text-whiskey-gold"
                  style={{ fontFamily: "Lato, sans-serif" }}
                >
                  SB
                </span>
              </div>
            )}

            {/* Big Blind indicator */}
            {isBigBlind && !hasButton && (
              <div className="absolute -left-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-royal-blue border-2 border-whiskey-gold shadow-lg">
                <span
                  className="text-xs font-bold text-whiskey-gold"
                  style={{ fontFamily: "Lato, sans-serif" }}
                >
                  BB
                </span>
              </div>
            )}

            {/* Player Hole Cards - shown above seat */}
            {!isEmpty && phase && !player.has_folded && (
              <div
                className={`absolute left-1/2 -translate-x-1/2 ${
                  isMyPlayer && myHoleCards.length > 0
                    ? "-top-18 sm:-top-28 z-10"
                    : "-top-14 sm:-top-20 z-0"
                }`}
              >
                {isMyPlayer && myHoleCards.length > 0 ? (
                  // My cards: spread out horizontally
                  <div className="flex gap-0.5 sm:gap-1">
                    {myHoleCards
                      .filter((card) => card != null)
                      .map((card, index) => (
                        <Card key={index} card={card} size="md" />
                      ))}
                  </div>
                ) : (
                  // Other players: fanned out face-down cards
                  <div
                    className="relative flex items-center justify-center"
                    style={{
                      width: isMobile ? "80px" : "100px",
                      height: isMobile ? "52px" : "64px",
                    }}
                  >
                    {[0, 1, 2, 3].map((cardIndex) => {
                      const rotation = (cardIndex - 1.5) * 8; // -12deg, -4deg, 4deg, 12deg
                      const xOffset = (cardIndex - 1.5) * (isMobile ? 12 : 16); // Horizontal spacing

                      return (
                        <div
                          key={cardIndex}
                          className="absolute"
                          style={{
                            transform: `translateX(${xOffset}px) rotate(${rotation}deg)`,
                            zIndex: cardIndex,
                          }}
                        >
                          <Card card="Ah" faceDown={true} size="md" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </button>
        );
      })}

      {/* Center - Community Cards and Pot */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        {/* Pot Display (left on desktop, below on mobile) */}
        <div
          ref={potRef}
          className="order-2 sm:order-1 glass rounded-lg px-3 sm:px-4 py-1.5 border border-whiskey-gold/30 shadow-lg flex items-center"
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] uppercase tracking-[0.14em] text-cigar-ash"
              style={{ fontFamily: "Lato, sans-serif" }}
            >
              Pot
            </span>
            <ChipStack amount={displayPot} size={isMobile ? "sm" : "md"} showValue />
          </div>
        </div>

        {/* Community Cards */}
        {boardA.length > 0 && phase && (
          <div className="order-1 sm:order-2 scale-95 sm:scale-100">
            <CommunityCards
              boardA={boardA}
              boardB={boardB}
              phase={phase}
              myHoleCards={myHoleCards}
            />
          </div>
        )}
      </div>
    </div>
  );
}
