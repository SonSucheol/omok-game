import {
  checkWin,
  createEmptyBoard,
  getWinningLine,
  isBoardFull,
  isEmptyCell,
  placeStone,
  undoStone,
} from "./board";
import {
  forbiddenMessage,
  getBlackForbiddenReason,
} from "./forbidden";
import {
  BOARD_SIZE,
  Stone,
  opponent,
  type GameState,
  type Move,
  type MoveRejectReason,
} from "./types";

export function createInitialState(size = BOARD_SIZE): GameState {
  return {
    board: createEmptyBoard(size),
    currentPlayer: Stone.BLACK,
    phase: "playing",
    winner: null,
    winningCells: [],
    lastMove: null,
    history: [],
  };
}

export function canPlay(state: GameState): boolean {
  return state.phase === "playing";
}

export function canUndo(state: GameState): boolean {
  return state.phase === "playing" && state.history.length > 0;
}

export function getMoveRejectReason(
  state: GameState,
  row: number,
  col: number,
): MoveRejectReason | null {
  if (!canPlay(state)) {
    return "not_playing";
  }

  if (!isEmptyCell(state.board, row, col)) {
    return "occupied";
  }

  if (state.currentPlayer === Stone.BLACK) {
    return getBlackForbiddenReason(state.board, row, col);
  }

  return null;
}

export function isForbiddenBlackCell(
  state: GameState,
  row: number,
  col: number,
): boolean {
  if (!canPlay(state) || !isEmptyCell(state.board, row, col)) {
    return false;
  }
  if (state.currentPlayer !== Stone.BLACK) {
    return false;
  }
  return getBlackForbiddenReason(state.board, row, col) !== null;
}

export function getForbiddenNotice(
  state: GameState,
  row: number,
  col: number,
): string | null {
  return forbiddenMessage(getMoveRejectReason(state, row, col));
}

export function playMove(
  state: GameState,
  row: number,
  col: number,
): GameState | null {
  if (getMoveRejectReason(state, row, col) !== null) {
    return null;
  }

  const nextBoard = placeStone(state.board, row, col, state.currentPlayer);
  if (!nextBoard) {
    return null;
  }

  const move: Move = { row, col, stone: state.currentPlayer };

  if (checkWin(nextBoard, row, col)) {
    return {
      ...state,
      board: nextBoard,
      phase: "finished",
      winner: state.currentPlayer,
      winningCells: getWinningLine(nextBoard, row, col) ?? [],
      lastMove: move,
      history: [...state.history, move],
    };
  }

  if (isBoardFull(nextBoard)) {
    return {
      ...state,
      board: nextBoard,
      phase: "finished",
      winner: null,
      winningCells: [],
      lastMove: move,
      history: [...state.history, move],
    };
  }

  return {
    ...state,
    board: nextBoard,
    currentPlayer: opponent(state.currentPlayer),
    lastMove: move,
    history: [...state.history, move],
  };
}

export function undoMove(state: GameState): GameState | null {
  if (!canUndo(state)) {
    return null;
  }

  const undone = state.history[state.history.length - 1];
  const nextHistory = state.history.slice(0, -1);
  const nextBoard = undoStone(state.board, undone);

  return {
    ...state,
    board: nextBoard,
    currentPlayer: undone.stone,
    lastMove: nextHistory.length > 0 ? nextHistory[nextHistory.length - 1] : null,
    history: nextHistory,
  };
}

export function resetGame(size = BOARD_SIZE): GameState {
  return createInitialState(size);
}

export function isDraw(state: GameState): boolean {
  return state.phase === "finished" && state.winner === null;
}
