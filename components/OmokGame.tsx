"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import {
  canUndo,
  createInitialState,
  getForbiddenNotice,
  getMoveRejectReason,
  isForbiddenBlackCell,
  playMove,
  resetGame,
  undoMove,
} from "@/lib/game";
import { useSaveFinishedGame } from "@/hooks/useSaveFinishedGame";
import { FloatingNotice } from "./FloatingNotice";
import { GameControls } from "./GameControls";
import { GameResultModal } from "./GameResultModal";
import { GameStatus } from "./GameStatus";
import { OmokBoard } from "./OmokBoard";
import { UndoConsentModal } from "./UndoConsentModal";

type GameAction =
  | { type: "PLAY"; row: number; col: number }
  | { type: "UNDO" }
  | { type: "RESET" };

function gameReducer(
  state: ReturnType<typeof createInitialState>,
  action: GameAction,
) {
  switch (action.type) {
    case "PLAY": {
      const next = playMove(state, action.row, action.col);
      return next ?? state;
    }
    case "UNDO": {
      const next = undoMove(state);
      return next ?? state;
    }
    case "RESET":
      return resetGame();
    default:
      return state;
  }
}

export function OmokGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [notice, setNotice] = useState<string | null>(null);
  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);

  useSaveFinishedGame(state, { mode: "local" });

  useEffect(() => {
    if (state.phase === "finished") {
      setResultOpen(true);
    }
  }, [state.phase, state.winner, state.history.length]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      const reason = getMoveRejectReason(state, row, col);

      if (
        reason === "double_three" ||
        reason === "double_four" ||
        reason === "overline"
      ) {
        setNotice(getForbiddenNotice(state, row, col));
        return;
      }

      setNotice(null);
      dispatch({ type: "PLAY", row, col });
    },
    [state],
  );

  const handleReset = useCallback(() => {
    setNotice(null);
    setUndoModalOpen(false);
    setResultOpen(false);
    dispatch({ type: "RESET" });
  }, []);

  const handleUndoRequest = useCallback(() => {
    setNotice(null);
    setUndoModalOpen(true);
  }, []);

  const handleUndoBlocked = useCallback(() => {
    setNotice("지금은 무를 수 없습니다.");
  }, []);

  const handleUndoConfirm = useCallback(() => {
    if (!canUndo(state)) {
      setUndoModalOpen(false);
      setNotice("지금은 무를 수 없습니다.");
      return;
    }
    dispatch({ type: "UNDO" });
    setUndoModalOpen(false);
    setResultOpen(false);
    setNotice("무르기가 적용되었습니다.");
  }, [state]);

  const handleUndoReject = useCallback(() => {
    setUndoModalOpen(false);
    setNotice("무르기가 취소되었습니다.");
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 sm:gap-2">
      <GameStatus state={state} title="로컬 대전" />
      <OmokBoard
        state={state}
        isForbiddenCell={(row, col) => isForbiddenBlackCell(state, row, col)}
        onCellClick={handleCellClick}
        onForbiddenAttempt={(row, col) =>
          setNotice(getForbiddenNotice(state, row, col))
        }
      />
      <div className="shrink-0">
        <GameControls
          state={state}
          onUndo={handleUndoRequest}
          onReset={handleReset}
          onUndoBlocked={handleUndoBlocked}
        />
      </div>
      <FloatingNotice message={notice} />
      <GameResultModal
        open={resultOpen}
        state={state}
        onClose={() => setResultOpen(false)}
        onNewGame={handleReset}
      />
      <UndoConsentModal
        open={undoModalOpen}
        title="무르기 동의"
        message="마지막 수를 무르시겠습니까? 상대 플레이어의 동의가 필요합니다."
        confirmLabel="동의 (무르기)"
        rejectLabel="거절"
        onConfirm={handleUndoConfirm}
        onReject={handleUndoReject}
      />
    </div>
  );
}
