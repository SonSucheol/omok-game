"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getForbiddenNotice,
  isForbiddenBlackCell,
  stoneLabel,
  type GameState,
} from "@/lib/game";
import {
  actionErrorMessage,
  roleToStone,
  type PlayerRole,
  type RoomSnapshot,
} from "@/lib/online";
import { useOmokSocket } from "@/hooks/useOmokSocket";
import { FloatingNotice } from "./FloatingNotice";
import { GameControls } from "./GameControls";
import { GameStatus } from "./GameStatus";
import { OmokBoard } from "./OmokBoard";
import { UndoConsentModal } from "./UndoConsentModal";

interface OnlineOmokGameProps {
  roomId: string;
}

export function OnlineOmokGame({ roomId }: OnlineOmokGameProps) {
  const { socket, connected, playerId, ready, connectError } = useOmokSocket();
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [undoPendingId, setUndoPendingId] = useState<string | null>(null);
  const [incomingUndo, setIncomingUndo] = useState<{
    requestId: string;
    requesterRole: PlayerRole;
  } | null>(null);

  const joinRoom = useCallback(() => {
    if (!socket || !playerId) {
      return;
    }

    socket.emit("room:join", { roomId, playerId }, (response) => {
      if (!response.ok || !response.snapshot) {
        setJoinError(
          actionErrorMessage(response.error, "방 입장에 실패했습니다."),
        );
        return;
      }
      setJoinError(null);
      setSnapshot(response.snapshot);
    });
  }, [socket, roomId, playerId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onState = (next: RoomSnapshot) => {
      if (next.roomId === roomId.toUpperCase()) {
        setSnapshot(next);
      }
    };

    const onError = (payload: { message: string }) => {
      setNotice(payload.message);
    };

    const onUndoRequested = (payload: {
      requestId: string;
      requesterRole: PlayerRole;
    }) => {
      setIncomingUndo(payload);
    };

    const onUndoResult = (payload: { accepted: boolean; message: string }) => {
      setUndoPendingId(null);
      setIncomingUndo(null);
      setNotice(payload.message);
    };

    socket.on("room:state", onState);
    socket.on("game:error", onError);
    socket.on("game:undo:requested", onUndoRequested);
    socket.on("game:undo:result", onUndoResult);

    if (connected) {
      joinRoom();
    }

    return () => {
      socket.off("room:state", onState);
      socket.off("game:error", onError);
      socket.off("game:undo:requested", onUndoRequested);
      socket.off("game:undo:result", onUndoResult);
    };
  }, [socket, connected, joinRoom, roomId]);

  const gameState: GameState | null = snapshot?.gameState ?? null;
  const yourRole: PlayerRole | null = snapshot?.yourRole ?? null;

  const isMyTurn =
    Boolean(gameState && yourRole) &&
    gameState!.currentPlayer === roleToStone(yourRole!);

  const canInteract =
    snapshot?.status !== "waiting" &&
    snapshot?.opponentConnected &&
    isMyTurn &&
    gameState?.phase === "playing";

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!canInteract || !gameState) {
        return;
      }

      if (
        yourRole === "black" &&
        isForbiddenBlackCell(gameState, row, col)
      ) {
        setNotice(getForbiddenNotice(gameState, row, col));
        return;
      }

      setNotice(null);
      if (!socket) {
        return;
      }
      socket.emit("game:play", { roomId, playerId, row, col }, (response) => {
        if (!response.ok && response.error) {
          setNotice(actionErrorMessage(response.error));
        }
      });
    },
    [canInteract, gameState, yourRole, socket, roomId, playerId],
  );

  const handleReset = useCallback(() => {
    if (!socket) {
      return;
    }
    setUndoPendingId(null);
    setIncomingUndo(null);
    socket.emit("game:reset", { roomId, playerId }, (response) => {
      if (!response.ok && response.error) {
        setNotice(actionErrorMessage(response.error));
        return;
      }
      setNotice(null);
    });
  }, [socket, roomId, playerId]);

  const handleUndoRequest = useCallback(() => {
    if (!socket) {
      setNotice("서버에 연결되지 않았습니다.");
      return;
    }

    setNotice(null);
    socket.emit("game:undo:request", { roomId, playerId }, (response) => {
      if (!response.ok) {
        setNotice(
          actionErrorMessage(response.error, "무르기 요청에 실패했습니다."),
        );
        return;
      }
      if (response.requestId) {
        setUndoPendingId(response.requestId);
        setNotice("상대에게 무르기 동의를 요청했습니다.");
      }
    });
  }, [socket, roomId, playerId]);

  const handleUndoBlocked = useCallback(() => {
    setNotice("지금은 무를 수 없습니다.");
  }, []);

  const respondUndo = useCallback(
    (accepted: boolean) => {
      if (!socket || !incomingUndo) {
        return;
      }

      socket.emit(
        "game:undo:respond",
        {
          roomId,
          playerId,
          requestId: incomingUndo.requestId,
          accepted,
        },
        (response) => {
          if (!response.ok && response.error) {
            setNotice(actionErrorMessage(response.error));
          }
          setIncomingUndo(null);
        },
      );
    },
    [socket, incomingUndo, roomId, playerId],
  );

  const cancelUndoRequest = useCallback(() => {
    if (!socket || !undoPendingId) {
      setUndoPendingId(null);
      setNotice("무르기 요청을 취소했습니다.");
      return;
    }

    socket.emit(
      "game:undo:cancel",
      { roomId, playerId, requestId: undoPendingId },
      () => {
        setUndoPendingId(null);
        setNotice("무르기 요청을 취소했습니다.");
      },
    );
  }, [socket, undoPendingId, roomId, playerId]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("방 코드 복사에 실패했습니다.");
    }
  };

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    if (snapshot.status === "waiting") {
      setNotice("상대를 기다리는 중입니다. 방 코드를 공유하세요.");
      return;
    }
    if (
      snapshot.status === "finished" ||
      snapshot.gameState.phase === "finished"
    ) {
      // 오목 완성 승리에는 winningCells가 있고, 퇴장 기권은 비어 있음
      const isForfeitWin =
        Boolean(snapshot.gameState.winner) &&
        snapshot.gameState.winningCells.length === 0;
      if (isForfeitWin && snapshot.gameState.winner) {
        setNotice(
          `상대가 퇴장하여 ${stoneLabel(snapshot.gameState.winner)} 승리입니다.`,
        );
        return;
      }
      setNotice((prev) => {
        if (
          prev === "상대를 기다리는 중입니다. 방 코드를 공유하세요." ||
          prev === "상대 연결이 끊어졌습니다. 재접속을 기다리는 중..." ||
          (prev?.startsWith("상대가 퇴장하여") ?? false)
        ) {
          return null;
        }
        return prev;
      });
      return;
    }
    if (!snapshot.opponentConnected) {
      setNotice("상대 연결이 끊어졌습니다. 재접속을 기다리는 중...");
      return;
    }
    setNotice((prev) => {
      if (
        prev === "상대를 기다리는 중입니다. 방 코드를 공유하세요." ||
        prev === "상대 연결이 끊어졌습니다. 재접속을 기다리는 중..." ||
        (prev?.startsWith("상대가 퇴장하여") ?? false)
      ) {
        return null;
      }
      return prev;
    });
  }, [
    snapshot?.status,
    snapshot?.opponentConnected,
    snapshot?.gameState.phase,
    snapshot?.gameState.winner,
  ]);

  if (joinError) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
          {joinError}
        </p>
        <Link
          href="/online"
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800"
        >
          로비로 돌아가기
        </Link>
      </div>
    );
  }

  if (!ready || !connected || !socket) {
    return (
      <p className="flex min-h-0 flex-1 items-center justify-center text-stone-600">
        {!ready
          ? "연결 준비 중..."
          : connectError
            ? `서버 연결 실패: ${connectError}`
            : "서버에 연결 중..."}
      </p>
    );
  }

  if (!snapshot || !gameState) {
    return (
      <p className="flex min-h-0 flex-1 items-center justify-center text-stone-600">
        방 정보를 불러오는 중...
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 sm:gap-2">
      <div className="shrink-0 space-y-1">
        <GameStatus state={gameState} title="온라인 대전" />
        <div className="flex items-center justify-center gap-2">
          <span className="rounded-lg bg-white px-2.5 py-0.5 font-mono text-sm tracking-widest text-stone-800 shadow-sm sm:px-3 sm:py-1 sm:text-base">
            {roomId.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-0.5 text-xs text-stone-700 hover:bg-stone-50 sm:px-3 sm:py-1 sm:text-sm"
          >
            {copied ? "복사됨" : "코드 복사"}
          </button>
        </div>
      </div>

      <OmokBoard
        state={gameState}
        canInteract={canInteract}
        isForbiddenCell={(row, col) =>
          yourRole === "black" &&
          isMyTurn &&
          isForbiddenBlackCell(gameState, row, col)
        }
        onCellClick={handleCellClick}
        onForbiddenAttempt={(row, col) =>
          setNotice(getForbiddenNotice(gameState, row, col))
        }
      />

      <div className="shrink-0">
        <GameControls
          state={gameState}
          onUndo={handleUndoRequest}
          onReset={handleReset}
          showUndo={
            snapshot.status !== "waiting" &&
            snapshot.opponentConnected &&
            gameState.phase === "playing"
          }
          undoPending={undoPendingId !== null}
          onUndoBlocked={handleUndoBlocked}
        />
      </div>

      <FloatingNotice message={notice} />

      <UndoConsentModal
        open={undoPendingId !== null}
        title="무르기 요청 중"
        message="상대방의 동의를 기다리는 중입니다."
        waiting
        onConfirm={() => undefined}
        onReject={cancelUndoRequest}
      />

      <UndoConsentModal
        open={incomingUndo !== null}
        title="무르기 요청"
        message={`상대(${stoneLabel(roleToStone(incomingUndo?.requesterRole ?? "black"))})가 무르기를 요청했습니다. 동의하시겠습니까?`}
        confirmLabel="동의 (무르기)"
        rejectLabel="거절"
        onConfirm={() => respondUndo(true)}
        onReject={() => respondUndo(false)}
      />
    </div>
  );
}
