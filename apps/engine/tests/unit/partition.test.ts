import { describe, it, expect } from "vitest";
import { determine321Winners, endOfHandPayout321 } from "../../src/logic.js";

describe("321 partition showdown", () => {
  it("should scoop when one player wins all three boards", () => {
    const board1 = ["Ah", "Kh", "Qh", "Jh", "2c"];
    const board2 = ["3c", "4d", "5h", "9s", "Kd"];
    const board3 = ["2s", "8c", "Td", "Jh", "Qc"];

    const partitions = [
      {
        seatNumber: 1,
        threeBoardCards: ["Th", "9h", "2d"],
        twoBoardCards: ["6c", "7d"],
        oneBoardCard: ["9c"],
      },
      {
        seatNumber: 2,
        threeBoardCards: ["As", "Kd", "Qc"],
        twoBoardCards: ["Ah", "Ac"],
        oneBoardCard: ["Ah"],
      },
    ];

    const winners = determine321Winners(partitions, board1, board2, board3);
    expect(winners.board1Winners).toEqual([1]);
    expect(winners.board2Winners).toEqual([1]);
    expect(winners.board3Winners).toEqual([1]);
  });

  it("should split pot into thirds with remainder to board3 winners", () => {
    const sidePots = [{ amount: 100, eligibleSeats: [1, 2] }];
    const payouts = endOfHandPayout321(sidePots, [1], [2], [2]);

    expect(payouts).toContainEqual({ seat: 1, amount: 33 });
    expect(payouts).toContainEqual({ seat: 2, amount: 67 });
    expect(payouts.reduce((sum, p) => sum + p.amount, 0)).toBe(100);
  });
});
