import { describe, it, expect } from "vitest";
import { applyAction } from "../../src/logic.js";
import { createPlayer } from "../fixtures/players.js";
import { standardRoom } from "../fixtures/rooms.js";
import { createGameState } from "../fixtures/gameStates.js";
import type { RoomPlayer, GameStateRow } from "../../src/types.js";

describe("Street Advancement", () => {
  describe("total_invested_this_hand persistence", () => {
    it("should preserve total_invested_this_hand when advancing from preflop to flop", () => {
      const room = {
        ...standardRoom,
        game_mode: "texas_holdem" as const,
        small_blind: 5,
        big_blind: 10,
      };

      // Setup: Heads-up after SB calls BB
      // Both players have invested $10
      const players: RoomPlayer[] = [
        createPlayer({
          seat_number: 1,
          chip_stack: 990,
          total_invested_this_hand: 10,
          current_bet: 10,
          has_folded: false,
          is_all_in: false,
        }),
        createPlayer({
          seat_number: 2,
          chip_stack: 990,
          total_invested_this_hand: 10,
          current_bet: 10,
          has_folded: false,
          is_all_in: false,
        }),
      ];

      const gameState = createGameState({
        room_id: room.id,
        phase: "preflop",
        pot_size: 20,
        current_bet: 10,
        min_raise: 10,
        current_actor_seat: 1,
        button_seat: 1,
        seats_to_act: [1],
        seats_acted: [2],
        board_state: { board1: [], board2: [] },
        side_pots: [],
      }) as GameStateRow;

      const fullBoard1 = ["Ah", "Kh", "Qh", "Jh", "Th"];
      const fullBoard2: string[] = [];

      // SB checks (completes the preflop round)
      const outcome = applyAction(
        {
          room,
          players,
          gameState,
          fullBoard1,
          fullBoard2,
        },
        1, // SB seat
        "check",
      );

      expect(outcome.error).toBeUndefined();

      // Should advance to flop
      expect(outcome.updatedGameState.phase).toBe("flop");

      // Both players should have total_invested_this_hand = 10
      const player1Update = outcome.updatedPlayers.find(
        (p) => p.seat_number === 1,
      );
      const player2Update = outcome.updatedPlayers.find(
        (p) => p.seat_number === 2,
      );

      // Player 1 should preserve total_invested_this_hand
      expect(player1Update?.total_invested_this_hand).toBe(10);
      // Player 1's current_bet should be reset to 0 for new street
      expect(player1Update?.current_bet).toBe(0);

      // Player 2 should also preserve total_invested_this_hand
      expect(player2Update?.total_invested_this_hand).toBe(10);
      expect(player2Update?.current_bet).toBe(0);

      // Side pots should reflect correct total (20)
      const sidePots = outcome.updatedGameState.side_pots as Array<{
        amount: number;
        eligibleSeats: number[];
      }>;
      expect(sidePots).toBeDefined();
      expect(sidePots.length).toBeGreaterThan(0);

      const totalPot = sidePots.reduce((sum, pot) => sum + pot.amount, 0);
      expect(totalPot).toBe(20);

      // Should be a single pot since both invested equally
      expect(sidePots).toEqual([{ amount: 20, eligibleSeats: [1, 2] }]);
    });

    it("should preserve total_invested_this_hand when advancing from flop to turn", () => {
      const room = {
        ...standardRoom,
        game_mode: "texas_holdem" as const,
        small_blind: 5,
        big_blind: 10,
      };

      // Setup: On flop, both players have invested $10 preflop
      const players: RoomPlayer[] = [
        createPlayer({
          seat_number: 1,
          chip_stack: 990,
          total_invested_this_hand: 10,
          current_bet: 0,
          has_folded: false,
          is_all_in: false,
        }),
        createPlayer({
          seat_number: 2,
          chip_stack: 990,
          total_invested_this_hand: 10,
          current_bet: 0,
          has_folded: false,
          is_all_in: false,
        }),
      ];

      const gameState = createGameState({
        room_id: room.id,
        phase: "flop",
        pot_size: 20,
        current_bet: 0,
        min_raise: 10,
        current_actor_seat: 1,
        button_seat: 1,
        seats_to_act: [1, 2],
        seats_acted: [],
        board_state: { board1: ["Ah", "Kh", "Qh"], board2: [] },
        side_pots: [{ amount: 20, eligibleSeats: [1, 2] }],
      }) as GameStateRow;

      const fullBoard1 = ["Ah", "Kh", "Qh", "Jh", "Th"];
      const fullBoard2: string[] = [];

      // Both players check
      let outcome = applyAction(
        {
          room,
          players,
          gameState,
          fullBoard1,
          fullBoard2,
        },
        1,
        "check",
      );

      expect(outcome.error).toBeUndefined();

      // Update players array with the result
      const updatedPlayers = players.map((p) => {
        const update = outcome.updatedPlayers.find((u) => u.id === p.id);
        return update ? { ...p, ...update } : p;
      });

      // Update game state
      const updatedGameState = {
        ...gameState,
        ...outcome.updatedGameState,
      } as GameStateRow;

      // Player 2 checks (completes the flop)
      outcome = applyAction(
        {
          room,
          players: updatedPlayers,
          gameState: updatedGameState,
          fullBoard1,
          fullBoard2,
        },
        2,
        "check",
      );

      expect(outcome.error).toBeUndefined();
      expect(outcome.updatedGameState.phase).toBe("turn");

      // Both players should still have total_invested_this_hand = 10
      const player1Update = outcome.updatedPlayers.find(
        (p) => p.seat_number === 1,
      );
      const player2Update = outcome.updatedPlayers.find(
        (p) => p.seat_number === 2,
      );

      expect(player1Update?.total_invested_this_hand).toBe(10);
      expect(player1Update?.current_bet).toBe(0);
      expect(player2Update?.total_invested_this_hand).toBe(10);
      expect(player2Update?.current_bet).toBe(0);

      // Side pots should still reflect correct total
      const sidePots = outcome.updatedGameState.side_pots as Array<{
        amount: number;
        eligibleSeats: number[];
      }>;
      const totalPot = sidePots.reduce((sum, pot) => sum + pot.amount, 0);
      expect(totalPot).toBe(20);
    });

    it("should preserve total_invested_this_hand with unequal investments", () => {
      const room = {
        ...standardRoom,
        game_mode: "texas_holdem" as const,
        small_blind: 5,
        big_blind: 10,
      };

      // Setup: Player 1 invested $10, Player 2 invested $25 (raised preflop)
      const players: RoomPlayer[] = [
        createPlayer({
          seat_number: 1,
          chip_stack: 975,
          total_invested_this_hand: 25,
          current_bet: 25,
          has_folded: false,
          is_all_in: false,
        }),
        createPlayer({
          seat_number: 2,
          chip_stack: 975,
          total_invested_this_hand: 25,
          current_bet: 25,
          has_folded: false,
          is_all_in: false,
        }),
      ];

      const gameState = createGameState({
        room_id: room.id,
        phase: "preflop",
        pot_size: 50,
        current_bet: 25,
        min_raise: 15,
        current_actor_seat: 1,
        button_seat: 1,
        seats_to_act: [1],
        seats_acted: [2],
        board_state: { board1: [], board2: [] },
        side_pots: [],
      }) as GameStateRow;

      const fullBoard1 = ["Ah", "Kh", "Qh", "Jh", "Th"];
      const fullBoard2: string[] = [];

      // SB calls (completes preflop)
      const outcome = applyAction(
        {
          room,
          players,
          gameState,
          fullBoard1,
          fullBoard2,
        },
        1,
        "check",
      );

      expect(outcome.error).toBeUndefined();
      expect(outcome.updatedGameState.phase).toBe("flop");

      // Both players should preserve total_invested_this_hand = 25
      const player1Update = outcome.updatedPlayers.find(
        (p) => p.seat_number === 1,
      );
      const player2Update = outcome.updatedPlayers.find(
        (p) => p.seat_number === 2,
      );

      expect(player1Update?.total_invested_this_hand).toBe(25);
      expect(player2Update?.total_invested_this_hand).toBe(25);

      // Side pots should reflect total of 50
      const sidePots = outcome.updatedGameState.side_pots as Array<{
        amount: number;
        eligibleSeats: number[];
      }>;
      const totalPot = sidePots.reduce((sum, pot) => sum + pot.amount, 0);
      expect(totalPot).toBe(50);
    });
  });
});
