import { NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGES, getSessionUserFromRequest } from "@/lib/auth";
import { FRIEND_ERROR_MESSAGES, respondFriendRequest } from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: AUTH_ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    requestId?: string;
    accept?: boolean;
  };

  if (!body.requestId || typeof body.accept !== "boolean") {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const result = respondFriendRequest(user.id, body.requestId, body.accept);
  if ("error" in result) {
    return NextResponse.json(
      {
        error: result.error,
        message: FRIEND_ERROR_MESSAGES[result.error],
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ friendship: result.friendship });
}
