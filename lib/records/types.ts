import type { Move, Stone } from "@/lib/game";
import type { AiMode } from "@/lib/ai";

export type GameRecordMode = "local" | "online" | "ai";

export type GameRecordResult =
  | "black_win"
  | "white_win"
  | "draw"
  | "in_progress";

export interface GameRecordMeta {
  id: string;
  mode: GameRecordMode;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  result: GameRecordResult;
  moveCount: number;
  roomId?: string;
  aiMode?: AiMode;
  aiStrength?: number;
  /** 로그인한 참가자 userId 목록 (리플레이 소유권) */
  participantIds: string[];
  title: string;
}

export interface GameRecord extends GameRecordMeta {
  moves: Move[];
  winner: Stone | null;
}

export interface GameRecordSummary extends GameRecordMeta {}
