import { NextResponse } from "next/server";
import { AUTH_ERROR_MESSAGES, getSessionUserFromRequest } from "@/lib/auth";
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
} from "@/lib/friends";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: AUTH_ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 },
    );
  }

  return NextResponse.json({
    friends: listFriends(user.id),
    incoming: listIncomingRequests(user.id),
    outgoing: listOutgoingRequests(user.id),
  });
}
