"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/lib/online/events";
import { getPlayerId, getSocketUrl } from "@/lib/online/client";
import { useAuth } from "@/components/AuthProvider";

type OmokSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface OmokSocketContextValue {
  socket: OmokSocket | null;
  connected: boolean;
  playerId: string;
  ready: boolean;
  connectError: string | null;
  /** HTTP 세션 기준 presence 등록 완료 */
  presenceRegistered: boolean;
}

const OmokSocketContext = createContext<OmokSocketContextValue | null>(null);

async function registerPresence(socketId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/presence/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socketId }),
    });
    const data = (await res.json()) as { ok?: boolean };
    return Boolean(res.ok && data.ok);
  } catch {
    return false;
  }
}

export function OmokSocketProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [socket, setSocket] = useState<OmokSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [presenceRegistered, setPresenceRegistered] = useState(false);

  const authKey = authLoading ? "loading" : (user?.id ?? "guest");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    setPlayerId(getPlayerId());
    setReady(false);
    setConnected(false);
    setPresenceRegistered(false);

    const instance = io(getSocketUrl(), {
      autoConnect: true,
      withCredentials: true,
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      forceNew: true,
    }) as OmokSocket;

    setSocket(instance);

    const onConnect = () => {
      setConnected(true);
      setConnectError(null);
      setReady(true);

      if (user && instance.id) {
        void registerPresence(instance.id).then((ok) => {
          setPresenceRegistered(ok);
        });
      } else {
        setPresenceRegistered(false);
      }
    };

    const onDisconnect = () => {
      setConnected(false);
      setPresenceRegistered(false);
    };

    const onConnectError = (error: Error) => {
      setConnected(false);
      setReady(true);
      setConnectError(error.message || "서버 연결에 실패했습니다.");
    };

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);
    instance.on("connect_error", onConnectError);

    if (instance.connected) {
      onConnect();
    }

    return () => {
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.off("connect_error", onConnectError);
      instance.disconnect();
    };
    // authKey 변경 시 재연결 (로그인/로그아웃)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey, authLoading]);

  const value = useMemo(
    () => ({
      socket,
      connected,
      playerId,
      ready,
      connectError,
      presenceRegistered,
    }),
    [socket, connected, playerId, ready, connectError, presenceRegistered],
  );

  return (
    <OmokSocketContext.Provider value={value}>
      {children}
    </OmokSocketContext.Provider>
  );
}

export function useOmokSocket(): OmokSocketContextValue {
  const context = useContext(OmokSocketContext);
  if (!context) {
    throw new Error("useOmokSocket must be used within OmokSocketProvider");
  }
  return context;
}

export type { OmokSocket };
