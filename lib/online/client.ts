function createPlayerId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // HTTP(비보안) 환경 — 모바일 sslip.io 접속 등
    }
  }

  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getPlayerId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const key = "omok-player-id";

  try {
    const existing = sessionStorage.getItem(key);
    if (existing) {
      return existing;
    }

    const id = createPlayerId();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return createPlayerId();
  }
}

export function getSocketUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return process.env.NEXT_PUBLIC_SOCKET_URL ?? window.location.origin;
}
