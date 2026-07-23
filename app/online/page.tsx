"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { actionErrorMessage } from "@/lib/online";
import type { FriendListItem } from "@/lib/friends";
import { useOmokSocket } from "@/hooks/useOmokSocket";
import { useAuth } from "@/components/AuthProvider";
import { ShareAccessUrl } from "@/components/ShareAccessUrl";
import { MobileBackButton } from "@/components/MobileBackButton";

export default function OnlineLobbyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    socket,
    connected,
    playerId,
    ready,
    connectError,
    presenceRegistered,
  } = useOmokSocket();
  const [roomCode, setRoomCode] = useState("");
  const [inviteNickname, setInviteNickname] = useState("");
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviteWaiting, setInviteWaiting] = useState<string | null>(null);
  const [loading, setLoading] = useState<
    "create" | "join" | "invite" | null
  >(null);

  const goToRoom = useCallback(
    (roomId: string) => {
      router.push(`/online/room/${roomId.toUpperCase()}`);
    },
    [router],
  );

  useEffect(() => {
    if (!user) {
      setFriends([]);
      return;
    }
    void (async () => {
      const res = await fetch("/api/friends", { credentials: "include" });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as { friends: FriendListItem[] };
      setFriends(data.friends);
    })();
  }, [user]);

  useEffect(() => {
    if (!socket) {
      return;
    }
    const onResolved = (payload: {
      inviteId: string;
      accepted: boolean;
      roomId?: string;
      message: string;
    }) => {
      if (inviteWaiting && payload.inviteId !== inviteWaiting) {
        return;
      }
      setInviteWaiting(null);
      setLoading(null);
      if (payload.accepted && payload.roomId) {
        goToRoom(payload.roomId);
        return;
      }
      setError(payload.message);
    };
    socket.on("invite:resolved", onResolved);
    return () => {
      socket.off("invite:resolved", onResolved);
    };
  }, [socket, inviteWaiting, goToRoom]);

  const handleCreate = () => {
    if (!ready || !socket) {
      setError("연결을 준비하는 중입니다. 잠시 후 다시 시도하세요.");
      return;
    }
    if (!connected) {
      setError(connectError ?? "서버에 연결되지 않았습니다.");
      return;
    }

    setLoading("create");
    setError(null);
    socket.emit("room:create", { playerId }, (response) => {
      setLoading(null);
      if (!response.ok || !response.snapshot) {
        setError("방 생성에 실패했습니다.");
        return;
      }
      goToRoom(response.snapshot.roomId);
    });
  };

  const handleJoin = () => {
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError("방 코드를 입력하세요.");
      return;
    }
    if (!ready || !socket) {
      setError("연결을 준비하는 중입니다. 잠시 후 다시 시도하세요.");
      return;
    }
    if (!connected) {
      setError(connectError ?? "서버에 연결되지 않았습니다.");
      return;
    }

    setLoading("join");
    setError(null);
    socket.emit("room:join", { roomId: code, playerId }, (response) => {
      setLoading(null);
      if (!response.ok) {
        setError(actionErrorMessage(response.error, "방 입장에 실패했습니다."));
        return;
      }
      goToRoom(code);
    });
  };

  const sendInvite = (opts: { toNickname?: string; toUserId?: string }) => {
    if (!user) {
      setError("초대는 로그인이 필요합니다. 우측 상단에서 로그인하세요.");
      return;
    }
    if (!presenceRegistered) {
      setError("온라인 등록 중입니다. 잠시 후 다시 시도하세요.");
      return;
    }
    if (!ready || !socket || !connected) {
      setError("서버에 연결되지 않았습니다.");
      return;
    }

    setLoading("invite");
    setError(null);
    setInviteWaiting(null);
    socket.emit(
      "invite:send",
      { playerId, toNickname: opts.toNickname, toUserId: opts.toUserId },
      (response) => {
        setLoading(null);
        if (!response.ok || !response.inviteId) {
          setError(actionErrorMessage(response.error, "초대에 실패했습니다."));
          return;
        }
        setInviteWaiting(response.inviteId);
      },
    );
  };

  return (
    <main className="screen-shell relative px-3 py-2 sm:px-4 sm:py-3">
      <MobileBackButton href="/" />
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col pt-8 md:pt-0">
        <div className="screen-scroll flex flex-col gap-3 sm:gap-4">
          <div className="shrink-0 text-center">
            <h1 className="text-[clamp(1.25rem,4vw,1.875rem)] font-bold text-stone-900">
              온라인 대전
            </h1>
            <p className="mt-1 text-xs text-stone-600 sm:text-sm">
              {user
                ? "방 코드 · 친구 · 닉네임으로 대국하세요."
                : "게스트는 방 코드로 대국할 수 있습니다."}
            </p>
            <p className="mt-0.5 text-[11px] text-stone-500 sm:text-xs">
              {!ready
                ? "연결 준비 중..."
                : connected
                  ? "서버 연결됨"
                  : connectError
                    ? `연결 실패: ${connectError}`
                    : "서버 연결 중..."}
            </p>
            <p className="mt-1 text-[11px] font-medium text-stone-600">
              {authLoading
                ? "로그인 확인 중…"
                : user
                  ? `로그인: ${user.nickname}${presenceRegistered ? "" : " · 연결 준비 중…"}`
                  : "게스트 (친구 초대 불가)"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={!ready || !connected || loading !== null}
            className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none sm:py-3 sm:text-base"
          >
            {loading === "create" ? "생성 중..." : "새 방 만들기 (흑)"}
          </button>

          <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
            <label
              htmlFor="room-code"
              className="text-xs font-medium text-stone-700 sm:text-sm"
            >
              방 코드로 입장 (백)
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="room-code"
                value={roomCode}
                onChange={(event) =>
                  setRoomCode(event.target.value.toUpperCase())
                }
                maxLength={6}
                placeholder="예: ABC123"
                className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 font-mono tracking-widest uppercase outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={!ready || !connected || loading !== null}
                className="shrink-0 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50 sm:px-4 sm:text-sm"
              >
                {loading === "join" ? "입장 중..." : "입장"}
              </button>
            </div>
          </div>

          {user ? (
            <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
              <p className="text-xs font-medium text-stone-700 sm:text-sm">
                친구 / 닉네임 초대
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  value={inviteNickname}
                  onChange={(e) => setInviteNickname(e.target.value)}
                  placeholder="닉네임"
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  disabled={!ready || !connected || loading !== null}
                  onClick={() =>
                    sendInvite({ toNickname: inviteNickname.trim() })
                  }
                  className="shrink-0 rounded-lg bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50 sm:text-sm"
                >
                  {loading === "invite" ? "초대 중..." : "초대"}
                </button>
              </div>
              {friends.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {friends.map((friend) => (
                    <li
                      key={friend.friendshipId}
                      className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-stone-800">
                        {friend.nickname}
                      </span>
                      <button
                        type="button"
                        disabled={!ready || !connected || loading !== null}
                        onClick={() =>
                          sendInvite({ toUserId: friend.userId })
                        }
                        className="rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-stone-100 disabled:opacity-50"
                      >
                        초대
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] text-stone-500">
                상대가 접속 중이면 바로 초대가 표시됩니다.{" "}
                <Link href="/friends" className="text-amber-800 hover:underline">
                  친구 관리
                </Link>
              </p>
            </div>
          ) : (
            <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
              친구·닉네임 초대는{" "}
              <Link href="/login?next=/online" className="font-medium text-amber-800 hover:underline">
                로그인
              </Link>
              후 이용할 수 있습니다.
            </p>
          )}

          <ShareAccessUrl />

          {inviteWaiting && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm">
              초대를 보냈습니다. 상대에게 수락/거절 팝업이 표시되며, 수락하면
              대국실로 이동합니다.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 sm:text-sm"
            >
              {error}
            </p>
          )}

          <div className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600 sm:px-4 sm:py-3 sm:text-sm">
            <p className="font-medium text-stone-800">다른 기기에서 접속</p>
            <ul className="mt-1.5 list-inside list-disc space-y-1">
              <li>
                같은 Wi-Fi: 서버 시작 시 안내되는 주소(또는 sslip.io)로 접속
              </li>
              <li>
                다른 네트워크:{" "}
                <code className="rounded bg-white px-1">npm run dev:public</code>{" "}
                후 Cloudflare 주소 사용
              </li>
            </ul>
          </div>
        </div>

        <Link
          href="/"
          className="shrink-0 py-2 text-center text-xs text-stone-500 hover:text-stone-800 sm:text-sm"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
