import { inBounds, isEmptyCell, placeStone } from "./board";
import { DIRECTIONS, Stone, WIN_LENGTH } from "./types";
import type { MoveRejectReason } from "./types";

/** 0=빈칸, 1=착수색, 2=상대, 3=판 밖(가드) */
type LineCode = string;

const OPEN_FOUR_PATTERN = "011110";
const OPEN_FOUR_STONE_INDICES = [1, 2, 3, 4] as const;

function cellToCode(cell: Stone, stone: Stone): string {
  if (cell === Stone.EMPTY) {
    return "0";
  }
  return cell === stone ? "1" : "2";
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

/** 해당 축에서 (row,col)을 지나는 연속 돌 길이 */
export function axisRunLength(
  board: Stone[][],
  row: number,
  col: number,
  stone: Stone,
  dr: number,
  dc: number,
): number {
  return (
    countLine(board, row, col, stone, dr, dc) +
    countLine(board, row, col, stone, -dr, -dc) -
    1
  );
}

export function maxRunLength(
  board: Stone[][],
  row: number,
  col: number,
): number {
  const stone = board[row][col];
  if (stone === Stone.EMPTY) {
    return 0;
  }
  let best = 0;
  for (const [dr, dc] of DIRECTIONS) {
    best = Math.max(best, axisRunLength(board, row, col, stone, dr, dc));
  }
  return best;
}

function getAxisLineCode(
  board: Stone[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  stone: Stone,
): { code: LineCode; center: number } {
  const size = board.length;
  let r = row;
  let c = col;

  while (inBounds(r - dr, c - dc, size)) {
    r -= dr;
    c -= dc;
  }

  let code = "";
  let center = -1;

  while (inBounds(r, c, size)) {
    if (r === row && c === col) {
      center = code.length;
    }
    code += cellToCode(board[r][c], stone);
    r += dr;
    c += dc;
  }

  return { code: `3${code}3`, center: center + 1 };
}

function openFourIncludesCenter(code: LineCode, center: number): boolean {
  for (
    let start = 0;
    start <= code.length - OPEN_FOUR_PATTERN.length;
    start += 1
  ) {
    if (
      code.slice(start, start + OPEN_FOUR_PATTERN.length) !== OPEN_FOUR_PATTERN
    ) {
      continue;
    }
    const centerInPattern = center - start;
    if (OPEN_FOUR_STONE_INDICES.includes(centerInPattern as 1 | 2 | 3 | 4)) {
      return true;
    }
  }
  return false;
}

function hasOpenFourOnAxis(
  board: Stone[][],
  row: number,
  col: number,
  stone: Stone,
  dr: number,
  dc: number,
): boolean {
  const { code, center } = getAxisLineCode(board, row, col, dr, dc, stone);
  return openFourIncludesCenter(code, center);
}

function forEachEmptyOnAxis(
  board: Stone[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  visit: (r: number, c: number) => boolean,
): void {
  const size = board.length;
  let r = row;
  let c = col;
  while (inBounds(r - dr, c - dc, size)) {
    r -= dr;
    c -= dc;
  }

  while (inBounds(r, c, size)) {
    if ((r !== row || c !== col) && board[r][c] === Stone.EMPTY) {
      if (visit(r, c)) {
        return;
      }
    }
    r += dr;
    c += dc;
  }
}

/**
 * 사: 이 축에서 빈칸 하나에 더 두면 흑 기준 정확히 5목이 되는 경우.
 * (열린사·닫힌사·뛴사 포함)
 */
function createsFourOnAxis(
  board: Stone[][],
  row: number,
  col: number,
  stone: Stone,
  dr: number,
  dc: number,
): boolean {
  if (axisRunLength(board, row, col, stone, dr, dc) >= WIN_LENGTH) {
    return false;
  }

  let found = false;
  forEachEmptyOnAxis(board, row, col, dr, dc, (er, ec) => {
    const nextBoard = placeStone(board, er, ec, stone);
    if (!nextBoard) {
      return false;
    }
    if (axisRunLength(nextBoard, row, col, stone, dr, dc) === WIN_LENGTH) {
      found = true;
      return true;
    }
    return false;
  });
  return found;
}

/**
 * 활삼: 한 수 더 두면 열린사(011110)가 생기는 경우.
 * 이미 사인 축은 삼으로 치지 않는다 (사삼 허용).
 */
function createsOpenThreeOnAxis(
  board: Stone[][],
  row: number,
  col: number,
  stone: Stone,
  dr: number,
  dc: number,
): boolean {
  if (createsFourOnAxis(board, row, col, stone, dr, dc)) {
    return false;
  }
  if (hasOpenFourOnAxis(board, row, col, stone, dr, dc)) {
    return false;
  }

  let found = false;
  forEachEmptyOnAxis(board, row, col, dr, dc, (er, ec) => {
    const nextBoard = placeStone(board, er, ec, stone);
    if (!nextBoard) {
      return false;
    }
    if (hasOpenFourOnAxis(nextBoard, row, col, stone, dr, dc)) {
      found = true;
      return true;
    }
    return false;
  });
  return found;
}

export function countOpenThreeAxes(
  board: Stone[][],
  row: number,
  col: number,
  stone: Stone = Stone.BLACK,
): number {
  let count = 0;
  for (const [dr, dc] of DIRECTIONS) {
    if (createsOpenThreeOnAxis(board, row, col, stone, dr, dc)) {
      count += 1;
    }
  }
  return count;
}

export function countFourAxes(
  board: Stone[][],
  row: number,
  col: number,
  stone: Stone = Stone.BLACK,
): number {
  let count = 0;
  for (const [dr, dc] of DIRECTIONS) {
    if (createsFourOnAxis(board, row, col, stone, dr, dc)) {
      count += 1;
    }
  }
  return count;
}

export function isBlackDoubleThree(
  board: Stone[][],
  row: number,
  col: number,
): boolean {
  return countOpenThreeAxes(board, row, col, Stone.BLACK) >= 2;
}

export function isBlackDoubleFour(
  board: Stone[][],
  row: number,
  col: number,
): boolean {
  return countFourAxes(board, row, col, Stone.BLACK) >= 2;
}

export function isBlackOverline(
  board: Stone[][],
  row: number,
  col: number,
): boolean {
  return maxRunLength(board, row, col) >= WIN_LENGTH + 1;
}

export function isBlackExactFive(
  board: Stone[][],
  row: number,
  col: number,
): boolean {
  if (board[row][col] !== Stone.BLACK) {
    return false;
  }
  return DIRECTIONS.some(
    ([dr, dc]) =>
      axisRunLength(board, row, col, Stone.BLACK, dr, dc) === WIN_LENGTH,
  );
}

/**
 * 흑 금수 검사 (카카오/렌주):
 * - 장목(6+) 금지
 * - 쌍사(44) 금지
 * - 쌍삼(33) 금지
 * - 사삼(43)은 허용 (사 축은 삼으로 세지 않음)
 * - 정확히 5목 승리는 금수보다 우선(착수 허용)
 */
export function getBlackForbiddenReason(
  board: Stone[][],
  row: number,
  col: number,
): Extract<
  MoveRejectReason,
  "double_three" | "double_four" | "overline"
> | null {
  if (!isEmptyCell(board, row, col)) {
    return null;
  }

  const nextBoard = placeStone(board, row, col, Stone.BLACK);
  if (!nextBoard) {
    return null;
  }

  if (isBlackOverline(nextBoard, row, col)) {
    return "overline";
  }

  if (isBlackExactFive(nextBoard, row, col)) {
    return null;
  }

  if (isBlackDoubleFour(nextBoard, row, col)) {
    return "double_four";
  }

  if (isBlackDoubleThree(nextBoard, row, col)) {
    return "double_three";
  }

  return null;
}

/** @deprecated use getBlackForbiddenReason */
export function wouldBlackViolateDoubleThree(
  board: Stone[][],
  row: number,
  col: number,
): boolean {
  return getBlackForbiddenReason(board, row, col) === "double_three";
}

export const FORBIDDEN_MESSAGES: Record<
  "double_three" | "double_four" | "overline",
  string
> = {
  double_three:
    "이 위치는 쌍삼(열린 삼이 두 방향 이상)이라 흑은 둘 수 없습니다. 한쪽이 막힌 삼은 금수가 아닙니다.",
  double_four: "이 위치는 쌍사(4가 두 방향 이상)라 흑은 둘 수 없습니다.",
  overline: "이 위치는 장목(6목 이상)이라 흑은 둘 수 없습니다.",
};

export const DOUBLE_THREE_MESSAGE = FORBIDDEN_MESSAGES.double_three;

export function forbiddenMessage(
  reason: MoveRejectReason | null | undefined,
): string | null {
  if (
    reason === "double_three" ||
    reason === "double_four" ||
    reason === "overline"
  ) {
    return FORBIDDEN_MESSAGES[reason];
  }
  return null;
}
