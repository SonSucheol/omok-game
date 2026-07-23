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
    const data = (await res.json()) as {
      ok?: boolean;
      loggedIn?: boolean;
      user?: { nickname: string };
    };
    console.log("[omok:login] client registerPresence", {
      status: res.status,
      ...data,
    });
    return Boolean(res.ok && data.ok);
  } catch (e) {
    console.warn("[omok:login] registerPresence failed", e);
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
    console.log("[omok:login] AuthProvider state", {
      authLoading,
      loggedIn: Boolean(user),
      nickname: user?.nickname ?? null,
      userId: user?.id ?? null,
    });
  }, [user, authLoading]);

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
      console.log("[omok:login] socket connected", {
        socketId: instance.id,
        authKey,
        loggedIn: Boolean(user),
      });

      if (user && instance.id) {
        void registerPresence(instance.id).then((ok) => {
          setPresenceRegistered(ok);
        });
      } else {
        setPresenceRegistered(false);
        console.log("[omok:login] guest — presence skip");
      }
    };

    const onDisconnect = () => {
      setConnected(false);
      setPresenceRegistered(false);
      console.log("[omok:login] socket disconnected");
    };

    const onConnectError = (error: Error) => {
      setConnected(false);
      setReady(true);
      setConnectError(error.message || "서버 연결에 실패했습니다.");
      console.warn("[omok:login] socket connect_error", error.message);
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
    // user nickname only for logging; authKey drives reconnect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey, authLoading]);

  // 로그인 직후 소켓이 이미 연결된 경우 presence 재등록
  useEffect(() => {
    if (!user || !socket?.connected || !socket.id) {
      return;
    }
    void registerPresence(socket.id).then((ok) => {
      setPresenceRegistered(ok);
    });
  }, [user, socket, connected]);

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
