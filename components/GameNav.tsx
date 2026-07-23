"use client";

import Link from "next/link";

interface GameNavProps {
  showLobby?: boolean;
}

export function GameNav({ showLobby = false }: GameNavProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-1 text-xs sm:gap-4 sm:text-sm">
      <Link href="/" className="text-stone-500 hover:text-stone-800">
        홈으로
      </Link>
      {showLobby && (
        <Link href="/online" className="text-stone-500 hover:text-stone-800">
          로비로
        </Link>
      )}
    </div>
  );
}
