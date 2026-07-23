import { describe, expect, it } from "vitest";
import {
  Stone,
  createEmptyBoard,
  createInitialState,
  getBlackForbiddenReason,
  getMoveRejectReason,
  playMove,
  wouldBlackViolateDoubleThree,
} from "@/lib/game";

function withStones(
  stones: Array<{ row: number; col: number; stone: Stone }>,
) {
  const board = createEmptyBoard();
  for (const { row, col, stone } of stones) {
    board[row][col] = stone;
  }
  return board;
}

describe("renju forbidden (kakao-style)", () => {
  it("forbids black double-three", () => {
    const board = withStones([
      { row: 1, col: 2, stone: Stone.BLACK },
      { row: 2, col: 1, stone: Stone.BLACK },
      { row: 2, col: 3, stone: Stone.BLACK },
      { row: 3, col: 2, stone: Stone.BLACK },
    ]);

    expect(wouldBlackViolateDoubleThree(board, 2, 2)).toBe(true);
    expect(getBlackForbiddenReason(board, 2, 2)).toBe("double_three");
  });

  it("allows four-three (사삼) for black", () => {
    // Horizontal open four threat (3 stones + place = open-ish four)
    // + vertical open three
    // B B B _  at row 7 cols 5,6,7 and place 8 → four
    // B B at col 8 rows 5,6 and place 7,8 → three... 
    // Classic 43: 
    // horizontal: BBB at (7,5)(7,6)(7,7), empty (7,8)(7,9) — place (7,8) makes four
    // vertical open three: (5,8)(6,8) place (7,8)
    const board = withStones([
      { row: 7, col: 5, stone: Stone.BLACK },
      { row: 7, col: 6, stone: Stone.BLACK },
      { row: 7, col: 7, stone: Stone.BLACK },
      { row: 5, col: 8, stone: Stone.BLACK },
      { row: 6, col: 8, stone: Stone.BLACK },
    ]);

    expect(getBlackForbiddenReason(board, 7, 8)).toBeNull();
  });

  it("forbids black double-four", () => {
    // Place at (7,7): horizontal BBB_ + vertical BBB_ → two fours
    const board = withStones([
      { row: 7, col: 4, stone: Stone.BLACK },
      { row: 7, col: 5, stone: Stone.BLACK },
      { row: 7, col: 6, stone: Stone.BLACK },
      { row: 4, col: 7, stone: Stone.BLACK },
      { row: 5, col: 7, stone: Stone.BLACK },
      { row: 6, col: 7, stone: Stone.BLACK },
    ]);

    expect(getBlackForbiddenReason(board, 7, 7)).toBe("double_four");
  });

  it("forbids black overline (6+)", () => {
    const board = withStones([
      { row: 7, col: 3, stone: Stone.BLACK },
      { row: 7, col: 4, stone: Stone.BLACK },
      { row: 7, col: 5, stone: Stone.BLACK },
      { row: 7, col: 6, stone: Stone.BLACK },
      { row: 7, col: 7, stone: Stone.BLACK },
    ]);

    // placing at 7,8 makes 6 in a row
    expect(getBlackForbiddenReason(board, 7, 8)).toBe("overline");
  });

  it("allows exact five even if other threats exist", () => {
    const board = withStones([
      { row: 7, col: 5, stone: Stone.BLACK },
      { row: 7, col: 6, stone: Stone.BLACK },
      { row: 7, col: 7, stone: Stone.BLACK },
      { row: 7, col: 8, stone: Stone.BLACK },
      { row: 6, col: 6, stone: Stone.BLACK },
      { row: 5, col: 6, stone: Stone.BLACK },
      { row: 4, col: 6, stone: Stone.BLACK },
      { row: 8, col: 6, stone: Stone.BLACK },
      { row: 9, col: 6, stone: Stone.BLACK },
    ]);

    expect(getBlackForbiddenReason(board, 7, 9)).toBeNull();
  });

  it("allows black when only one open three", () => {
    const board = withStones([
      { row: 7, col: 6, stone: Stone.BLACK },
      { row: 7, col: 7, stone: Stone.BLACK },
    ]);

    expect(getBlackForbiddenReason(board, 7, 8)).toBeNull();
  });

  it("allows black when one three is blocked", () => {
    const board = withStones([
      { row: 7, col: 5, stone: Stone.WHITE },
      { row: 7, col: 6, stone: Stone.BLACK },
      { row: 7, col: 8, stone: Stone.BLACK },
      { row: 5, col: 7, stone: Stone.BLACK },
      { row: 6, col: 7, stone: Stone.BLACK },
    ]);

    expect(getBlackForbiddenReason(board, 7, 7)).toBeNull();
  });

  it("does not restrict white", () => {
    const board = withStones([
      { row: 1, col: 2, stone: Stone.WHITE },
      { row: 2, col: 1, stone: Stone.WHITE },
      { row: 2, col: 3, stone: Stone.WHITE },
      { row: 3, col: 2, stone: Stone.WHITE },
    ]);

    let state = createInitialState();
    state = {
      ...state,
      board,
      currentPlayer: Stone.WHITE,
    };

    expect(getMoveRejectReason(state, 2, 2)).toBeNull();
    expect(playMove(state, 2, 2)).not.toBeNull();
  });

  it("rejects playMove for black double three", () => {
    let state = createInitialState();
    state = playMove(state, 1, 2)!;
    state = playMove(state, 10, 10)!;
    state = playMove(state, 2, 1)!;
    state = playMove(state, 10, 11)!;
    state = playMove(state, 2, 3)!;
    state = playMove(state, 10, 12)!;
    state = playMove(state, 3, 2)!;
    state = playMove(state, 10, 13)!;

    expect(getMoveRejectReason(state, 2, 2)).toBe("double_three");
    expect(playMove(state, 2, 2)).toBeNull();
  });
});
