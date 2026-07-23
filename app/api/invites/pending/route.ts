import { NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGES, getSessionUserFromRequest } from "@/lib/auth";
import { listPendingInvitesForUser } from "@/lib/online/presence";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);

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

  return NextResponse.json({
    loggedIn: true,
    invites,
  });
}
