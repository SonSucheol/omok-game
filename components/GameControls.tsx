"use client";

import { canUndo } from "@/lib/game";
import type { GameState } from "@/lib/game";

interface GameControlsProps {
  state: GameState;
  onUndo: () => void;
  onReset: () => void;
  showUndo?: boolean;
  undoPending?: boolean;
  onUndoBlocked?: () => void;
}

export function GameControls({
  state,
  onUndo,
  onReset,
  showUndo = true,
  undoPending = false,
  onUndoBlocked,
}: GameControlsProps) {
  const handleUndoClick = () => {
    if (undoPending) {
      return;
    }
    if (!canUndo(state)) {
      onUndoBlocked?.();
      return;
    }
    onUndo();
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {showUndo && (
        <button
          type="button"
          onClick={handleUndoClick}
          disabled={undoPending}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2 sm:text-sm"
        >
          {undoPending ? "동의 대기 중..." : "무르기"}
        </button>
      )}
      <button
        type="button"
        onClick={onReset}
        className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-amber-800 sm:px-4 sm:py-2 sm:text-sm"
      >
        새 게임
      </button>
    </div>
  );
}
