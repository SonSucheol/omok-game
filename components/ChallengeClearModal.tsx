"use client";

interface ChallengeClearModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChallengeClearModal({ open, onClose }: ChallengeClearModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-clear-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="text-sm font-medium text-amber-700">도전 난이도 10</p>
        <h2
          id="challenge-clear-title"
          className="mt-2 text-2xl font-bold text-stone-900"
        >
          축하합니다!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          최고 난이도(10) AI를 이겼습니다.
          <br />
          연승 도전의 정점에 도달하셨네요.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-800"
        >
          확인
        </button>
      </div>
    </div>
  );
}
