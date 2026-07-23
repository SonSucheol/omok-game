import type { ReactNode } from "react";
import { GameNav } from "./GameNav";
import { MobileBackButton } from "./MobileBackButton";

interface GameShellProps {
  children: ReactNode;
  showLobby?: boolean;
  /** 네비 없이 콘텐츠만 (리플레이 상세 등) */
  hideNav?: boolean;
  footer?: ReactNode;
  /** 모바일 뒤로가기 목적지 (기본: 홈) */
  backHref?: string;
}

export function GameShell({
  children,
  showLobby = false,
  hideNav = false,
  footer,
  backHref = "/",
}: GameShellProps) {
  return (
    <main className="screen-shell relative px-2 py-1.5 sm:px-4 sm:py-2">
      <MobileBackButton href={backHref} />
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col pt-8 md:pt-0">
        {children}
      </div>
      {footer}
      {!hideNav && !footer && (
        <div className="mx-auto w-full max-w-3xl shrink-0">
          <GameNav showLobby={showLobby} />
        </div>
      )}
    </main>
  );
}
