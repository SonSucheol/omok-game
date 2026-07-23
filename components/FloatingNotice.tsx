"use client";

interface FloatingNoticeProps {
  message: string | null;
}

/** 레이아웃을 밀지 않는 고정 알림 */
export function FloatingNotice({ message }: FloatingNoticeProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[9000] max-w-md -translate-x-1/2 rounded-lg border border-stone-200 bg-white px-4 py-2 text-center text-sm font-medium text-stone-800 shadow-lg"
    >
      {message}
    </div>
  );
}
