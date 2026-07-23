"use client";

import {
  AI_MODE_BASE_STRENGTH,
  AI_MODE_LABEL,
  CHALLENGE_BASE_STRENGTH,
  type AiMode,
} from "@/lib/ai";

const MODES: AiMode[] = ["beginner", "intermediate", "advanced", "challenge"];

interface AiDifficultyModalProps {
  open: boolean;
  current: AiMode;
  onSelect: (mode: AiMode) => void;
  onClose: () => void;
}

function hint(mode: AiMode): string {
  if (mode === "challenge") {
    return `Lv.${CHALLENGE_BASE_STRENGTH} → 7 → 8 → 9 → 10`;
  }
  return `Lv.${AI_MODE_BASE_STRENGTH[mode]} / 10`;
}

export function AiDifficultyModal({
  open,
  current,
  onSelect,
  onClose,
}: AiDifficultyModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-difficulty-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="ai-difficulty-title"
          className="text-lg font-semibold text-stone-900"
        >
          난이도 변경
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          변경하면 새 대국으로 시작합니다.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {MODES.map((level) => {
            const selected = current === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => onSelect(level)}
                className={[
                  "rounded-lg px-4 py-2 text-sm font-medium transition",
                  selected
                    ? "bg-amber-700 text-white"
                    : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
                ].join(" ")}
              >
                {AI_MODE_LABEL[level]}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-stone-500">{hint(current)}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
