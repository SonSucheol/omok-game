"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  AI_MODE_LABEL,
  aiThinkMs,
  challengeStrengthFromStreak,
  chooseAiMove,
  readChallengeStreak,
  resolveAiStrength,
  writeChallengeStreak,
  type AiMode,
  type AiStrength,
} from "@/lib/ai";
import {
  Stone,
  canUndo,
  createInitialState,
  getForbiddenNotice,
  getMoveRejectReason,
  isForbiddenBlackCell,
  playMove,
  resetGame,
  undoMove,
  type GameState,
} from "@/lib/game";
import { AiDifficultyModal } from "./AiDifficultyModal";
import { ChallengeClearModal } from "./ChallengeClearModal";
import { ChallengeContinueModal } from "./ChallengeContinueModal";
import { FloatingNotice } from "./FloatingNotice";
import { GameControls } from "./GameControls";
import { GameResultModal } from "./GameResultModal";
import { GameStatus } from "./GameStatus";
import { OmokBoard } from "./OmokBoard";
import { useSaveFinishedGame } from "@/hooks/useSaveFinishedGame";

const HUMAN_STONE = Stone.BLACK;

type GameAction =
  | { type: "PLAY"; row: number; col: number }
  | { type: "UNDO_PAIR" }
  | { type: "RESET" }
  | { type: "FORCE_WIN"; winner: Stone };

type ContinuePrompt = {
  winStreak: number;
  clearedStrength: AiStrength;
  nextStrength: AiStrength;
};

function undoPair(state: GameState): GameState {
  let next = undoMove(state);
  if (!next) {
    return state;
  }
  if (next.phase === "playing" && next.history.length > 0) {
    next = undoMove(next) ?? next;
  }
  return next;
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "PLAY": {
      const next = playMove(state, action.row, action.col);
      return next ?? state;
    }
    case "UNDO_PAIR":
      return undoPair(state);
    case "RESET":
      return resetGame();
    case "FORCE_WIN":
      if (state.phase !== "playing") {
        return state;
      }
      return {
        ...state,
        phase: "finished",
        winner: action.winner,
        winningCells: [],
      };
    default:
      return state;
  }
}

interface AiOmokGameProps {
  initialMode: AiMode;
}

export function AiOmokGame({ initialMode }: AiOmokGameProps) {
  const [mode, setMode] = useState<AiMode>(initialMode);
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [showClearModal, setShowClearModal] = useState(false);
  const [continuePrompt, setContinuePrompt] = useState<ContinuePrompt | null>(
    null,
  );
  const [difficultyOpen, setDifficultyOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);

  const gameIdRef = useRef(0);
  const handledGameIdRef = useRef<number | null>(null);
  const forceWinLockRef = useRef(false);
  const modalActionLockRef = useRef(false);
  const stateRef = useRef(state);
  const streakRef = useRef(0);
  stateRef.current = state;
  streakRef.current = challengeStreak;

  const strength: AiStrength =
    mode === "challenge"
      ? challengeStrengthFromStreak(challengeStreak)
      : resolveAiStrength(mode);

  useSaveFinishedGame(state, {
    mode: "ai",
    aiMode: mode,
    aiStrength: strength,
  });

  const awaitingChoice = continuePrompt !== null || showClearModal;

  useEffect(() => {
    if (mode === "challenge") {
      const stored = readChallengeStreak();
      setChallengeStreak(stored);
      streakRef.current = stored;
    }
  }, [mode]);

  const beginNewGame = useCallback((options?: { notice?: string | null }) => {
    modalActionLockRef.current = false;
    forceWinLockRef.current = false;
    handledGameIdRef.current = gameIdRef.current;
    gameIdRef.current += 1;
    setAiThinking(false);
    setShowClearModal(false);
    setContinuePrompt(null);
    setResultOpen(false);
    if (options && "notice" in options) {
      setNotice(options.notice ?? null);
    }
    dispatch({ type: "RESET" });
  }, []);

  useEffect(() => {
    if (state.phase === "playing") {
      handledGameIdRef.current = null;
      forceWinLockRef.current = false;
      modalActionLockRef.current = false;
    }
  }, [state.phase]);

  const isHumanTurn =
    state.phase === "playing" &&
    state.currentPlayer === HUMAN_STONE &&
    !awaitingChoice;

  useEffect(() => {
    if (
      awaitingChoice ||
      state.phase !== "playing" ||
      state.currentPlayer === HUMAN_STONE
    ) {
      setAiThinking(false);
      return;
    }

    let cancelled = false;
    setAiThinking(true);

    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }
      const current = stateRef.current;
      if (
        current.phase !== "playing" ||
        current.currentPlayer === HUMAN_STONE
      ) {
        setAiThinking(false);
        return;
      }

      const move = chooseAiMove(
        current,
        mode,
        Math.random,
        streakRef.current,
      );
      setAiThinking(false);
      if (!move) {
        setNotice("AI가 둘 곳을 찾지 못했습니다.");
        return;
      }
      dispatch({ type: "PLAY", row: move.row, col: move.col });
    }, aiThinkMs(strength));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    awaitingChoice,
    state.phase,
    state.currentPlayer,
    state.history.length,
    mode,
    strength,
  ]);

  useEffect(() => {
    if (state.phase !== "finished") {
      return;
    }
    if (awaitingChoice) {
      return;
    }
    if (handledGameIdRef.current === gameIdRef.current) {
      return;
    }
    handledGameIdRef.current = gameIdRef.current;

    if (!state.winner) {
      setResultOpen(true);
      return;
    }

    if (mode !== "challenge") {
      setResultOpen(true);
      return;
    }

    const streakNow = streakRef.current;
    const strengthNow = challengeStrengthFromStreak(streakNow);

    if (state.winner !== HUMAN_STONE) {
      streakRef.current = 0;
      setChallengeStreak(0);
      writeChallengeStreak(0);
      setResultOpen(true);
      return;
    }

    const nextStreak = streakNow + 1;
    const nextStrength = challengeStrengthFromStreak(nextStreak);

    if (strengthNow === 10) {
      streakRef.current = nextStreak;
      setChallengeStreak(nextStreak);
      writeChallengeStreak(nextStreak);
      setShowClearModal(true);
      return;
    }

    setContinuePrompt({
      winStreak: nextStreak,
      clearedStrength: strengthNow,
      nextStrength,
    });
  }, [state.phase, state.winner, mode, awaitingChoice]);

  const handleContinueChallenge = useCallback(() => {
    if (!continuePrompt || modalActionLockRef.current) {
      return;
    }
    modalActionLockRef.current = true;

    const { winStreak, nextStrength } = continuePrompt;
    streakRef.current = winStreak;
    setChallengeStreak(winStreak);
    writeChallengeStreak(winStreak);

    handledGameIdRef.current = gameIdRef.current;
    beginNewGame({
      notice: `연승 도전! Lv.${nextStrength} 대국을 시작합니다.`,
    });
  }, [continuePrompt, beginNewGame]);

  const handleQuitChallenge = useCallback(() => {
    if (modalActionLockRef.current) {
      return;
    }
    modalActionLockRef.current = true;

    streakRef.current = 0;
    setChallengeStreak(0);
    writeChallengeStreak(0);
    handledGameIdRef.current = gameIdRef.current;
    beginNewGame({ notice: "연승 도전을 그만두었습니다." });
  }, [beginNewGame]);

  const handleClearConfirm = useCallback(() => {
    if (modalActionLockRef.current) {
      return;
    }
    modalActionLockRef.current = true;
    handledGameIdRef.current = gameIdRef.current;
    beginNewGame({ notice: null });
  }, [beginNewGame]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!isHumanTurn || aiThinking || awaitingChoice) {
        return;
      }

      const reason = getMoveRejectReason(state, row, col);
      if (
        reason === "double_three" ||
        reason === "double_four" ||
        reason === "overline"
      ) {
        setNotice(getForbiddenNotice(state, row, col));
        return;
      }
      if (reason !== null) {
        return;
      }

      setNotice(null);
      dispatch({ type: "PLAY", row, col });
    },
    [isHumanTurn, aiThinking, awaitingChoice, state],
  );

  const handleReset = useCallback(() => {
    if (awaitingChoice || modalActionLockRef.current) {
      return;
    }
    beginNewGame({ notice: null });
  }, [awaitingChoice, beginNewGame]);

  const handleUndo = useCallback(() => {
    if (awaitingChoice || !canUndo(state) || aiThinking) {
      if (!awaitingChoice) {
        setNotice("지금은 무를 수 없습니다.");
      }
      return;
    }
    setNotice("한 수(나와 AI)를 무르었습니다.");
    forceWinLockRef.current = false;
    setResultOpen(false);
    if (handledGameIdRef.current === gameIdRef.current) {
      handledGameIdRef.current = null;
    }
    dispatch({ type: "UNDO_PAIR" });
  }, [awaitingChoice, state, aiThinking]);

  const handleUndoBlocked = useCallback(() => {
    setNotice("지금은 무를 수 없습니다.");
  }, []);

  const handleForceWin = useCallback(() => {
    if (
      awaitingChoice ||
      state.phase !== "playing" ||
      forceWinLockRef.current ||
      handledGameIdRef.current === gameIdRef.current
    ) {
      return;
    }
    forceWinLockRef.current = true;
    setAiThinking(false);
    dispatch({ type: "FORCE_WIN", winner: HUMAN_STONE });
  }, [awaitingChoice, state.phase]);

  const handleSelectDifficulty = useCallback(
    (next: AiMode) => {
      setDifficultyOpen(false);
      if (next === mode && state.phase === "playing" && state.history.length === 0) {
        return;
      }
      setMode(next);
      if (next === "challenge") {
        const stored = readChallengeStreak();
        streakRef.current = stored;
        setChallengeStreak(stored);
      }
      beginNewGame({ notice: null });
    },
    [mode, state.phase, state.history.length, beginNewGame],
  );

  const title = `AI 대전 (${AI_MODE_LABEL[mode]})`;
  const streakDetail =
    mode === "challenge" ? `연승 ${challengeStreak}` : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 sm:gap-2">
      <GameStatus state={state} title={title} detail={streakDetail} />
      <OmokBoard
        state={state}
        canInteract={isHumanTurn && !aiThinking}
        isForbiddenCell={(row, col) =>
          isHumanTurn && isForbiddenBlackCell(state, row, col)
        }
        onCellClick={handleCellClick}
        onForbiddenAttempt={(row, col) =>
          setNotice(getForbiddenNotice(state, row, col))
        }
      />
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
        <GameControls
          state={state}
          onUndo={handleUndo}
          onReset={handleReset}
          onUndoBlocked={handleUndoBlocked}
        />
        <button
          type="button"
          onClick={() => setDifficultyOpen(true)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 sm:px-4 sm:py-2 sm:text-sm"
        >
          난이도 변경
        </button>
        {state.phase === "playing" && !awaitingChoice && (
          <button
            type="button"
            onClick={handleForceWin}
            className="rounded-lg border border-dashed border-rose-400 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 sm:px-4 sm:py-2 sm:text-sm"
          >
            QA · 강제 승리
          </button>
        )}
      </div>
      <FloatingNotice message={notice} />
      <AiDifficultyModal
        open={difficultyOpen}
        current={mode}
        onSelect={handleSelectDifficulty}
        onClose={() => setDifficultyOpen(false)}
      />
      <GameResultModal
        open={resultOpen && !awaitingChoice}
        state={state}
        perspective={HUMAN_STONE}
        onClose={() => setResultOpen(false)}
        onNewGame={handleReset}
      />
      <ChallengeContinueModal
        open={continuePrompt !== null}
        winStreak={continuePrompt?.winStreak ?? 0}
        clearedStrength={continuePrompt?.clearedStrength ?? 7}
        nextStrength={continuePrompt?.nextStrength ?? 7}
        onContinue={handleContinueChallenge}
        onQuit={handleQuitChallenge}
      />
      <ChallengeClearModal
        open={showClearModal}
        onClose={handleClearConfirm}
      />
    </div>
  );
}
