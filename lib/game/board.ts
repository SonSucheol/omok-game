import {
  BOARD_SIZE,
  DIRECTIONS,
  Stone,
  WIN_LENGTH,
  type Move,
  type Position,
} from "./types";

export function createEmptyBoard(size = BOARD_SIZE): Stone[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Stone.EMPTY),
  );
}

export function inBounds(row: number, col: number, size = BOARD_SIZE): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function isEmptyCell(
  board: Stone[][],
  row: number,
  col: number,
): boolean {
  return inBounds(row, col, board.length) && board[row][col] === Stone.EMPTY;
}

export function placeStone(
  board: Stone[][],
  row: number,
  col: number,
  stone: Stone,
): Stone[][] | null {
  if (stone === Stone.EMPTY || !isEmptyCell(board, row, col)) {
    return null;
  }

  const next = board.map((rowCells) => [...rowCells]);
  next[row][col] = stone;
  return next;
}

export function undoStone(board: Stone[][], move: Move): Stone[][] {
  const next = board.map((rowCells) => [...rowCells]);
  next[move.row][move.col] = Stone.EMPTY;
  return next;
}

function countLine(
  board: Stone[][],
  row: number,
  col: number,
  stone: Stone,
  dr: number,
  dc: number,
): number {
  const size = board.length;
  let count = 0;
  let r = row;
  let c = col;

  while (inBounds(r, c, size) && board[r][c] === stone) {
    count += 1;
    r += dr;
    c += dc;
  }

  return count;
}

export function checkWin(
  board: Stone[][],
  row: number,
  col: number,
): boolean {
  const stone = board[row][col];
  if (stone === Stone.EMPTY) {
    return false;
  }

  return DIRECTIONS.some(([dr, dc]) => {
    const line =
      countLine(board, row, col, stone, dr, dc) +
      countLine(board, row, col, stone, -dr, -dc) -
      1;
    // 렌주: 흑은 정확히 5목만 승리, 백은 5목 이상 승리
    if (stone === Stone.BLACK) {
      return line === WIN_LENGTH;
    }
    return line >= WIN_LENGTH;
  });
}

export function getWinningLine(
  board: Stone[][],
  row: number,
  col: number,
): Position[] | null {
  const stone = board[row][col];
  if (stone === Stone.EMPTY) {
    return null;
  }

  const size = board.length;

  for (const [dr, dc] of DIRECTIONS) {
    const cells: Position[] = [{ row, col }];

    let r = row + dr;
    let c = col + dc;
    while (inBounds(r, c, size) && board[r][c] === stone) {
      cells.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    r = row - dr;
    c = col - dc;
    while (inBounds(r, c, size) && board[r][c] === stone) {
      cells.unshift({ row: r, col: c });
      r -= dr;
      c -= dc;
    }

    if (stone === Stone.BLACK) {
      if (cells.length === WIN_LENGTH) {
        return cells;
      }
    } else if (cells.length >= WIN_LENGTH) {
      return cells;
    }
  }

  return null;
}

export function isBoardFull(board: Stone[][]): boolean {
  return board.every((row) => row.every((cell) => cell !== Stone.EMPTY));
}

export function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isWinningCell(
  winningCells: Position[],
  row: number,
  col: number,
): boolean {
  return winningCells.some((cell) => cell.row === row && cell.col === col);
}
