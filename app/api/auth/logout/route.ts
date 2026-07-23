import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  destroySession,
  parseCookieHeader,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = parseCookieHeader(
    request.headers.get("cookie") ?? undefined,
    SESSION_COOKIE,
  );
  destroySession(token);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
