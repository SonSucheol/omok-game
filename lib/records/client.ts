import type { AiMode } from "@/lib/ai";
import type { Move, Stone } from "@/lib/game";
import type { GameRecord, GameRecordMode, GameRecordSummary } from "./types";

export async function fetchGameRecords(): Promise<GameRecordSummary[]> {
  const res = await fetch("/api/records", {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) {
    throw new Error("로그인이 필요합니다.");
  }
  if (!res.ok) {
    throw new Error("기록 목록을 불러오지 못했습니다.");
  }
  const data = (await res.json()) as { records: GameRecordSummary[] };
  return data.records;
}

export async function fetchGameRecord(id: string): Promise<GameRecord> {
  const res = await fetch(`/api/records/${id}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("기록을 불러오지 못했습니다.");
  }
  const data = (await res.json()) as { record: GameRecord };
  return data.record;
}

export async function postGameRecord(input: {
  mode: GameRecordMode;
  moves: Move[];
  winner: Stone | null;
  finished?: boolean;
  roomId?: string;
  aiMode?: AiMode;
  aiStrength?: number;
}): Promise<GameRecord | null> {
  try {
    const res = await fetch("/api/records", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { record?: GameRecord; skipped?: boolean };
    return data.record ?? null;
  } catch {
    return null;
  }
}
