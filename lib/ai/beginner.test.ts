import { describe, expect, it } from "vitest";
import {
  Stone,
  createInitialState,
  playMove,
  type GameState,
} from "@/lib/game";
import {
  challengeStrengthFromStreak,
  chooseAiMove,
  chooseBeginnerMove,
  chooseByStrength,
  chooseIntermediateMove,
  resolveAiStrength,
} from "@/lib/ai";

function playSequence(
  moves: Array<[number, number]>,
  start = createInitialState(),
): GameState {
  let state = start;
  for (const [row, col] of moves) {
    const next = playMove(state, row, col);
    if (!next) {
      throw new Error(`illegal move ${row},${col}`);
    }
    state = next;
  }
  return state;
}

describe("difficulty mapping", () => {
  it("maps modes to strength scale", () => {
    expect(resolveAiStrength("beginner")).toBe(1);
    expect(resolveAiStrength("intermediate")).toBe(4);
    expect(resolveAiStrength("advanced")).toBe(7);
    expect(challengeStrengthFromStreak(0)).toBe(7);
    expect(challengeStrengthFromStreak(1)).toBe(7);
    expect(challengeStrengthFromStreak(2)).toBe(8);
    expect(challengeStrengthFromStreak(3)).toBe(9);
    expect(challengeStrengthFromStreak(4)).toBe(10);
  });
});

describe("chooseByStrength", () => {
  it("returns null when the game is finished", () => {
    let state = createInitialState();
    for (const col of [0, 1, 2, 3, 4]) {
      state = playMove(state, 7, col)!;
      if (state.phase === "playing") {
        state = playMove(state, 0, col)!;
      }
    }
    expect(chooseByStrength(state, 5)).toBeNull();
  });

  it("beginner opens at center", () => {
    expect(chooseByStrength(createInitialState(), 1, () => 0)).toEqual({
      row: 7,
      col: 7,
    });
  });

  it("takes an immediate winning move", () => {
    const state = playSequence([
      [7, 0],
      [8, 0],
      [7, 1],
      [8, 1],
      [7, 2],
      [8, 2],
      [7, 3],
      [8, 3],
      [0, 0],
    ]);
    expect(state.currentPlayer).toBe(Stone.WHITE);
    expect(chooseByStrength(state, 1, () => 0)).toEqual({ row: 8, col: 4 });
  });

  it("high strength always blocks fours", () => {
    const state = playSequence([
      [7, 0],
      [0, 0],
      [7, 1],
      [0, 1],
      [7, 2],
      [0, 2],
      [7, 3],
    ]);
    expect(chooseIntermediateMove(state, () => 0)).toEqual({ row: 7, col: 4 });
    expect(chooseByStrength(state, 7, () => 0)).toEqual({ row: 7, col: 4 });
  });

  it("routes chooseAiMove by mode", () => {
    const state = createInitialState();
    expect(chooseAiMove(state, "beginner", () => 0)).toEqual({
      row: 7,
      col: 7,
    });
    expect(chooseAiMove(state, "challenge", () => 0, 4)?.row).toBeTypeOf(
      "number",
    );
  });
});
