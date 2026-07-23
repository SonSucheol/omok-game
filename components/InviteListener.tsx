"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOmokSocket } from "@/hooks/useOmokSocket";
import { useAuth } from "@/components/AuthProvider";
import type { GameInvite } from "@/lib/online";

interface PendingResponse {
  loggedIn?: boolean;
  invites: GameInvite[];
  debug?: {
    me: string;
    myUserId: string;
    onlineUserIds: string[];
    onlinePairs: { userId: string; socketId: string }[];
    pendingInviteCount: number;
    pendingInvites: { id: string; from: string; to: string }[];
    iAmOnline: boolean;
  };
}

function openInvite(invite: GameInvite, setInvite: (i: GameInvite) => void) {
  console.log("[omok:invite] OPEN POPUP", invite);
  setInvite(invite);
}

export function InviteListener() {
  const { socket, connected, playerId, ready, presenceRegistered } =
    useOmokSocket();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [invite, setInvite] = useState<GameInvite | null>(null);
  const [inbox, setInbox] = useState<GameInvite[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [debug, setDebug] = useState<PendingResponse["debug"] | null>(null);
  const seenIds = useRef(new Set<string>());

  const pullPending = useCallback(async () => {
    if (!user) {
      setInbox([]);
      setDebug(null);
      return;
    }
    try {
      const res = await fetch("/api/invites/pending", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as PendingResponse;
      console.log("[omok:login] pending poll", {
        status: res.status,
        loggedIn: data.loggedIn,
        count: data.invites?.length ?? 0,
        debug: data.debug,
      });

      if (!res.ok) {
        return;
      }

      const list = data.invites ?? [];
      setInbox(list);
      setDebug(data.debug ?? null);

      // 새 초대가 있으면 즉시 팝업
      for (const item of list) {
        if (!seenIds.current.has(item.id)) {
          seenIds.current.add(item.id);
          openInvite(item, setInvite);
          break;
        }
      }

      // 팝업이 없고 대기 초대가 있으면 첫 건 표시
      setInvite((current) => {
        if (current) {
          return current;
        }
        return list[0] ?? null;
      });
    } catch (e) {
      console.warn("[omok:invite] pending poll failed", e);
    }
  }, [user]);

  // 로그인 상태 로그
  useEffect(() => {
    console.log("[omok:login] InviteListener auth", {
      authLoading,
      loggedIn: Boolean(user),
      nickname: user?.nickname ?? null,
      socketConnected: connected,
      presenceRegistered,
    });
  }, [user, authLoading, connected, presenceRegistered]);

  // presence 등록 후 / 주기적으로 초대 폴링
  useEffect(() => {
    if (!user) {
      return;
    }
    void pullPending();
    const timer = window.setInterval(() => {
      void pullPending();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [user, presenceRegistered, pullPending]);

  // 소켓 실시간 수신
  useEffect(() => {
    if (!socket) {
      return;
    }
    const onInvite = (payload: { invite: GameInvite }) => {
      console.log("[omok:invite] socket event invite:received", payload);
      seenIds.current.add(payload.invite.id);
      setError(null);
      openInvite(payload.invite, setInvite);
      setInbox((prev) => {
        if (prev.some((i) => i.id === payload.invite.id)) {
          return prev;
        }
        return [payload.invite, ...prev];
      });
    };
    const onResolved = (payload: {
      inviteId: string;
      accepted: boolean;
      roomId?: string;
      message: string;
    }) => {
      console.log("[omok:invite] socket event invite:resolved", payload);
      if (payload.accepted && payload.roomId) {
        router.push(`/online/room/${payload.roomId}`);
      }
    };
    socket.on("invite:received", onInvite);
    socket.on("invite:resolved", onResolved);
    return () => {
      socket.off("invite:received", onInvite);
      socket.off("invite:resolved", onResolved);
    };
  }, [socket, router]);

  const respond = (accept: boolean) => {
    if (!socket || !ready || !invite) {
      console.warn("[omok:invite] respond blocked", {
        hasSocket: Boolean(socket),
        ready,
        hasInvite: Boolean(invite),
      });
      return;
    }
    setBusy(true);
    setError(null);
    console.log("[omok:invite] respond", { accept, inviteId: invite.id });
    socket.emit(
      "invite:respond",
      { playerId, inviteId: invite.id, accept },
      (response) => {
        setBusy(false);
        console.log("[omok:invite] respond ack", response);
        if (!response.ok) {
          setError(
            response.error === "INVITER_OFFLINE"
              ? "초대자가 접속을 종료했습니다."
              : "초대 처리에 실패했습니다.",
          );
          return;
        }
        setInbox((prev) => prev.filter((i) => i.id !== invite.id));
        setInvite(null);
        if (accept && response.roomId) {
          router.push(`/online/room/${response.roomId}`);
        }
      },
    );
  };

  if (authLoading) {
    return null;
  }

  // 게스트: 작은 상태만
  if (!user) {
    return (
      <div className="fixed bottom-3 left-3 z-[9000] rounded-lg border border-stone-300 bg-white/95 px-2 py-1 text-[10px] text-stone-500 shadow-sm">
        게스트 (초대 수신 불가)
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-3 right-3 z-[9000] flex max-w-[min(100vw-1.5rem,20rem)] flex-col items-end gap-2">
        {inbox.length > 0 && (
          <button
            type="button"
            onClick={() => openInvite(inbox[0]!, setInvite)}
            className="animate-pulse rounded-full bg-amber-700 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-amber-800"
          >
            대국 초대 {inbox.length}건 — 눌러서 확인
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setPanelOpen((v) => !v);
            void pullPending();
          }}
          className={[
            "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium shadow-sm",
            user && presenceRegistered
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-amber-300 bg-amber-50 text-amber-900",
          ].join(" ")}
        >
          {user.nickname} ·{" "}
          {presenceRegistered ? "로그인·온라인" : "로그인·오프라인등록중"}
          {inbox.length > 0 ? ` · 초대${inbox.length}` : ""}
        </button>

        {panelOpen && (
          <div className="w-full rounded-xl border border-stone-200 bg-white p-3 text-[11px] text-stone-700 shadow-lg">
            <p className="font-semibold text-stone-900">로그인 / 초대 상태</p>
            <ul className="mt-2 space-y-1">
              <li>1. HTTP 로그인: 예 ({user.nickname})</li>
              <li>2. 소켓 연결: {connected ? "예" : "아니오"}</li>
              <li>
                3. Presence 등록: {presenceRegistered ? "예" : "아니오"}
              </li>
              <li>4. 대기 초대: {inbox.length}건</li>
              {debug && (
                <li>
                  5. 서버 온라인 유저: {debug.onlineUserIds.length}명
                  {debug.iAmOnline ? " (나 포함)" : " (나 없음!)"}
                </li>
              )}
            </ul>
            {inbox.length > 0 && (
              <ul className="mt-2 border-t border-stone-100 pt-2">
                {inbox.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2 py-1">
                    <span>
                      {item.fromNickname} → 나
                    </span>
                    <button
                      type="button"
                      className="font-medium text-amber-800 underline"
                      onClick={() => openInvite(item, setInvite)}
                    >
                      열기
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mt-2 text-amber-800 underline"
              onClick={() => void pullPending()}
            >
              상태 새로고침
            </button>
          </div>
        )}
      </div>

      {invite && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-xs font-medium text-amber-700">로그인 확인됨</p>
            <h2
              id="invite-dialog-title"
              className="mt-1 text-lg font-semibold text-stone-900"
            >
              대국 초대
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              <span className="font-medium text-stone-800">
                {invite.fromNickname}
              </span>
              님이 온라인 대국에 초대했습니다.
            </p>
            {error && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {error}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(true)}
                className="flex-1 rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {busy ? "처리 중..." : "수락"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(false)}
                className="flex-1 rounded-lg border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                거절
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
