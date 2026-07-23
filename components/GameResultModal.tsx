"use client";

import { Stone, isDraw, stoneLabel, type GameState } from "@/lib/game";

interface GameResultModalProps {
  open: boolean;
  state: GameState;
  /** 인간 시점 돌. 없으면 승자 돌 기준으로만 표시 */
  perspective?: Stone | null;
  onClose: () => void;
  onNewGame?: () => void;
}

export function GameResultModal({
  open,
  state,
  perspective = null,
  onClose,
  onNewGame,
}: GameResultModalProps) {
  if (!open || state.phase !== "finished") {
    return null;
  }

  let title = "대국 종료";
  let message = "결과가 결정되었습니다.";

  if (isDraw(state)) {
    title = "무승부";
    message = "더 이상 둘 곳이 없습니다.";
  } else if (state.winner) {
    if (perspective != null) {
      if (state.winner === perspective) {
        title = "승리";
        message = "축하합니다!";
      } else {
        title = "패배";
        message = `${stoneLabel(state.winner)}이 이겼습니다.`;
      }
    } else {
      title = `${stoneLabel(state.winner)} 승리`;
      message = `${stoneLabel(state.winner)}이 이겼습니다.`;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-result-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <h2
          id="game-result-title"
          className="text-2xl font-bold text-stone-900"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm text-stone-600">{message}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {onNewGame && (
            <button
              type="button"
              onClick={onNewGame}
              className="flex-1 rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-800"
            >
              새 게임
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={[
              "rounded-lg px-4 py-3 text-sm font-medium",
              onNewGame
                ? "flex-1 border border-stone-300 text-stone-700 hover:bg-stone-50"
                : "w-full bg-amber-700 font-semibold text-white hover:bg-amber-800",
            ].join(" ")}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
