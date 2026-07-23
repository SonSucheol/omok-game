import { NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGES, getSessionUserFromRequest } from "@/lib/auth";
import { getPresenceDebug, setUserPresence } from "@/lib/online/presence";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  console.log(
    `[omok:login] POST /api/presence/register session=${user ? `${user.nickname}(${user.id})` : "NONE"}`,
  );

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        loggedIn: false,
        error: "UNAUTHORIZED",
        message: AUTH_ERROR_MESSAGES.UNAUTHORIZED,
      },
      { status: 401 },
    );
  }

  const body = (await request.json()) as { socketId?: string };
  if (!body.socketId) {
    return NextResponse.json(
      { ok: false, loggedIn: true, error: "MISSING_SOCKET_ID" },
      { status: 400 },
    );
  }

  setUserPresence(user.id, body.socketId);
  const debug = getPresenceDebug();
  console.log(`[omok:login] registered`, {
    user: user.nickname,
    socketId: body.socketId,
    debug,
  });

  return NextResponse.json({
    ok: true,
    loggedIn: true,
    user: { id: user.id, nickname: user.nickname },
    socketId: body.socketId,
    debug,
  });
}

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  return NextResponse.json({
    loggedIn: Boolean(user),
    user: user ? { id: user.id, nickname: user.nickname } : null,
    debug: getPresenceDebug(),
  });
}
