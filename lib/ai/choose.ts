import type { GameState, Position } from "@/lib/game";
import { chooseByStrength } from "./engine";
import {
  AI_MODE_BASE_STRENGTH,
  CHALLENGE_BASE_STRENGTH,
  challengeStrengthFromStreak,
  type AiMode,
  type AiStrength,
} from "./strength";

export function resolveAiStrength(
  mode: AiMode,
  challengeStreak = 0,
): AiStrength {
  if (mode === "challenge") {
    return challengeStrengthFromStreak(challengeStreak);
  }
  return AI_MODE_BASE_STRENGTH[mode];
}

export function chooseAiMove(
  state: GameState,
  modeOrStrength: AiMode | AiStrength,
  random: () => number = Math.random,
  challengeStreak = 0,
): Position | null {
  const strength =
    typeof modeOrStrength === "number"
      ? modeOrStrength
      : resolveAiStrength(modeOrStrength, challengeStreak);

  return chooseByStrength(state, strength, random);
}

export function chooseBeginnerMove(
  state: GameState,
  random: () => number = Math.random,
): Position | null {
  return chooseByStrength(state, 1, random);
}

export function chooseIntermediateMove(
  state: GameState,
  random: () => number = Math.random,
): Position | null {
  return chooseByStrength(state, 4, random);
}

export function chooseAdvancedMove(
  state: GameState,
  random: () => number = Math.random,
): Position | null {
  return chooseByStrength(state, 7, random);
}

export function chooseChallengeMove(
  state: GameState,
  streak: number,
  random: () => number = Math.random,
): Position | null {
  return chooseByStrength(
    state,
    challengeStrengthFromStreak(streak),
    random,
  );
}

export { CHALLENGE_BASE_STRENGTH };
