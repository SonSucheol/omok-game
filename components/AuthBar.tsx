"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

/** 우측 상단 고정 로그인/계정 영역 */
export function AuthBar() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="fixed right-3 top-3 z-[8000] text-xs text-stone-500 sm:right-4 sm:top-4 sm:text-sm">
        ...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed right-3 top-3 z-[8000] flex items-center gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
        <Link
          href="/register"
          className="hidden rounded-lg border border-stone-300 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-sm backdrop-blur hover:bg-stone-50 sm:inline-block sm:text-sm"
        >
          회원가입
        </Link>
        <Link
          href="/login"
          className="rounded-lg bg-amber-700 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-800 sm:px-3 sm:text-sm"
        >
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed right-3 top-3 z-[8000] flex max-w-[70vw] flex-wrap items-center justify-end gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
      <span className="truncate text-xs font-medium text-stone-800 sm:text-sm">
        {user.nickname}
      </span>
      <Link
        href="/friends"
        className="rounded-lg border border-stone-300 bg-white/95 px-2.5 py-1.5 text-xs text-stone-700 shadow-sm backdrop-blur hover:bg-stone-50 sm:text-sm"
      >
        친구
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className="rounded-lg border border-stone-300 bg-white/95 px-2.5 py-1.5 text-xs text-stone-700 shadow-sm backdrop-blur hover:bg-stone-50 sm:text-sm"
      >
        로그아웃
      </button>
    </div>
  );
}
