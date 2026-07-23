export type AiMode = "beginner" | "intermediate" | "advanced" | "challenge";

export type AiStrength = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const AI_MODE_LABEL: Record<AiMode, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
  challenge: "도전",
};

export const AI_MODE_BASE_STRENGTH: Record<
  Exclude<AiMode, "challenge">,
  AiStrength
> = {
  beginner: 1,
  intermediate: 4,
  advanced: 7,
};

/** 도전 시작 강도 · 연승 스케일 7→7→8→9→10 */
export const CHALLENGE_BASE_STRENGTH: AiStrength = 7;
export const CHALLENGE_STREAK_KEY = "omok-challenge-win-streak";

/** @deprecated use AiMode */
export type AiDifficulty = AiMode;

/** @deprecated use AI_MODE_LABEL */
export const AI_DIFFICULTY_LABEL = AI_MODE_LABEL;

export function clampStrength(value: number): AiStrength {
  const n = Math.round(value);
  if (n <= 1) return 1;
  if (n >= 10) return 10;
  return n as AiStrength;
}

/**
 * 연승 수에 따른 도전 난이도.
 * 0·1연승 후 → 7, 2연승 후 → 8, 3연승 후 → 9, 4연승 후 → 10
 * (대국 시퀀스: 7 > 7 > 8 > 9 > 10)
 */
export function challengeStrengthFromStreak(streak: number): AiStrength {
  if (streak >= 4) return 10;
  if (streak >= 3) return 9;
  if (streak >= 2) return 8;
  return CHALLENGE_BASE_STRENGTH;
}

export function readChallengeStreak(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  const raw = sessionStorage.getItem(CHALLENGE_STREAK_KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function writeChallengeStreak(streak: number): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(CHALLENGE_STREAK_KEY, String(Math.max(0, streak)));
}

export function parseAiMode(value: string | null | undefined): AiMode {
  switch (value) {
    case "intermediate":
    case "중급":
      return "intermediate";
    case "advanced":
    case "고급":
      return "advanced";
    case "challenge":
    case "도전":
      return "challenge";
    case "beginner":
    case "초급":
    case "초보":
    default:
      return "beginner";
  }
}

/** @deprecated use parseAiMode */
export function parseAiDifficulty(value: string | null | undefined): AiMode {
  return parseAiMode(value);
}

export function aiThinkMs(strength: AiStrength): number {
  return 300 + strength * 55;
}

export interface StrengthProfile {
  missBlockRate: number;
  attackFour: number;
  attackThree: number;
  attackTwo: number;
  defendFour: number;
  defendThree: number;
  defendTwo: number;
  forkWeight: number;
  replyThreatBonus: number;
  adjacentWeight: number;
  centerWeight: number;
  jitter: number;
  preferScoredBlocks: boolean;
}

/** 전체적으로 상향된 1~10 프로파일 (실전 오목 감각 기준) */
export function strengthProfile(strength: AiStrength): StrengthProfile {
  const t = (strength - 1) / 9; // 0..1

  return {
    // 초급(1)만 가끔 놓침, 중급(4)부터 필수 차단
    missBlockRate: strength >= 4 ? 0 : strength === 1 ? 0.22 : 0.1,
    attackFour: 140 + t * 560,
    attackThree: 36 + t * 120,
    attackTwo: 12 + t * 28,
    defendFour: 120 + t * 480,
    defendThree: 28 + t * 100,
    defendTwo: 10 + t * 22,
    forkWeight: 18 + t * 48,
    replyThreatBonus: 28 + t * 90,
    adjacentWeight: 3 + t * 5,
    centerWeight: 10 + t * 10,
    jitter: Math.max(0.15, 3.2 - t * 3),
    preferScoredBlocks: strength >= 4,
  };
}
