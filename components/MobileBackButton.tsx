"use client";

import { useRouter } from "next/navigation";

interface MobileBackButtonProps {
  /** 지정 시 해당 경로로 이동, 없으면 history back */
  href?: string;
  label?: string;
}

export function MobileBackButton({
  href,
  label = "뒤로",
}: MobileBackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (href) {
          router.push(href);
          return;
        }
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push("/");
      }}
      className="fixed left-3 top-3 z-[8000] flex items-center gap-1 rounded-lg border border-stone-300 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-sm backdrop-blur hover:bg-stone-50 sm:left-4 sm:top-4 sm:px-3 sm:text-sm md:hidden"
      aria-label={label}
    >
      <span aria-hidden="true">←</span>
      {label}
    </button>
  );
}
