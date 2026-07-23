import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { Move } from "@/lib/game";
import { Stone } from "@/lib/game";
import type { AiMode } from "@/lib/ai";
import type {
  GameRecord,
  GameRecordMode,
  GameRecordResult,
  GameRecordSummary,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "records");

function ensureDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function recordPath(id: string): string {
  return path.join(DATA_DIR, `${id}.json`);
}

function createId(): string {
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function resultFromWinner(
  winner: Stone | null,
  finished: boolean,
): GameRecordResult {
  if (!finished) {
    return "in_progress";
  }
  if (winner === Stone.BLACK) {
    return "black_win";
  }
  if (winner === Stone.WHITE) {
    return "white_win";
  }
  return "draw";
}

function titleFor(
  record: Pick<
    GameRecord,
    "mode" | "roomId" | "aiMode" | "result" | "moveCount"
  >,
): string {
  const modeLabel =
    record.mode === "local"
      ? "로컬"
      : record.mode === "online"
        ? `온라인${record.roomId ? ` ${record.roomId}` : ""}`
        : `AI${record.aiMode ? ` · ${record.aiMode}` : ""}`;
  const resultLabel =
    record.result === "black_win"
      ? "흑승"
      : record.result === "white_win"
        ? "백승"
        : record.result === "draw"
          ? "무승부"
          : "진행중";
  return `${modeLabel} · ${record.moveCount}수 · ${resultLabel}`;
}

function uniqueIds(ids: string[] | undefined): string[] {
  return [...new Set((ids ?? []).filter(Boolean))];
}

export function createGameRecord(input: {
  mode: GameRecordMode;
  roomId?: string;
  aiMode?: AiMode;
  aiStrength?: number;
  moves?: Move[];
  winner?: Stone | null;
  finished?: boolean;
  participantIds?: string[];
}): GameRecord {
  ensureDir();
  const now = new Date().toISOString();
  const moves = input.moves ?? [];
  const finished = Boolean(input.finished);
  const winner = input.winner ?? null;
  const draft: Omit<GameRecord, "title"> = {
    id: createId(),
    mode: input.mode,
    createdAt: now,
    updatedAt: now,
    finishedAt: finished ? now : null,
    result: resultFromWinner(winner, finished),
    moveCount: moves.length,
    roomId: input.roomId,
    aiMode: input.aiMode,
    aiStrength: input.aiStrength,
    participantIds: uniqueIds(input.participantIds),
    moves,
    winner,
  };
  const record: GameRecord = {
    ...draft,
    title: titleFor(draft),
  };
  writeFileSync(recordPath(record.id), JSON.stringify(record, null, 2), "utf8");
  return record;
}

export function upsertGameRecord(record: GameRecord): GameRecord {
  ensureDir();
  const next: GameRecord = {
    ...record,
    participantIds: uniqueIds(record.participantIds),
    moveCount: record.moves.length,
    title: titleFor(record),
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(recordPath(next.id), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function addRecordParticipants(
  id: string,
  userIds: string[],
): GameRecord | null {
  const existing = getGameRecord(id);
  if (!existing) {
    return null;
  }
  return upsertGameRecord({
    ...existing,
    participantIds: uniqueIds([
      ...(existing.participantIds ?? []),
      ...userIds,
    ]),
  });
}

export function saveGameProgress(
  id: string,
  moves: Move[],
  winner: Stone | null,
  phase: "playing" | "finished",
): GameRecord | null {
  const existing = getGameRecord(id);
  if (!existing) {
    return null;
  }
  const finished = phase === "finished";
  const now = new Date().toISOString();
  return upsertGameRecord({
    ...existing,
    moves,
    winner: finished ? winner : null,
    result: resultFromWinner(finished ? winner : null, finished),
    finishedAt: finished ? (existing.finishedAt ?? now) : null,
  });
}

export function getGameRecord(id: string): GameRecord | null {
  ensureDir();
  const file = recordPath(id);
  if (!existsSync(file)) {
    return null;
  }
  try {
    const data = JSON.parse(readFileSync(file, "utf8")) as GameRecord;
    return {
      ...data,
      participantIds: uniqueIds(data.participantIds),
    };
  } catch {
    return null;
  }
}

export function listGameRecords(options?: {
  /** true면 진행 중 기록 제외 (리플레이 목록용) */
  finishedOnly?: boolean;
  /** 지정 시 해당 유저가 참가한 기록만 */
  participantUserId?: string;
}): GameRecordSummary[] {
  ensureDir();
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const records: GameRecordSummary[] = [];
  for (const file of files) {
    try {
      const data = JSON.parse(
        readFileSync(path.join(DATA_DIR, file), "utf8"),
      ) as GameRecord;
      const participantIds = uniqueIds(data.participantIds);
      if (options?.finishedOnly && data.result === "in_progress") {
        continue;
      }
      if (
        options?.participantUserId &&
        !participantIds.includes(options.participantUserId)
      ) {
        continue;
      }
      records.push({
        id: data.id,
        mode: data.mode,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        finishedAt: data.finishedAt,
        result: data.result,
        moveCount: data.moves?.length ?? data.moveCount,
        roomId: data.roomId,
        aiMode: data.aiMode,
        aiStrength: data.aiStrength,
        participantIds,
        title: titleFor(data),
      });
    } catch {
      // skip corrupt
    }
  }
  return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function userCanAccessRecord(
  record: GameRecord,
  userId: string,
): boolean {
  return uniqueIds(record.participantIds).includes(userId);
}

export function findActiveOnlineRecord(roomId: string): GameRecord | null {
  const upper = roomId.toUpperCase();
  for (const summary of listGameRecords()) {
    if (
      summary.mode === "online" &&
      summary.roomId?.toUpperCase() === upper &&
      summary.result === "in_progress"
    ) {
      return getGameRecord(summary.id);
    }
  }
  return null;
}

export function ensureOnlineRecord(
  roomId: string,
  seedMoves: Move[] = [],
  participantIds: string[] = [],
): GameRecord {
  const existing = findActiveOnlineRecord(roomId);
  if (existing) {
    let record = existing;
    if (participantIds.length > 0) {
      record =
        addRecordParticipants(existing.id, participantIds) ?? existing;
    }
    if (seedMoves.length > record.moves.length) {
      return (
        saveGameProgress(record.id, seedMoves, null, "playing") ?? record
      );
    }
    return record;
  }
  return createGameRecord({
    mode: "online",
    roomId: roomId.toUpperCase(),
    moves: seedMoves,
    finished: false,
    participantIds,
  });
}

/** 새 대국을 위해 진행중 온라인 기록을 종료 처리 */
export function closeOnlineRecord(
  roomId: string,
  moves: Move[],
  winner: Stone | null,
  phase: "playing" | "finished",
): void {
  const active = findActiveOnlineRecord(roomId);
  if (!active) {
    if (moves.length === 0) {
      return;
    }
    createGameRecord({
      mode: "online",
      roomId: roomId.toUpperCase(),
      moves,
      winner,
      finished: true,
    });
    return;
  }

  const finished = phase === "finished";
  const now = new Date().toISOString();
  upsertGameRecord({
    ...active,
    participantIds: uniqueIds(active.participantIds),
    moves,
    winner: finished ? winner : null,
    result: finished ? resultFromWinner(winner, true) : "draw",
    finishedAt: now,
  });
}
