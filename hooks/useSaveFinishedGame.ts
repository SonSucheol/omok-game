"use client";

import { useEffect, useRef } from "react";
import type { AiMode } from "@/lib/ai";
import type { GameState } from "@/lib/game";
import { postGameRecord } from "@/lib/records/client";
import type { GameRecordMode } from "@/lib/records";

export function useSaveFinishedGame(
  state: GameState,
  options: {
    mode: GameRecordMode;
    aiMode?: AiMode;
    aiStrength?: number;
    roomId?: string;
    enabled?: boolean;
  },
): void {
  const savedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (options.enabled === false) {
      return;
    }
    if (state.phase !== "finished" || state.history.length === 0) {
      return;
    }

    const key = `${options.mode}-${state.history.length}-${state.winner}-${state.history.map((m) => `${m.row},${m.col}`).join(";")}`;
    if (savedKeyRef.current === key) {
      return;
    }
    savedKeyRef.current = key;

    void postGameRecord({
      mode: options.mode,
      moves: state.history,
      winner: state.winner,
      finished: true,
      roomId: options.roomId,
      aiMode: options.aiMode,
      aiStrength: options.aiStrength,
    });
  }, [
    state.phase,
    state.winner,
    state.history,
    options.mode,
    options.aiMode,
    options.aiStrength,
    options.roomId,
    options.enabled,
  ]);
}
