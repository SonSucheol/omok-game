import type { NextResponse } from "next/server";
import { getUserFromSessionToken } from "./store";
import type { PublicUser } from "./types";
import { SESSION_COOKIE, SESSION_DAYS } from "./types";

export function parseCookieHeader(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

/** API Route용 — next/headers cookies() 미사용 (tsx/custom server ALS 충돌 방지) */
export function getSessionUserFromRequest(request: Request): PublicUser | null {
  const token = parseCookieHeader(
    request.headers.get("cookie") ?? undefined,
    SESSION_COOKIE,
  );
  return getUserFromSessionToken(token);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  NICKNAME_TAKEN: "이미 사용 중인 닉네임입니다.",
  INVALID_NICKNAME: "닉네임은 2~16자, 한글/영문/숫자/._- 만 가능합니다.",
  INVALID_PASSWORD: "비밀번호는 4자 이상이어야 합니다.",
  INVALID_CREDENTIALS: "닉네임 또는 비밀번호가 올바르지 않습니다.",
  UNAUTHORIZED: "로그인이 필요합니다.",
};
