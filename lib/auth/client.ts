import type { PublicUser } from "@/lib/auth";

export async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) {
    return null;
  }
  const data = (await res.json()) as { user: PublicUser | null };
  return data.user;
}

export async function registerAccount(
  nickname: string,
  password: string,
): Promise<{ user: PublicUser } | { error: string; message: string }> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });
  const data = (await res.json()) as {
    user?: PublicUser;
    error?: string;
    message?: string;
  };
  if (!res.ok || !data.user) {
    return {
      error: data.error ?? "REGISTER_FAILED",
      message: data.message ?? "회원가입에 실패했습니다.",
    };
  }
  return { user: data.user };
}

export async function loginAccount(
  nickname: string,
  password: string,
): Promise<{ user: PublicUser } | { error: string; message: string }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname, password }),
  });
  const data = (await res.json()) as {
    user?: PublicUser;
    error?: string;
    message?: string;
  };
  if (!res.ok || !data.user) {
    return {
      error: data.error ?? "LOGIN_FAILED",
      message: data.message ?? "로그인에 실패했습니다.",
    };
  }
  return { user: data.user };
}

export async function logoutAccount(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}
