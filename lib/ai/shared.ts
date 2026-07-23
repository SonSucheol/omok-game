import {
  BOARD_SIZE,
  DIRECTIONS,
  Stone,
  getMoveRejectReason,
  inBounds,
  opponent,
  playMove,
  type GameState,
  type Position,
} from "@/lib/game";

export const BOARD_CENTER = Math.floor(BOARD_SIZE / 2);

export type AiDifficulty = "beginner" | "intermediate";

export const AI_DIFFICULTY_LABEL: Record<AiDifficulty, string> = {
  beginner: "초보",
  intermediate: "중급",
};

export function parseAiDifficulty(value: string | null | undefined): AiDifficulty {
  if (value === "intermediate" || value === "중급") {
    return "intermediate";
  }
  return "beginner";
}

export function listLegalMoves(state: GameState): Position[] {
  const moves: Position[] = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      if (getMoveRejectReason(state, row, col) === null) {
        moves.push({ row, col });
      }
    }
  }
  return moves;
}

export function wouldWin(state: GameState, row: number, col: number): boolean {
  const next = playMove(state, row, col);
  return Boolean(
    next && next.phase === "finished" && next.winner === state.currentPlayer,
  );
}

export function pickRandom<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)]!;
}

export function countAdjacentStones(
  board: Stone[][],
  row: number,
  col: number,
): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      const r = row + dr;
      const c = col + dc;
      if (inBounds(r, c) && board[r][c] !== Stone.EMPTY) {
        count += 1;
      }
    }
  }
  return count;
}

export function maxRunThrough(
  board: Stone[][],
  row: number,
  col: number,
  stone: Stone,
): number {
  let best = 1;
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1;
    for (const sign of [1, -1] as const) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (inBounds(r, c) && board[r][c] === stone) {
        count += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    best = Math.max(best, count);
  }
  return best;
}

export function findWinningMoves(state: GameState): Position[] {
  return listLegalMoves(state).filter((m) => wouldWin(state, m.row, m.col));
}

export function findBlockingMoves(state: GameState): Position[] {
  const oppState: GameState = {
    ...state,
    currentPlayer: opponent(state.currentPlayer),
  };
  return listLegalMoves(state).filter((m) => {
    if (getMoveRejectReason(oppState, m.row, m.col) !== null) {
      return false;
    }
    return wouldWin(oppState, m.row, m.col);
  });
}

export function pickBestScoredMove(
  state: GameState,
  pool: Position[],
  scoreMove: (state: GameState, move: Position, random: () => number) => number,
  random: () => number,
): Position {
  let best = pool[0]!;
  let bestScore = -Infinity;
  for (const move of pool) {
    const score = scoreMove(state, move, random);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}
