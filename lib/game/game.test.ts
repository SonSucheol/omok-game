import { describe, expect, it } from "vitest";
import {
  BOARD_SIZE,
  Stone,
  checkWin,
  createEmptyBoard,
  createInitialState,
  getWinningLine,
  isDraw,
  playMove,
  resetGame,
  undoMove,
} from "@/lib/game";

function placeSequence(
  stones: Array<{ row: number; col: number; stone: Stone }>,
) {
  const board = createEmptyBoard();
  for (const { row, col, stone } of stones) {
    board[row][col] = stone;
  }
  return board;
}

describe("createInitialState", () => {
  it("starts with black to play on an empty 15x15 board", () => {
    const state = createInitialState();

    expect(state.board).toHaveLength(BOARD_SIZE);
    expect(state.board[0]).toHaveLength(BOARD_SIZE);
    expect(state.currentPlayer).toBe(Stone.BLACK);
    expect(state.phase).toBe("playing");
    expect(state.winner).toBeNull();
    expect(state.lastMove).toBeNull();
    expect(state.history).toHaveLength(0);
  });
});

describe("playMove", () => {
  it("alternates turns after a valid move", () => {
    let state = createInitialState();
    state = playMove(state, 7, 7)!;

    expect(state.currentPlayer).toBe(Stone.WHITE);
    expect(state.board[7][7]).toBe(Stone.BLACK);
    expect(state.lastMove).toEqual({ row: 7, col: 7, stone: Stone.BLACK });

    state = playMove(state, 7, 8)!;
    expect(state.currentPlayer).toBe(Stone.BLACK);
    expect(state.board[7][8]).toBe(Stone.WHITE);
  });

  it("rejects occupied cells and moves after game end", () => {
    let state = createInitialState();
    state = playMove(state, 7, 7)!;
    expect(playMove(state, 7, 7)).toBeNull();

    state = {
      ...state,
      phase: "finished",
      winner: Stone.BLACK,
    };
    expect(playMove(state, 8, 8)).toBeNull();
  });

  it("detects horizontal five in a row", () => {
    let state = createInitialState();
    const moves = [
      [7, 5],
      [6, 5],
      [7, 6],
      [6, 6],
      [7, 7],
      [6, 7],
      [7, 8],
      [6, 8],
      [7, 9],
    ] as const;

    for (const [row, col] of moves) {
      const next = playMove(state, row, col);
      expect(next).not.toBeNull();
      state = next!;
    }

    expect(state.phase).toBe("finished");
    expect(state.winner).toBe(Stone.BLACK);
    expect(state.winningCells.length).toBeGreaterThanOrEqual(5);
  });

  it("detects vertical win", () => {
    const board = placeSequence([
      { row: 3, col: 4, stone: Stone.BLACK },
      { row: 4, col: 4, stone: Stone.BLACK },
      { row: 5, col: 4, stone: Stone.BLACK },
      { row: 6, col: 4, stone: Stone.BLACK },
      { row: 7, col: 4, stone: Stone.BLACK },
    ]);

    expect(checkWin(board, 7, 4)).toBe(true);
    expect(getWinningLine(board, 7, 4)?.length).toBeGreaterThanOrEqual(5);
  });

  it("detects diagonal win", () => {
    const board = placeSequence([
      { row: 2, col: 2, stone: Stone.WHITE },
      { row: 3, col: 3, stone: Stone.WHITE },
      { row: 4, col: 4, stone: Stone.WHITE },
      { row: 5, col: 5, stone: Stone.WHITE },
      { row: 6, col: 6, stone: Stone.WHITE },
    ]);

    expect(checkWin(board, 6, 6)).toBe(true);
  });

  it("does not count broken lines as a win", () => {
    const board = placeSequence([
      { row: 7, col: 3, stone: Stone.BLACK },
      { row: 7, col: 4, stone: Stone.BLACK },
      { row: 7, col: 5, stone: Stone.WHITE },
      { row: 7, col: 6, stone: Stone.BLACK },
      { row: 7, col: 7, stone: Stone.BLACK },
      { row: 7, col: 8, stone: Stone.BLACK },
    ]);

    expect(checkWin(board, 7, 8)).toBe(false);
  });
});

describe("undoMove", () => {
  it("reverts the last move and restores the current player", () => {
    let state = createInitialState();
    state = playMove(state, 7, 7)!;
    state = playMove(state, 7, 8)!;

    state = undoMove(state)!;

    expect(state.board[7][8]).toBe(Stone.EMPTY);
    expect(state.currentPlayer).toBe(Stone.WHITE);
    expect(state.lastMove).toEqual({ row: 7, col: 7, stone: Stone.BLACK });
    expect(state.history).toHaveLength(1);
  });

  it("cannot undo after the game finishes", () => {
    let state = createInitialState();
    const moves = [
      [7, 5],
      [6, 5],
      [7, 6],
      [6, 6],
      [7, 7],
      [6, 7],
      [7, 8],
      [6, 8],
      [7, 9],
    ] as const;

    for (const [row, col] of moves) {
      state = playMove(state, row, col)!;
    }

    expect(undoMove(state)).toBeNull();
  });
});

describe("resetGame", () => {
  it("returns a fresh game state", () => {
    let state = createInitialState();
    state = playMove(state, 7, 7)!;
    state = resetGame();

    expect(state.phase).toBe("playing");
    expect(state.currentPlayer).toBe(Stone.BLACK);
    expect(state.history).toHaveLength(0);
    expect(state.board[7][7]).toBe(Stone.EMPTY);
  });
});

describe("isDraw", () => {
  it("is false while the game is still playing", () => {
    const state = createInitialState();
    expect(isDraw(state)).toBe(false);
  });
});
