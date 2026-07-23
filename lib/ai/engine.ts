import type { GameState, Position } from "@/lib/game";
import { DIRECTIONS, Stone, inBounds, opponent, playMove } from "@/lib/game";
import {
  BOARD_CENTER,
  countAdjacentStones,
  findBlockingMoves,
  findWinningMoves,
  listLegalMoves,
  maxRunThrough,
  pickBestScoredMove,
  pickRandom,
} from "./shared";
import {
  strengthProfile,
  type AiStrength,
  type StrengthProfile,
} from "./strength";

function countThreatAxes(
  board: Stone[][],
  row: number,
  col: number,
  stone: Stone,
  minLen: number,
): number {
  let count = 0;
  for (const [dr, dc] of DIRECTIONS) {
    let run = 1;
    for (const sign of [1, -1] as const) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (inBounds(r, c) && board[r][c] === stone) {
        run += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (run >= minLen) {
      count += 1;
    }
  }
  return count;
}

function scoreByProfile(
  state: GameState,
  move: Position,
  profile: StrengthProfile,
  random: () => number,
): number {
  const { board, currentPlayer } = state;
  const mine = currentPlayer;
  const theirs = opponent(mine);
  const { row, col } = move;

  let score = 0;
  const myRun = maxRunThrough(board, row, col, mine);
  const theirRun = maxRunThrough(board, row, col, theirs);

  if (myRun >= 4) {
    score += profile.attackFour;
  } else if (myRun === 3) {
    score += profile.attackThree;
  } else if (myRun === 2) {
    score += profile.attackTwo;
  }

  if (theirRun >= 4) {
    score += profile.defendFour;
  } else if (theirRun === 3) {
    score += profile.defendThree;
  } else if (theirRun === 2) {
    score += profile.defendTwo;
  }

  score += countThreatAxes(board, row, col, mine, 3) * profile.forkWeight;
  score += countThreatAxes(board, row, col, theirs, 3) * (profile.forkWeight * 0.7);

  const next = playMove(state, row, col);
  if (next && findBlockingMoves(next).length > 0) {
    score += profile.replyThreatBonus;
  }

  score += countAdjacentStones(board, row, col) * profile.adjacentWeight;
  score += Math.max(
    0,
    profile.centerWeight -
      (Math.abs(row - BOARD_CENTER) + Math.abs(col - BOARD_CENTER)),
  );
  score += random() * profile.jitter;

  return score;
}

/** 1~10 강도에 맞춘 AI 수 선택 */
export function chooseByStrength(
  state: GameState,
  strength: AiStrength,
  random: () => number = Math.random,
): Position | null {
  if (state.phase !== "playing") {
    return null;
  }

  const legal = listLegalMoves(state);
  if (legal.length === 0) {
    return null;
  }

  const profile = strengthProfile(strength);

  if (state.history.length === 0) {
    if (strength <= 3) {
      return { row: BOARD_CENTER, col: BOARD_CENTER };
    }
    const openings: Position[] = [
      { row: BOARD_CENTER, col: BOARD_CENTER },
      { row: BOARD_CENTER - 1, col: BOARD_CENTER },
      { row: BOARD_CENTER, col: BOARD_CENTER - 1 },
      { row: BOARD_CENTER + 1, col: BOARD_CENTER },
      { row: BOARD_CENTER, col: BOARD_CENTER + 1 },
    ];
    return pickRandom(openings, random);
  }

  const wins = findWinningMoves(state);
  if (wins.length > 0) {
    return pickRandom(wins, random);
  }

  const blocks = findBlockingMoves(state);
  if (blocks.length > 0 && random() >= profile.missBlockRate) {
    if (profile.preferScoredBlocks) {
      return pickBestScoredMove(
        state,
        blocks,
        (s, m, r) => scoreByProfile(s, m, profile, r),
        random,
      );
    }
    return pickRandom(blocks, random);
  }

  const nearStones = legal.filter(
    (m) => countAdjacentStones(state.board, m.row, m.col) > 0,
  );
  const pool = nearStones.length > 0 ? nearStones : legal;
  return pickBestScoredMove(
    state,
    pool,
    (s, m, r) => scoreByProfile(s, m, profile, r),
    random,
  );
}
