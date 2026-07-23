import { Suspense } from "react";
import { AuthBar } from "@/components/AuthBar";
import { HomeMenu } from "@/components/HomeMenu";

export default function Home() {
  return (
    <main className="screen-shell relative px-3 py-3 sm:px-4 sm:py-4">
      <AuthBar />
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col items-center gap-3 pt-10 text-center sm:gap-4 sm:pt-8">
        <div className="shrink-0">
          <h1 className="text-[clamp(1.75rem,6vw,2.25rem)] font-bold tracking-tight text-stone-900">
            오목
          </h1>
          <p className="mt-1 text-xs text-stone-600 sm:text-sm">
            omok-game · 15×15 표준 오목
          </p>
        </div>

        <div className="screen-scroll w-full">
          <Suspense
            fallback={<p className="text-sm text-stone-500">불러오는 중...</p>}
          >
            <HomeMenu />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
