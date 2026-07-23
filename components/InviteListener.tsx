"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOmokSocket } from "@/hooks/useOmokSocket";
import { useAuth } from "@/components/AuthProvider";
import type { GameInvite } from "@/lib/online";

interface PendingResponse {
  invites: GameInvite[];
}

export function InviteListener() {
  const { socket, playerId, ready } = useOmokSocket();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [invite, setInvite] = useState<GameInvite | null>(null);
  const [inbox, setInbox] = useState<GameInvite[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenIds = useRef(new Set<string>());

  const pullPending = useCallback(async () => {
    if (!user) {
      setInbox([]);
      return;
    }
    try {
      const res = await fetch("/api/invites/pending", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as PendingResponse;
      const list = data.invites ?? [];
      setInbox(list);

      for (const item of list) {
        if (!seenIds.current.has(item.id)) {
          seenIds.current.add(item.id);
          setInvite(item);
          break;
        }
      }

      setInvite((current) => {
        if (current) {
          return current;
        }
        return list[0] ?? null;
      });
    } catch {
      // 폴링 실패는 다음 주기에 재시도
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    void pullPending();
    const timer = window.setInterval(() => {
      void pullPending();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [user, pullPending]);

  useEffect(() => {
    if (!socket) {
      return;
    }
    const onInvite = (payload: { invite: GameInvite }) => {
      seenIds.current.add(payload.invite.id);
      setError(null);
      setInvite(payload.invite);
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
      return;
    }
    setBusy(true);
    setError(null);
    socket.emit(
      "invite:respond",
      { playerId, inviteId: invite.id, accept },
      (response) => {
        setBusy(false);
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

  if (authLoading || !user) {
    return null;
  }

  return (
    <>
      {inbox.length > 0 && (
        <div className="fixed bottom-3 right-3 z-[9000]">
          <button
            type="button"
            onClick={() => setInvite(inbox[0]!)}
            className="animate-pulse rounded-full bg-amber-700 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-amber-800"
          >
            대국 초대 {inbox.length}건
          </button>
        </div>
      )}

      {invite && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2
              id="invite-dialog-title"
              className="text-lg font-semibold text-stone-900"
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
