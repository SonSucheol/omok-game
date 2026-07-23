"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { MobileBackButton } from "@/components/MobileBackButton";

function LoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    router.replace(next);
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(nickname, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(next);
  };

  return (
    <main className="screen-shell relative px-3 py-4 sm:px-4">
      <MobileBackButton href="/" />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 pt-8 md:pt-0">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900">로그인</h1>
          <p className="mt-1 text-sm text-stone-600">
            닉네임과 비밀번호로 로그인하세요.
          </p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-left text-sm font-medium text-stone-700">
            닉네임
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
              autoComplete="username"
              required
            />
          </label>
          <label className="text-left text-sm font-medium text-stone-700">
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {submitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
        <p className="text-center text-sm text-stone-600">
          계정이 없나요?{" "}
          <Link href="/register" className="font-medium text-amber-800 hover:underline">
            회원가입
          </Link>
        </p>
        <Link href="/" className="text-center text-sm text-stone-500 hover:text-stone-800">
          게스트로 계속하기
        </Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-stone-600">불러오는 중...</p>}>
      <LoginForm />
    </Suspense>
  );
}
