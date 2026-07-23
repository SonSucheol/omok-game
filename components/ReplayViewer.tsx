"use client";

import { useMemo, useState } from "react";
import type { GameRecord } from "@/lib/records";
import { buildStateAtMove } from "@/lib/records/replay";
import { OmokBoard } from "./OmokBoard";

interface ReplayViewerProps {
  record: GameRecord;
}

export function ReplayViewer({ record }: ReplayViewerProps) {
  const max = record.moves.length;
  const [cursor, setCursor] = useState(max);

  const state = useMemo(
    () => buildStateAtMove(record.moves, cursor),
    [record.moves, cursor],
  );

  const currentMove = cursor > 0 ? record.moves[cursor - 1] : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 sm:gap-2">
      <div className="shrink-0 text-center">
        <h1 className="text-[clamp(1rem,3vw,1.5rem)] font-bold leading-tight text-stone-900">
          {record.title}
        </h1>
        <p className="mt-0.5 text-[clamp(0.7rem,2vw,0.875rem)] text-stone-600">
          {cursor} / {max}수
          {currentMove
            ? ` · 마지막: ${currentMove.stone === 1 ? "흑" : "백"} (${currentMove.row + 1}, ${currentMove.col + 1})`
            : " · 시작 전"}
        </p>
      </div>

      <OmokBoard
        state={state}
        canInteract={false}
        isForbiddenCell={() => false}
        onCellClick={() => undefined}
        onForbiddenAttempt={() => undefined}
      />

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setCursor(0)}
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 sm:px-3 sm:py-2 sm:text-sm"
        >
          처음
        </button>
        <button
          type="button"
          onClick={() => setCursor((c) => Math.max(0, c - 1))}
          disabled={cursor <= 0}
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-40 sm:px-3 sm:py-2 sm:text-sm"
        >
          이전 수
        </button>
        <button
          type="button"
          onClick={() => setCursor((c) => Math.min(max, c + 1))}
          disabled={cursor >= max}
          className="rounded-lg bg-amber-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-40 sm:px-3 sm:py-2 sm:text-sm"
        >
          다음 수
        </button>
        <button
          type="button"
          onClick={() => setCursor(max)}
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs text-stone-700 hover:bg-stone-50 sm:px-3 sm:py-2 sm:text-sm"
        >
          마지막
        </button>
      </div>
    </div>
  );
}
