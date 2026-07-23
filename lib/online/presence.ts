import { randomBytes } from "crypto";

export interface GameInvite {
  id: string;
  roomId: string | null;
  fromUserId: string;
  fromNickname: string;
  fromPlayerId: string;
  toUserId: string;
  toNickname: string;
  createdAt: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  delivered: boolean;
}

type GlobalOmok = typeof globalThis & {
  __omokInvites?: Map<string, GameInvite>;
  __omokPresence?: Map<string, string>;
};

function g(): GlobalOmok {
  return globalThis as GlobalOmok;
}

function inviteStore(): Map<string, GameInvite> {
  if (!g().__omokInvites) {
    g().__omokInvites = new Map();
  }
  return g().__omokInvites!;
}

function presenceStore(): Map<string, string> {
  if (!g().__omokPresence) {
    g().__omokPresence = new Map();
  }
  return g().__omokPresence!;
}

function createInviteId(): string {
  return `inv-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

export function createInvite(input: {
  fromUserId: string;
  fromNickname: string;
  fromPlayerId: string;
  toUserId: string;
  toNickname: string;
}): GameInvite {
  const invite: GameInvite = {
    id: createInviteId(),
    roomId: null,
    fromUserId: input.fromUserId,
    fromNickname: input.fromNickname,
    fromPlayerId: input.fromPlayerId,
    toUserId: input.toUserId,
    toNickname: input.toNickname,
    createdAt: new Date().toISOString(),
    status: "pending",
    delivered: false,
  };
  inviteStore().set(invite.id, invite);
  console.log(
    `[omok:invite] created id=${invite.id} ${invite.fromNickname} → ${invite.toNickname}`,
  );
  return invite;
}

export function getInvite(id: string): GameInvite | null {
  return inviteStore().get(id) ?? null;
}

export function markInviteDelivered(id: string): void {
  const invite = inviteStore().get(id);
  if (invite) {
    invite.delivered = true;
  }
}

export function updateInviteStatus(
  id: string,
  status: GameInvite["status"],
  roomId?: string,
): GameInvite | null {
  const invite = inviteStore().get(id);
  if (!invite) {
    return null;
  }
  invite.status = status;
  if (roomId) {
    invite.roomId = roomId.toUpperCase();
  }
  return invite;
}

export function listPendingInvitesForUser(userId: string): GameInvite[] {
  return [...inviteStore().values()]
    .filter((inv) => inv.toUserId === userId && inv.status === "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function setUserPresence(userId: string, socketId: string): void {
  const store = presenceStore();
  // 같은 유저의 이전 소켓 제거
  for (const [uid, sid] of store.entries()) {
    if (uid === userId || sid === socketId) {
      store.delete(uid);
    }
  }
  store.set(userId, socketId);
  console.log(`[omok:login] presence ON userId=${userId} socketId=${socketId}`);
}

export function clearUserPresence(userId: string, socketId?: string): void {
  const store = presenceStore();
  const current = store.get(userId);
  if (!current) {
    return;
  }
  if (!socketId || current === socketId) {
    store.delete(userId);
    console.log(`[omok:login] presence OFF userId=${userId}`);
  }
}

export function getUserSocketId(userId: string): string | undefined {
  return presenceStore().get(userId);
}

export function clearPresenceBySocket(socketId: string): string | null {
  const store = presenceStore();
  for (const [userId, sid] of store.entries()) {
    if (sid === socketId) {
      store.delete(userId);
      console.log(`[omok:login] presence OFF userId=${userId} (disconnect)`);
      return userId;
    }
  }
  return null;
}

export function getPresenceDebug(): {
  onlineUserIds: string[];
  onlinePairs: { userId: string; socketId: string }[];
  pendingInviteCount: number;
  pendingInvites: { id: string; from: string; to: string }[];
} {
  const presence = presenceStore();
  const invites = inviteStore();
  return {
    onlineUserIds: [...presence.keys()],
    onlinePairs: [...presence.entries()].map(([userId, socketId]) => ({
      userId,
      socketId,
    })),
    pendingInviteCount: [...invites.values()].filter(
      (i) => i.status === "pending",
    ).length,
    pendingInvites: [...invites.values()]
      .filter((i) => i.status === "pending")
      .map((i) => ({
        id: i.id,
        from: i.fromNickname,
        to: i.toNickname,
      })),
  };
}
