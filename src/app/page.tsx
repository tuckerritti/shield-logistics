"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/useSession";

export default function Home() {
  const router = useRouter();
  const { sessionId } = useSession();
  const [isCreating, setIsCreating] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState("");

  // Create room form state
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [minBuyIn, setMinBuyIn] = useState(200);
  const [maxBuyIn, setMaxBuyIn] = useState(1000);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;

    setIsCreating(true);

    try {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          smallBlind,
          bigBlind,
          minBuyIn,
          maxBuyIn,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/room/${data.room.id}`);
      } else {
        alert(data.error || "Failed to create room");
      }
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      router.push(`/room/${joinRoomId.trim()}`);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-900 to-green-700 p-4">
      <main className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-5xl font-bold text-white">Degen Poker</h1>
          <p className="text-xl text-green-100">
            Double Board Bomb Pot • Pot Limit Omaha
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Room Card */}
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Create a Room
            </h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Small Blind
                  </label>
                  <input
                    type="number"
                    value={smallBlind}
                    onChange={(e) => setSmallBlind(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Big Blind
                  </label>
                  <input
                    type="number"
                    value={bigBlind}
                    onChange={(e) => setBigBlind(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                    min={smallBlind + 1}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Min Buy-in
                  </label>
                  <input
                    type="number"
                    value={minBuyIn}
                    onChange={(e) => setMinBuyIn(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                    min={bigBlind * 20}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Max Buy-in
                  </label>
                  <input
                    type="number"
                    value={maxBuyIn}
                    onChange={(e) => setMaxBuyIn(Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                    min={minBuyIn + 1}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full rounded-md bg-green-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create Room"}
              </button>
            </form>
          </div>

          {/* Join Room Card */}
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Join a Room
            </h2>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Room ID
                </label>
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  placeholder="Enter room ID or paste link"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Paste the room ID shared by the host
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Join Room
              </button>
            </form>

            <div className="mt-6 rounded-md bg-gray-50 p-4">
              <h3 className="mb-2 font-semibold text-gray-800">Game Info</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 8 players max per table</li>
                <li>• Double board bomb pot format</li>
                <li>• Pot Limit Omaha rules</li>
                <li>• No authentication required</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
