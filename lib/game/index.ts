export {
  BOARD_SIZE,
  WIN_LENGTH,
  Stone,
  DIRECTIONS,
  opponent,
  stoneLabel,
  type GamePhase,
  type GameState,
  type Move,
  type MoveRejectReason,
  type Position,
} from "./types";

export {
  checkWin,
  createEmptyBoard,
  getWinningLine,
  inBounds,
  isBoardFull,
  isEmptyCell,
  isWinningCell,
  placeStone,
  positionsEqual,
} from "./board";

export {
  canPlay,
  canUndo,
  createInitialState,
  getForbiddenNotice,
  getMoveRejectReason,
  isDraw,
  isForbiddenBlackCell,
  playMove,
  resetGame,
  undoMove,
} from "./game";

export {
  DOUBLE_THREE_MESSAGE,
  FORBIDDEN_MESSAGES,
  countFourAxes,
  countOpenThreeAxes,
  forbiddenMessage,
  getBlackForbiddenReason,
  isBlackDoubleFour,
  isBlackDoubleThree,
  isBlackExactFive,
  isBlackOverline,
  wouldBlackViolateDoubleThree,
} from "./forbidden";
