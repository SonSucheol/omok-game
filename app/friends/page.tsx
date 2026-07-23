"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { MobileBackButton } from "@/components/MobileBackButton";
import type { FriendListItem, FriendRequestItem } from "@/lib/friends";

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch("/api/friends", { credentials: "include" });
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as {
      friends: FriendListItem[];
      incoming: FriendRequestItem[];
      outgoing: FriendRequestItem[];
    };
    setFriends(data.friends);
    setIncoming(data.incoming);
    setOutgoing(data.outgoing);
  }, []);

  useEffect(() => {
    if (user) {
      void reload();
    }
  }, [user, reload]);

  if (!loading && !user) {
    return (
      <main className="screen-shell items-center justify-center px-4">
        <div className="text-center">
          <p className="text-stone-700">친구 기능은 로그인이 필요합니다.</p>
          <Link
            href="/login?next=/friends"
            className="mt-4 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            로그인
          </Link>
        </div>
      </main>
    );
  }

  const onRequest = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    const data = (await res.json()) as { message?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.message ?? "요청에 실패했습니다.");
      return;
    }
    setNickname("");
    setMessage("친구 요청을 보냈습니다.");
    await reload();
  };

  const respond = async (requestId: string, accept: boolean) => {
    setBusy(true);
    setError(null);
    await fetch("/api/friends/respond", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, accept }),
    });
    setBusy(false);
    await reload();
  };

  return (
    <main className="screen-shell relative px-3 py-3 sm:px-4">
      <MobileBackButton href="/" />
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-3 pt-8 md:pt-0">
        <div className="shrink-0 text-center">
          <h1 className="text-2xl font-bold text-stone-900">친구</h1>
          <p className="mt-1 text-sm text-stone-600">
            닉네임으로 요청하고, 수락하면 서로 친구가 됩니다.
          </p>
        </div>

        <div className="screen-scroll flex flex-col gap-4">
          <form onSubmit={onRequest} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
            <label className="text-sm font-medium text-stone-700">
              닉네임으로 친구 요청
              <div className="mt-2 flex gap-2">
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-500"
                  placeholder="닉네임"
                  required
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="shrink-0 rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  요청
                </button>
              </div>
            </label>
          </form>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          )}

          <section>
            <h2 className="mb-2 text-sm font-semibold text-stone-800">
              받은 요청 ({incoming.length})
            </h2>
            {incoming.length === 0 ? (
              <p className="text-xs text-stone-500">받은 요청이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {incoming.map((req) => (
                  <li
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <span>{req.fromNickname}</span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void respond(req.id, true)}
                        className="rounded bg-amber-700 px-2 py-1 text-xs text-white hover:bg-amber-800"
                      >
                        수락
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void respond(req.id, false)}
                        className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
                      >
                        거절
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-stone-800">
              보낸 요청 ({outgoing.length})
            </h2>
            {outgoing.length === 0 ? (
              <p className="text-xs text-stone-500">보낸 요청이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {outgoing.map((req) => (
                  <li
                    key={req.id}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
                  >
                    {req.toNickname} · 대기 중
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-stone-800">
              친구 목록 ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <p className="text-xs text-stone-500">아직 친구가 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {friends.map((friend) => (
                  <li
                    key={friend.friendshipId}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-800"
                  >
                    {friend.nickname}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <Link
          href="/"
          className="shrink-0 py-1 text-center text-sm text-stone-500 hover:text-stone-800"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
