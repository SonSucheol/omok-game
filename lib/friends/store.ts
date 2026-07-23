import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { findUserByNickname, getUserById } from "@/lib/auth";
import type {
  FriendListItem,
  FriendRequestItem,
  FriendshipRecord,
} from "./types";

const FRIENDS_DIR = path.join(process.cwd(), "data", "friendships");

function ensureDir(): void {
  if (!existsSync(FRIENDS_DIR)) {
    mkdirSync(FRIENDS_DIR, { recursive: true });
  }
}

function friendshipPath(id: string): string {
  return path.join(FRIENDS_DIR, `${id}.json`);
}

function createId(): string {
  return `f-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

function readAll(): FriendshipRecord[] {
  ensureDir();
  const files = readdirSync(FRIENDS_DIR).filter((f) => f.endsWith(".json"));
  const list: FriendshipRecord[] = [];
  for (const file of files) {
    try {
      list.push(
        JSON.parse(
          readFileSync(path.join(FRIENDS_DIR, file), "utf8"),
        ) as FriendshipRecord,
      );
    } catch {
      // skip
    }
  }
  return list;
}

function writeFriendship(record: FriendshipRecord): void {
  ensureDir();
  writeFileSync(
    friendshipPath(record.id),
    JSON.stringify(record, null, 2),
    "utf8",
  );
}

function deleteFriendship(id: string): void {
  const file = friendshipPath(id);
  if (existsSync(file)) {
    unlinkSync(file);
  }
}

export type FriendError =
  | "USER_NOT_FOUND"
  | "CANNOT_ADD_SELF"
  | "ALREADY_FRIENDS"
  | "REQUEST_EXISTS"
  | "REQUEST_NOT_FOUND"
  | "NOT_AUTHORIZED";

export function listFriends(userId: string): FriendListItem[] {
  const items: FriendListItem[] = [];
  for (const row of readAll()) {
    if (row.status !== "accepted") {
      continue;
    }
    const otherId =
      row.fromUserId === userId
        ? row.toUserId
        : row.toUserId === userId
          ? row.fromUserId
          : null;
    if (!otherId) {
      continue;
    }
    const user = getUserById(otherId);
    if (!user) {
      continue;
    }
    items.push({
      userId: user.id,
      nickname: user.nickname,
      friendshipId: row.id,
    });
  }
  return items.sort((a, b) => a.nickname.localeCompare(b.nickname, "ko"));
}

export function listIncomingRequests(userId: string): FriendRequestItem[] {
  return readAll()
    .filter((row) => row.status === "pending" && row.toUserId === userId)
    .map((row) => {
      const from = getUserById(row.fromUserId);
      const to = getUserById(row.toUserId);
      return {
        id: row.id,
        fromUserId: row.fromUserId,
        fromNickname: from?.nickname ?? "알 수 없음",
        toUserId: row.toUserId,
        toNickname: to?.nickname ?? "알 수 없음",
        createdAt: row.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listOutgoingRequests(userId: string): FriendRequestItem[] {
  return readAll()
    .filter((row) => row.status === "pending" && row.fromUserId === userId)
    .map((row) => {
      const from = getUserById(row.fromUserId);
      const to = getUserById(row.toUserId);
      return {
        id: row.id,
        fromUserId: row.fromUserId,
        fromNickname: from?.nickname ?? "알 수 없음",
        toUserId: row.toUserId,
        toNickname: to?.nickname ?? "알 수 없음",
        createdAt: row.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function areFriends(userA: string, userB: string): boolean {
  return readAll().some(
    (row) =>
      row.status === "accepted" &&
      ((row.fromUserId === userA && row.toUserId === userB) ||
        (row.fromUserId === userB && row.toUserId === userA)),
  );
}

export function requestFriend(
  fromUserId: string,
  nickname: string,
): { request: FriendshipRecord } | { error: FriendError } {
  const target = findUserByNickname(nickname);
  if (!target) {
    return { error: "USER_NOT_FOUND" };
  }
  if (target.id === fromUserId) {
    return { error: "CANNOT_ADD_SELF" };
  }

  const existing = readAll().find(
    (row) =>
      (row.fromUserId === fromUserId && row.toUserId === target.id) ||
      (row.fromUserId === target.id && row.toUserId === fromUserId),
  );

  if (existing) {
    if (existing.status === "accepted") {
      return { error: "ALREADY_FRIENDS" };
    }
    return { error: "REQUEST_EXISTS" };
  }

  const now = new Date().toISOString();
  const request: FriendshipRecord = {
    id: createId(),
    fromUserId,
    toUserId: target.id,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  writeFriendship(request);
  return { request };
}

export function respondFriendRequest(
  userId: string,
  requestId: string,
  accept: boolean,
): { friendship: FriendshipRecord | null } | { error: FriendError } {
  ensureDir();
  const file = friendshipPath(requestId);
  if (!existsSync(file)) {
    return { error: "REQUEST_NOT_FOUND" };
  }

  let row: FriendshipRecord;
  try {
    row = JSON.parse(readFileSync(file, "utf8")) as FriendshipRecord;
  } catch {
    return { error: "REQUEST_NOT_FOUND" };
  }

  if (row.toUserId !== userId || row.status !== "pending") {
    return { error: "NOT_AUTHORIZED" };
  }

  if (!accept) {
    deleteFriendship(requestId);
    return { friendship: null };
  }

  const next: FriendshipRecord = {
    ...row,
    status: "accepted",
    updatedAt: new Date().toISOString(),
  };
  writeFriendship(next);
  return { friendship: next };
}

export const FRIEND_ERROR_MESSAGES: Record<FriendError, string> = {
  USER_NOT_FOUND: "해당 닉네임의 사용자를 찾을 수 없습니다.",
  CANNOT_ADD_SELF: "자기 자신은 친구로 추가할 수 없습니다.",
  ALREADY_FRIENDS: "이미 친구입니다.",
  REQUEST_EXISTS: "이미 친구 요청이 있습니다.",
  REQUEST_NOT_FOUND: "친구 요청을 찾을 수 없습니다.",
  NOT_AUTHORIZED: "이 요청을 처리할 권한이 없습니다.",
};
