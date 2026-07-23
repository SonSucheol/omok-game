export const BOARD_SIZE = 15;
export const WIN_LENGTH = 5;

export enum Stone {
  EMPTY = 0,
  BLACK = 1,
  WHITE = 2,
}

export type GamePhase = "playing" | "finished";

export type MoveRejectReason =
  | "not_playing"
  | "occupied"
  | "double_three"
  | "double_four"
  | "overline";

export interface Position {
  row: number;
  col: number;
}

export interface Move extends Position {
  stone: Stone;
}

export interface GameState {
  board: Stone[][];
  currentPlayer: Stone;
  phase: GamePhase;
  winner: Stone | null;
  winningCells: Position[];
  lastMove: Move | null;
  history: Move[];
}

export const DIRECTIONS: readonly [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export function opponent(stone: Stone): Stone {
  return stone === Stone.BLACK ? Stone.WHITE : Stone.BLACK;
}

export function stoneLabel(stone: Stone): string {
  switch (stone) {
    case Stone.BLACK:
      return "흑";
    case Stone.WHITE:
      return "백";
    default:
      return "";
  }
}
