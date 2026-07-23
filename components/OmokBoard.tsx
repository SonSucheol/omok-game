"use client";

import {
  Stone,
  isWinningCell,
  type GameState,
} from "@/lib/game";

interface OmokBoardProps {
  state: GameState;
  canInteract?: boolean;
  isForbiddenCell: (row: number, col: number) => boolean;
  onCellClick: (row: number, col: number) => void;
  onForbiddenAttempt: (row: number, col: number) => void;
}

const STAR_POINTS: [number, number][] = [
  [3, 3],
  [3, 11],
  [7, 7],
  [11, 3],
  [11, 11],
];

function intersectionPercent(index: number, size: number): string {
  if (size <= 1) {
    return "0%";
  }
  return `${(index / (size - 1)) * 100}%`;
}

function StonePiece({
  stone,
  isLastMove,
  isWinning,
}: {
  stone: Stone;
  isLastMove: boolean;
  isWinning: boolean;
}) {
  if (stone === Stone.EMPTY) {
    return null;
  }

  const isBlack = stone === Stone.BLACK;

  return (
    <div
      className={[
        "relative h-full w-full rounded-full shadow-stone",
        isBlack
          ? "bg-gradient-to-br from-stone-700 via-stone-900 to-black"
          : "bg-gradient-to-br from-white via-stone-100 to-stone-300",
        isWinning
          ? "ring-2 ring-amber-300 ring-offset-1 ring-offset-transparent"
          : "",
      ].join(" ")}
    >
      {isLastMove && (
        <span
          className={[
            "absolute left-1/2 top-1/2 h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full",
            isBlack ? "bg-rose-400" : "bg-rose-500",
          ].join(" ")}
        />
      )}
    </div>
  );
}

export function OmokBoard({
  state,
  canInteract = true,
  isForbiddenCell,
  onCellClick,
  onForbiddenAttempt,
}: OmokBoardProps) {
  const size = state.board.length;
  const playable = state.phase === "playing" && canInteract;
  const spacingPercent = size > 1 ? 100 / (size - 1) : 100;
  const hitSize = `${spacingPercent * 0.95}%`;

  return (
    <div className="board-slot">
      <div className="board-frame rounded-2xl bg-board-frame p-[clamp(0.35rem,1.2cqmin,0.75rem)] shadow-2xl shadow-stone-900/30">
        <div
          className="relative h-full w-full rounded-xl bg-board-wood shadow-inner"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(255,255,255,0.12), transparent 45%), linear-gradient(180deg, #d4b06a, #b8893f)",
          }}
        >
          <div className="absolute inset-[6%]">
            {Array.from({ length: size }).map((_, index) => (
              <span
                key={`h-${index}`}
                className="pointer-events-none absolute left-0 right-0 h-px bg-board-line"
                style={{ top: intersectionPercent(index, size) }}
              />
            ))}
            {Array.from({ length: size }).map((_, index) => (
              <span
                key={`v-${index}`}
                className="pointer-events-none absolute bottom-0 top-0 w-px bg-board-line"
                style={{ left: intersectionPercent(index, size) }}
              />
            ))}

            {STAR_POINTS.map(([row, col]) => (
              <span
                key={`star-${row}-${col}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-board-line"
                style={{
                  left: intersectionPercent(col, size),
                  top: intersectionPercent(row, size),
                  width: "clamp(3px, 1.4cqmin, 10px)",
                  height: "clamp(3px, 1.4cqmin, 10px)",
                }}
              />
            ))}

            {state.board.map((row, rowIndex) =>
              row.map((stone, colIndex) => {
                const isLast =
                  state.lastMove?.row === rowIndex &&
                  state.lastMove?.col === colIndex;
                const isWin = isWinningCell(
                  state.winningCells,
                  rowIndex,
                  colIndex,
                );
                const isEmpty = stone === Stone.EMPTY;
                const isForbidden =
                  playable && isEmpty && isForbiddenCell(rowIndex, colIndex);

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    aria-label={`${rowIndex + 1}행 ${colIndex + 1}열`}
                    aria-disabled={isForbidden}
                    disabled={!playable || !isEmpty}
                    onClick={() => {
                      if (isForbidden) {
                        onForbiddenAttempt(rowIndex, colIndex);
                        return;
                      }
                      onCellClick(rowIndex, colIndex);
                    }}
                    className={[
                      "absolute -translate-x-1/2 -translate-y-1/2 rounded-full",
                      isForbidden
                        ? "cursor-not-allowed hover:bg-rose-400/25"
                        : playable && isEmpty
                          ? "cursor-pointer hover:bg-amber-900/15"
                          : "cursor-default",
                    ].join(" ")}
                    style={{
                      left: intersectionPercent(colIndex, size),
                      top: intersectionPercent(rowIndex, size),
                      width: hitSize,
                      height: hitSize,
                    }}
                  >
                    <StonePiece
                      stone={stone}
                      isLastMove={isLast}
                      isWinning={isWin}
                    />
                  </button>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
