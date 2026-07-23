import {
  checkWin,
  createInitialState,
  getWinningLine,
  isBoardFull,
  placeStone,
  type GameState,
  type Move,
} from "@/lib/game";
import { opponent } from "@/lib/game";

/** 0수부터 cursor수까지 재생 (금수 검사 없이 기록 복원) */
export function buildStateAtMove(moves: Move[], cursor: number): GameState {
  let state = createInitialState();
  const limit = Math.max(0, Math.min(cursor, moves.length));

  for (let i = 0; i < limit; i += 1) {
    const move = moves[i]!;
    const nextBoard = placeStone(state.board, move.row, move.col, move.stone);
    if (!nextBoard) {
      break;
    }

    const placed: Move = move;
    if (checkWin(nextBoard, move.row, move.col)) {
      state = {
        ...state,
        board: nextBoard,
        phase: "finished",
        winner: move.stone,
        winningCells: getWinningLine(nextBoard, move.row, move.col) ?? [],
        lastMove: placed,
        history: [...state.history, placed],
        currentPlayer: move.stone,
      };
      break;
    }

    if (isBoardFull(nextBoard)) {
      state = {
        ...state,
        board: nextBoard,
        phase: "finished",
        winner: null,
        winningCells: [],
        lastMove: placed,
        history: [...state.history, placed],
      };
      break;
    }

    state = {
      ...state,
      board: nextBoard,
      currentPlayer: opponent(move.stone),
      lastMove: placed,
      history: [...state.history, placed],
    };
  }

  return state;
}
