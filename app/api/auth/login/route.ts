import { NextResponse } from "next/server";
import {
  AUTH_ERROR_MESSAGES,
  authenticateUser,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      nickname?: string;
      password?: string;
    };
    const result = authenticateUser(body.nickname ?? "", body.password ?? "");
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, message: AUTH_ERROR_MESSAGES[result.error] },
        { status: 401 },
      );
    }

    const session = createSession(result.user.id);
    const response = NextResponse.json({ user: result.user });
    setSessionCookie(response, session.token);
    return response;
  } catch {
    return NextResponse.json({ error: "LOGIN_FAILED" }, { status: 500 });
  }
}
