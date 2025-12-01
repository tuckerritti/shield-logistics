"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { useRoomPlayers } from "@/lib/hooks/useRoomPlayers";
import { useGameState } from "@/lib/hooks/useGameState";
import { usePlayerHand } from "@/lib/hooks/usePlayerHand";
import { getBrowserClient } from "@/lib/supabase/client";
import { ActionPanel } from "@/components/poker/ActionPanel";
import { PokerTable } from "@/components/poker/PokerTable";
import type { Room, BoardState } from "@/types/database";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { sessionId, isLoading: sessionLoading } = useSession();
  const { players, loading: playersLoading } = useRoomPlayers(roomId);
  const { gameState } = useGameState(roomId);
  const { playerHand } = usePlayerHand(roomId, sessionId);

  const [room, setRoom] = useState<Room | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [buyInAmount, setBuyInAmount] = useState(200);
  const [isJoining, setIsJoining] = useState(false);

  const myPlayer = players.find((p) => p.session_id === sessionId);
  const isMyTurn =
    gameState && myPlayer && gameState.current_actor_seat === myPlayer.seat_number;

  useEffect(() => {
    const fetchRoom = async () => {
      const supabase = getBrowserClient();
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (error) {
        console.error("Error fetching room:", error);
      } else {
        setRoom(data);
        setBuyInAmount(data.min_buy_in);
      }
      setRoomLoading(false);
    };

    fetchRoom();
  }, [roomId]);

  const handleResolveHand = useCallback(async () => {
    try {
      const response = await fetch("/api/game/resolve-hand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to resolve hand");
      }
    } catch (error) {
      console.error("Error resolving hand:", error);
      alert("Failed to resolve hand");
    }
  }, [roomId]);

  // Auto-resolve showdown after 5 seconds
  useEffect(() => {
    if (gameState?.phase === "showdown") {
      const timer = setTimeout(() => {
        handleResolveHand();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.phase, handleResolveHand]);

  const handleSeatClick = (seatNumber: number) => {
    // Don't allow sitting if already at the table
    if (myPlayer) {
      return;
    }
    setSelectedSeat(seatNumber);
    setShowJoinModal(true);
  };

  const handleJoinTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !room || selectedSeat === null) return;

    setIsJoining(true);

    try {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          displayName,
          seatNumber: selectedSeat,
          buyInAmount,
          isSpectating: false,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowJoinModal(false);
        setDisplayName("");
        setSelectedSeat(null);
      } else {
        alert(data.error || "Failed to join table");
      }
    } catch (error) {
      console.error("Error joining:", error);
      alert("Failed to join table");
    } finally {
      setIsJoining(false);
    }
  };

  const handleDealHand = async () => {
    try {
      const response = await fetch("/api/game/deal-hand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to deal hand");
      }
    } catch (error) {
      console.error("Error dealing hand:", error);
      alert("Failed to deal hand");
    }
  };

  const handleAction = async (actionType: string, amount?: number) => {
    if (!myPlayer) return;

    try {
      const response = await fetch("/api/game/submit-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          sessionId,
          seatNumber: myPlayer.seat_number,
          actionType,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to submit action");
      }
    } catch (error) {
      console.error("Error submitting action:", error);
      alert("Failed to submit action");
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Room link copied to clipboard!");
  };

  if (sessionLoading || roomLoading || playersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-900 to-green-700">
        <div className="text-2xl text-white">Loading...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-900 to-green-700">
        <div className="text-2xl text-white">Room not found</div>
      </div>
    );
  }

  // Get my hole cards from PRIVATE player_hands table (per POKER_PLAN.md)
  // RLS ensures we only see our own cards
  const myHoleCards: string[] = playerHand?.cards as unknown as string[] || [];

  // Get community cards from board_state JSONB (per POKER_PLAN.md)
  let boardA: string[] = [];
  let boardB: string[] = [];
  if (gameState?.board_state) {
    const boardState = gameState.board_state as unknown as BoardState;
    boardA = boardState.board1 || [];
    boardB = boardState.board2 || [];
    console.log("Board state received:", { boardA, boardB, boardALength: boardA.length, boardBLength: boardB.length });
  }

  const seatedPlayers = players.filter((p) => !p.is_spectating).length;
  const isOwner = room.owner_session_id === sessionId;
  const canDeal = !gameState && seatedPlayers >= 2 && isOwner;

  return (
    <div className="h-screen bg-gradient-to-br from-green-900 to-green-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-3">
        <div className="flex items-center justify-between rounded-lg bg-white/10 p-3 backdrop-blur-sm">
          <div>
            <h1 className="text-xl font-bold text-white">
              Double Board Bomb Pot PLO
            </h1>
            <p className="text-xs text-green-100">
              Blinds: {room.small_blind}/{room.big_blind} • Ante:{" "}
              {room.bomb_pot_ante}
            </p>
            {isOwner && (
              <p className="text-xs text-yellow-300">
                You are the table owner
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyRoomLink}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            >
              Share Link
            </button>
            {canDeal && (
              <button
                onClick={handleDealHand}
                className="animate-pulse rounded-md bg-orange-600 px-3 py-2 text-sm font-bold text-white hover:bg-orange-700"
              >
                Deal Hand
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Area - fills remaining space */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4">
        <div className="w-full h-full max-w-6xl flex items-center justify-center">
          <PokerTable
            players={players}
            maxPlayers={room.max_players}
            myPlayerId={myPlayer?.id}
            myHoleCards={myHoleCards}
            currentActorSeat={gameState?.current_actor_seat}
            buttonSeat={gameState?.button_seat ?? null}
            boardA={boardA}
            boardB={boardB}
            potSize={gameState?.pot_size ?? 0}
            phase={gameState?.phase}
            onSeatClick={handleSeatClick}
          />
        </div>
      </div>

      {/* Game Status Messages - Overlays */}
      {!gameState && seatedPlayers < 2 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-white bg-black/50 px-6 py-4 rounded-lg backdrop-blur-sm">
          <p className="text-lg">
            Waiting for players... ({seatedPlayers}/2 minimum)
          </p>
        </div>
      )}

      {gameState?.phase === "showdown" && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center bg-black/50 px-8 py-6 rounded-lg backdrop-blur-sm">
          <p className="text-2xl font-bold text-yellow-300">
            SHOWDOWN!
          </p>
          <p className="text-white">Determining winners...</p>
        </div>
      )}

      {/* Action Panel - Fixed at bottom */}
      {isMyTurn && myPlayer && gameState && room && (
        <div className="flex-shrink-0">
          <ActionPanel
            playerChips={myPlayer.chip_stack}
            playerCurrentBet={myPlayer.current_bet ?? 0}
            currentBet={gameState.current_bet ?? 0}
            potSize={gameState.pot_size ?? 0}
            bigBlind={room.big_blind}
            onAction={handleAction}
          />
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Join Table
            </h2>
            <form onSubmit={handleJoinTable} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Buy-in Amount (${room.min_buy_in} - ${room.max_buy_in})
                </label>
                <input
                  type="number"
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  min={room.min_buy_in}
                  max={room.max_buy_in}
                  required
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setSelectedSeat(null);
                  }}
                  className="flex-1 rounded-md bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {isJoining ? "Joining..." : "Join"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
