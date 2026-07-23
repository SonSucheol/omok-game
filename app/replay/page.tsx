import { redirect } from "next/navigation";
import { GameShell } from "@/components/GameShell";
import { ReplayList } from "@/components/ReplayList";
import { getSessionUser } from "@/lib/auth/session-rsc";

export default async function ReplayPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/replay");
  }

  return (
    <GameShell backHref="/">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="shrink-0 text-center">
          <h1 className="text-[clamp(1.25rem,4vw,1.875rem)] font-bold text-stone-900">
            리플레이
          </h1>
          <p className="mt-1 text-xs text-stone-600 sm:text-sm">
            내가 플레이한 종료 대국만 확인할 수 있습니다.
          </p>
        </div>
        <div className="screen-scroll flex flex-col items-center">
          <ReplayList />
        </div>
      </div>
    </GameShell>
  );
}
