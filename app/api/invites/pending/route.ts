import { NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGES, getSessionUserFromRequest } from "@/lib/auth";
import {
  getPresenceDebug,
  listPendingInvitesForUser,
} from "@/lib/online/presence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  console.log(
    `[omok:login] GET /api/invites/pending session=${user ? user.nickname : "NONE"}`,
  );

  if (!user) {
    return NextResponse.json(
      {
        loggedIn: false,
        invites: [],
        error: "UNAUTHORIZED",
        message: AUTH_ERROR_MESSAGES.UNAUTHORIZED,
      },
      { status: 401 },
    );
  }

  const invites = listPendingInvitesForUser(user.id);
  const debug = getPresenceDebug();
  console.log(`[omok:invite] pending for ${user.nickname}: ${invites.length}`, {
    invites: invites.map((i) => i.id),
    debug,
  });

  return NextResponse.json({
    loggedIn: true,
    invites,
    debug: {
      me: user.nickname,
      myUserId: user.id,
      ...debug,
      iAmOnline: debug.onlineUserIds.includes(user.id),
    },
  });
}
