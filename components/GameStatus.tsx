"use client";

import { isDraw, stoneLabel, type GameState } from "@/lib/game";

interface GameStatusProps {
  state: GameState;
  title: string;
  detail?: string | null;
}

export function GameStatus({ state, title, detail = null }: GameStatusProps) {
  let message = `${stoneLabel(state.currentPlayer)} 차례`;

  if (state.phase === "finished" && state.winner) {
    message = `${stoneLabel(state.winner)} 승리!`;
  } else if (isDraw(state)) {
    message = "무승부";
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 text-center sm:gap-1">
      <h1 className="text-[clamp(1.1rem,3.5vw,1.75rem)] font-bold leading-tight tracking-tight text-stone-900">
        {title}
      </h1>
      {detail != null && detail !== "" && (
        <p className="text-[clamp(0.7rem,2vw,0.875rem)] font-medium leading-tight text-stone-600">
          {detail}
        </p>
      )}
      <div
        className={[
          "rounded-full px-4 py-1 text-[clamp(0.85rem,2.4vw,1.1rem)] font-semibold shadow-sm",
          state.phase === "finished"
            ? "bg-amber-100 text-amber-900"
            : "bg-white text-stone-800",
        ].join(" ")}
      >
        {message}
      </div>
    </div>
  );
}
