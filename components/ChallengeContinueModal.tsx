"use client";

interface ChallengeContinueModalProps {
  open: boolean;
  winStreak: number;
  clearedStrength: number;
  nextStrength: number;
  onContinue: () => void;
  onQuit: () => void;
}

export function ChallengeContinueModal({
  open,
  winStreak,
  clearedStrength,
  nextStrength,
  onContinue,
  onQuit,
}: ChallengeContinueModalProps) {
  if (!open) {
    return null;
  }

  const levelUp = nextStrength > clearedStrength;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-continue-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="text-sm font-medium text-amber-700">
          연승 {winStreak} · Lv.{clearedStrength} 클리어
        </p>
        <h2
          id="challenge-continue-title"
          className="mt-2 text-xl font-bold text-stone-900"
        >
          다음 단계에 도전할까요?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          {levelUp
            ? `다음 대국 난이도는 Lv.${nextStrength}입니다.`
            : `다음 대국도 Lv.${nextStrength}입니다.`}
          <br />
          로그인 없이도 이 브라우저에서 연승이 이어집니다.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onQuit}
            className="rounded-lg border border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 sm:flex-1"
          >
            그만두기
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-800 sm:flex-1"
          >
            연승 도전
          </button>
        </div>
      </div>
    </div>
  );
}
