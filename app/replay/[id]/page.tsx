import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { GameShell } from "@/components/GameShell";
import { ReplayViewer } from "@/components/ReplayViewer";
import { getSessionUser } from "@/lib/auth/session-rsc";
import { getGameRecord, userCanAccessRecord } from "@/lib/records";

interface ReplayDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReplayDetailPage({ params }: ReplayDetailPageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/replay");
  }

  const { id } = await params;
  const record = getGameRecord(id);
  if (!record || !userCanAccessRecord(record, user.id)) {
    notFound();
  }

  return (
    <GameShell
      hideNav
      backHref="/replay"
      footer={
        <div className="mx-auto flex w-full max-w-3xl shrink-0 flex-wrap items-center justify-center gap-3 py-1 text-xs sm:gap-4 sm:text-sm">
          <Link href="/replay" className="text-stone-500 hover:text-stone-800">
            목록
          </Link>
          <Link href="/" className="text-stone-500 hover:text-stone-800">
            홈으로
          </Link>
        </div>
      }
    >
      <ReplayViewer record={record} />
    </GameShell>
  );
}
