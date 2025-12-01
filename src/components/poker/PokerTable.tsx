import type { RoomPlayer } from "@/types/database";
import { Card } from "./Card";
import { CommunityCards } from "./CommunityCards";

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
  onSeatClick,
}: PokerTableProps) {
  // Get seated players (not spectators)
  const seatedPlayers = players.filter((p) => !p.is_spectating);
  const occupiedSeats = new Map(
    seatedPlayers.map((p) => [p.seat_number, p]),
  );

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

  // Calculate seat positions in an ellipse around the table
  const getSeatPosition = (seatNumber: number) => {
    const angle = (seatNumber / maxPlayers) * 2 * Math.PI - Math.PI / 2;
    const radiusX = 45; // horizontal radius percentage
    const radiusY = 35; // vertical radius percentage
    const x = 50 + radiusX * Math.cos(angle);
    const y = 50 + radiusY * Math.sin(angle);
    return { x, y };
  };

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-5xl">
      {/* Poker table surface */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="h-full w-full rounded-[50%] border-8 border-amber-700 bg-gradient-to-br from-green-700 to-green-800 shadow-2xl">
          {/* Table inner border */}
          <div className="h-full w-full rounded-[50%] border-4 border-amber-800/50"></div>
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
            onClick={() => isEmpty && onSeatClick(seatNumber)}
            disabled={!isEmpty}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all ${
              isEmpty ? "cursor-pointer hover:scale-105" : "cursor-default"
            }`}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          >
            {/* Seat container */}
            <div
              className={`relative z-10 min-w-32 rounded-lg border-2 px-4 py-3 shadow-lg ${
                isEmpty
                  ? "border-gray-400 bg-gray-200/90 hover:border-green-500 hover:bg-green-100/90"
                  : isMyPlayer
                    ? "border-green-500 bg-green-100/95"
                    : "border-gray-600 bg-white/95"
              } ${
                isCurrentActor ? "ring-4 ring-yellow-400 ring-offset-2" : ""
              }`}
            >
              {isEmpty ? (
                <div className="text-center">
                  <div className="text-xs font-semibold text-gray-600">
                    Seat {seatNumber + 1}
                  </div>
                  {!userHasSeat && (
                    <div className="text-xs text-gray-500">Click to sit</div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-800 truncate">
                    {player.display_name}
                  </div>
                  <div className="mt-1 text-lg font-bold text-green-600">
                    ${player.chip_stack}
                  </div>
                  {player.has_folded && (
                    <div className="text-xs font-semibold text-red-600">
                      Folded
                    </div>
                  )}
                  {player.is_all_in && (
                    <div className="text-xs font-semibold text-purple-600">
                      All-In
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Current bet chips in front of player */}
            {!isEmpty && (player.current_bet ?? 0) > 0 && !player.has_folded && (
              <div className="mt-2 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white shadow">
                ${player.current_bet}
              </div>
            )}

            {/* Dealer button */}
            {hasButton && (
              <div className="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-800 shadow-lg">
                <span className="text-sm font-bold text-gray-800">D</span>
              </div>
            )}

            {/* Small Blind indicator */}
            {isSmallBlind && !hasButton && (
              <div className="absolute -left-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 border-2 border-blue-700 shadow-lg">
                <span className="text-xs font-bold text-white">SB</span>
              </div>
            )}

            {/* Big Blind indicator */}
            {isBigBlind && !hasButton && (
              <div className="absolute -left-2 -top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 border-2 border-orange-700 shadow-lg">
                <span className="text-xs font-bold text-white">BB</span>
              </div>
            )}

            {/* Player Hole Cards - shown above seat */}
            {!isEmpty && phase && !player.has_folded && (
              <div className={`absolute left-1/2 -translate-x-1/2 ${isMyPlayer && myHoleCards.length > 0 ? '-top-18 z-10' : '-top-12 z-0'}`}>
                {isMyPlayer && myHoleCards.length > 0 ? (
                  // My cards: spread out horizontally
                  <div className="flex gap-1">
                    {myHoleCards.filter((card) => card != null).map((card, index) => (
                      <Card key={index} card={card} size="sm" />
                    ))}
                  </div>
                ) : (
                  // Other players: fanned out face-down cards
                  <div className="relative flex items-center justify-center" style={{ width: '80px', height: '48px' }}>
                    {[0, 1, 2, 3].map((cardIndex) => {
                      const rotation = (cardIndex - 1.5) * 8; // -12deg, -4deg, 4deg, 12deg
                      const xOffset = (cardIndex - 1.5) * 12; // Horizontal spacing

                      return (
                        <div
                          key={cardIndex}
                          className="absolute"
                          style={{
                            transform: `translateX(${xOffset}px) rotate(${rotation}deg)`,
                            zIndex: cardIndex,
                          }}
                        >
                          <Card card="Ah" faceDown={true} size="sm" />
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
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
        {/* Community Cards */}
        {boardA.length > 0 && phase && (
          <CommunityCards boardA={boardA} boardB={boardB} phase={phase} />
        )}

        {/* Pot Display */}
        <div className="rounded-lg bg-black/40 px-4 py-1.5 backdrop-blur-md border border-white/20">
          <div className="text-center">
            <div className="text-xl font-bold text-white">
              ${potSize}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
