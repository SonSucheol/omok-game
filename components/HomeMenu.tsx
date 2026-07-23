"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AI_MODE_BASE_STRENGTH,
  AI_MODE_LABEL,
  type AiMode,
} from "@/lib/ai";
import { useAuth } from "@/components/AuthProvider";

const MODES: AiMode[] = ["beginner", "intermediate", "advanced", "challenge"];

function modeHint(mode: AiMode): string {
  if (mode === "challenge") {
    return `Lv.7 → 7 → 8 → 9 → 10 (연승 시 상승)`;
  }
  return `난이도 Lv.${AI_MODE_BASE_STRENGTH[mode]} / 10`;
}

export function HomeMenu() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [aiOpen, setAiOpen] = useState(false);
  const [mode, setMode] = useState<AiMode>("beginner");

  useEffect(() => {
    if (searchParams.get("ai") === "1") {
      setAiOpen(true);
    }
  }, [searchParams]);

  const enterAi = () => {
    router.push(`/local-ai?difficulty=${mode}`);
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid w-full gap-2 sm:grid-cols-2 sm:gap-3">
        <Link
          href="/local"
          className="rounded-xl border border-stone-200 bg-white p-3 text-center shadow-sm transition hover:border-amber-300 hover:shadow-md sm:p-4"
        >
          <h2 className="text-base font-semibold text-stone-900 sm:text-lg">
            로컬 대전
          </h2>
          <p className="mt-1 text-xs text-stone-600 sm:text-sm">
            같은 화면에서 2인이 번갈아 둡니다.
          </p>
        </Link>

        <Link
          href="/online"
          className="rounded-xl border border-stone-200 bg-white p-3 text-center shadow-sm transition hover:border-amber-300 hover:shadow-md sm:p-4"
        >
          <h2 className="text-base font-semibold text-stone-900 sm:text-lg">
            온라인 대전
          </h2>
          <p className="mt-1 text-xs text-stone-600 sm:text-sm">
            방 코드{user ? "·친구·닉네임" : ""}으로 대국합니다.
          </p>
        </Link>

        {user ? (
          <Link
            href="/replay"
            className="rounded-xl border border-stone-200 bg-white p-3 text-center shadow-sm transition hover:border-amber-300 hover:shadow-md sm:col-span-2 sm:p-4"
          >
            <h2 className="text-base font-semibold text-stone-900 sm:text-lg">
              리플레이
            </h2>
            <p className="mt-1 text-xs text-stone-600 sm:text-sm">
              내가 플레이한 대국을 1수씩 다시 봅니다.
            </p>
          </Link>
        ) : (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3 text-center sm:col-span-2 sm:p-4">
            <h2 className="text-base font-semibold text-stone-500 sm:text-lg">
              리플레이
            </h2>
            <p className="mt-1 text-xs text-stone-500 sm:text-sm">
              로그인 후 본인 대국만 볼 수 있습니다.
            </p>
            {!loading && (
              <Link
                href="/login?next=/replay"
                className="mt-2 inline-block text-xs font-medium text-amber-800 hover:underline sm:text-sm"
              >
                로그인하기
              </Link>
            )}
          </div>
        )}

        <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:col-span-2 sm:p-4">
          <button
            type="button"
            onClick={() => setAiOpen((open) => !open)}
            className="w-full text-center"
          >
            <h2 className="text-base font-semibold text-stone-900 sm:text-lg">
              AI 대전
            </h2>
            <p className="mt-1 text-xs text-stone-600 sm:text-sm">
              초급·중급·고급·도전 난이도를 고른 뒤 입장하세요.
            </p>
          </button>

          {aiOpen && (
            <div className="mt-3 border-t border-stone-100 pt-3 text-center">
              <p className="mb-2 text-xs font-medium text-stone-700 sm:text-sm">
                난이도
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
                {MODES.map((level) => {
                  const selected = mode === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setMode(level)}
                      className={[
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm",
                        selected
                          ? "bg-amber-700 text-white"
                          : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50",
                      ].join(" ")}
                    >
                      {AI_MODE_LABEL[level]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-stone-500 sm:text-xs">
                {modeHint(mode)}
              </p>
              <button
                type="button"
                onClick={enterAi}
                className="mt-3 w-full rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-800 sm:w-auto sm:min-w-40 sm:py-2.5 sm:text-sm"
              >
                AI 대전 입장
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
