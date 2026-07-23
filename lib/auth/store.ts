import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { hashPassword, verifyPassword } from "./password";
import type { PublicUser, SessionRecord, UserRecord } from "./types";
import { SESSION_DAYS } from "./types";

const USERS_DIR = path.join(process.cwd(), "data", "users");
const SESSIONS_DIR = path.join(process.cwd(), "data", "sessions");

function ensureDirs(): void {
  if (!existsSync(USERS_DIR)) {
    mkdirSync(USERS_DIR, { recursive: true });
  }
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function userPath(id: string): string {
  return path.join(USERS_DIR, `${id}.json`);
}

function sessionPath(token: string): string {
  return path.join(SESSIONS_DIR, `${token}.json`);
}

function createUserId(): string {
  return `u-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

function normalizeNickname(nickname: string): string {
  return nickname.trim();
}

function nicknameKey(nickname: string): string {
  return normalizeNickname(nickname).toLowerCase();
}

function toPublic(user: UserRecord): PublicUser {
  return {
    id: user.id,
    nickname: user.nickname,
    createdAt: user.createdAt,
  };
}

function readUser(id: string): UserRecord | null {
  ensureDirs();
  const file = userPath(id);
  if (!existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(file, "utf8")) as UserRecord;
  } catch {
    return null;
  }
}

function writeUser(user: UserRecord): void {
  ensureDirs();
  writeFileSync(userPath(user.id), JSON.stringify(user, null, 2), "utf8");
}

export function findUserByNickname(nickname: string): UserRecord | null {
  ensureDirs();
  const key = nicknameKey(nickname);
  if (!key) {
    return null;
  }
  const files = readdirSync(USERS_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const user = JSON.parse(
        readFileSync(path.join(USERS_DIR, file), "utf8"),
      ) as UserRecord;
      if (nicknameKey(user.nickname) === key) {
        return user;
      }
    } catch {
      // skip
    }
  }
  return null;
}

export function getUserById(id: string): PublicUser | null {
  const user = readUser(id);
  return user ? toPublic(user) : null;
}

export function getUserRecordById(id: string): UserRecord | null {
  return readUser(id);
}

export type AuthError =
  | "NICKNAME_TAKEN"
  | "INVALID_NICKNAME"
  | "INVALID_PASSWORD"
  | "INVALID_CREDENTIALS";

export function registerUser(
  nickname: string,
  password: string,
): { user: PublicUser } | { error: AuthError } {
  const nick = normalizeNickname(nickname);
  if (nick.length < 2 || nick.length > 16) {
    return { error: "INVALID_NICKNAME" };
  }
  if (!/^[\w가-힣.-]+$/u.test(nick)) {
    return { error: "INVALID_NICKNAME" };
  }
  if (password.length < 4 || password.length > 72) {
    return { error: "INVALID_PASSWORD" };
  }
  if (findUserByNickname(nick)) {
    return { error: "NICKNAME_TAKEN" };
  }

  const user: UserRecord = {
    id: createUserId(),
    nickname: nick,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  writeUser(user);
  return { user: toPublic(user) };
}

export function authenticateUser(
  nickname: string,
  password: string,
): { user: PublicUser } | { error: AuthError } {
  const user = findUserByNickname(nickname);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "INVALID_CREDENTIALS" };
  }
  return { user: toPublic(user) };
}

export function createSession(userId: string): SessionRecord {
  ensureDirs();
  const token = createSessionToken();
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  const session: SessionRecord = {
    token,
    userId,
    expiresAt: expires.toISOString(),
  };
  writeFileSync(sessionPath(token), JSON.stringify(session, null, 2), "utf8");
  return session;
}

export function getSession(token: string | undefined | null): SessionRecord | null {
  if (!token) {
    return null;
  }
  ensureDirs();
  const file = sessionPath(token);
  if (!existsSync(file)) {
    return null;
  }
  try {
    const session = JSON.parse(readFileSync(file, "utf8")) as SessionRecord;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      unlinkSync(file);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function destroySession(token: string | undefined | null): void {
  if (!token) {
    return;
  }
  ensureDirs();
  const file = sessionPath(token);
  if (existsSync(file)) {
    unlinkSync(file);
  }
}

export function getUserFromSessionToken(
  token: string | undefined | null,
): PublicUser | null {
  const session = getSession(token);
  if (!session) {
    return null;
  }
  return getUserById(session.userId);
}
