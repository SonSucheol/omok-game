import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  RoomActionResponse,
  ServerToClientEvents,
} from "./events";
import {
  createRoomSnapshot,
  createUniqueRoomId,
  findPlayer,
  roomManager,
} from "./room-manager";
import {
  INVITE_ERROR_MESSAGES,
  ROOM_ERROR_MESSAGES,
  type Room,
  type RoomSnapshot,
} from "./types";
import {
  ensureOnlineRecord,
  saveGameProgress,
  closeOnlineRecord,
} from "@/lib/records";
import {
  findUserByNickname,
  getUserById,
  getUserFromSessionToken,
  parseCookieHeader,
  SESSION_COOKIE,
  type PublicUser,
} from "@/lib/auth";
import {
  clearPresenceBySocket,
  createInvite,
  getInvite,
  getPresenceDebug,
  getUserSocketId,
  listPendingInvitesForUser,
  markInviteDelivered,
  setUserPresence,
  updateInviteStatus,
} from "./presence";

type OmokSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  data: { user?: PublicUser | null };
};
type OmokServer = Server<ClientToServerEvents, ServerToClientEvents>;

/** 핸드셰이크 쿠키로 유저 해석. force=true면 캐시 무시(로그인 후 재인증용) */
function resolveSocketUser(
  socket: OmokSocket,
  force = false,
): PublicUser | null {
  if (!force && socket.data.user) {
    return socket.data.user;
  }
  const token = parseCookieHeader(
    socket.handshake.headers.cookie,
    SESSION_COOKIE,
  );
  const user = getUserFromSessionToken(token);
  socket.data.user = user;
  return user;
}

function emitToSocketId(
  io: OmokServer,
  socketId: string,
  event: keyof ServerToClientEvents,
  payload: unknown,
): boolean {
  const target = io.sockets.sockets.get(socketId);
  if (!target) {
    console.warn(`[invite] socket not found: ${socketId}`);
    return false;
  }
  target.emit(event, payload as never);
  return true;
}

function deliverPendingInvites(io: OmokServer, userId: string, socketId: string): void {
  const pending = listPendingInvitesForUser(userId);
  for (const invite of pending) {
    const ok = emitToSocketId(io, socketId, "invite:received", { invite });
    if (ok) {
      markInviteDelivered(invite.id);
      console.log(`[invite] delivered pending ${invite.id} → ${userId}`);
    }
  }
}

function roomParticipantIds(room: Room): string[] {
  return [room.black?.userId, room.white?.userId].filter(
    (id): id is string => Boolean(id),
  );
}

function syncRoomRecord(room: Room): void {
  try {
    const record = ensureOnlineRecord(
      room.id,
      room.gameState.history,
      roomParticipantIds(room),
    );
    saveGameProgress(
      record.id,
      room.gameState.history,
      room.gameState.winner,
      room.gameState.phase,
    );
  } catch (error) {
    console.error("Failed to sync room record:", error);
  }
}

function toSnapshot(roomId: string, playerId: string): RoomSnapshot | null {
  const room = roomManager.getRoom(roomId);
  if (!room) {
    return null;
  }

  const meta = createRoomSnapshot(room, playerId);
  return {
    roomId: room.id,
    gameState: room.gameState,
    ...meta,
  };
}

function successResponse(
  roomId: string,
  playerId: string,
): RoomActionResponse {
  const snapshot = toSnapshot(roomId, playerId);
  return { ok: true, snapshot: snapshot ?? undefined };
}

function errorResponse(
  code: keyof typeof ROOM_ERROR_MESSAGES | keyof typeof INVITE_ERROR_MESSAGES,
): RoomActionResponse {
  return { ok: false, error: code };
}

function broadcastRoomState(io: OmokServer, roomId: string): void {
  const room = roomManager.getRoom(roomId);
  if (!room) {
    return;
  }

  const recipients = [room.black, room.white].filter(Boolean);
  for (const player of recipients) {
    if (!player?.socketId) {
      continue;
    }
    const snapshot = toSnapshot(roomId, player.playerId);
    if (snapshot) {
      io.to(player.socketId).emit("room:state", snapshot);
    }
  }
}

function emitToPlayer(
  io: OmokServer,
  roomId: string,
  playerId: string,
  event: "game:undo:requested" | "game:undo:result",
  payload: unknown,
): void {
  const room = roomManager.getRoom(roomId);
  if (!room) {
    return;
  }

  const player =
    room.black?.playerId === playerId
      ? room.black
      : room.white?.playerId === playerId
        ? room.white
        : null;

  if (player?.socketId) {
    io.to(player.socketId).emit(event, payload as never);
  }
}

function identityFrom(
  socket: OmokSocket,
  payload: { userId?: string; nickname?: string },
): { userId?: string; nickname?: string } {
  const user = resolveSocketUser(socket, true);
  if (user) {
    return { userId: user.id, nickname: user.nickname };
  }
  return {
    userId: payload.userId,
    nickname: payload.nickname,
  };
}

export function setupSocketHandlers(io: OmokServer): void {
  io.on("connection", (socket: OmokSocket) => {
    const user = resolveSocketUser(socket, true);
    console.log(
      `[socket] connect id=${socket.id} user=${user?.nickname ?? "guest"} cookie=${Boolean(socket.handshake.headers.cookie)}`,
      getPresenceDebug(),
    );
    if (user) {
      setUserPresence(user.id, socket.id);
      deliverPendingInvites(io, user.id, socket.id);
    }

    socket.on("presence:auth", (_payload, ack) => {
      // 로그인 직후 재연결 전에도 쿠키가 핸드셰이크에 있으면 여기서 등록
      const next = resolveSocketUser(socket, true);
      if (next) {
        setUserPresence(next.id, socket.id);
        deliverPendingInvites(io, next.id, socket.id);
        console.log(
          `[presence:auth] ok user=${next.nickname}`,
          getPresenceDebug(),
        );
        ack({ ok: true });
        return;
      }
      console.log(`[presence:auth] fail socket=${socket.id}`, getPresenceDebug());
      ack({ ok: false });
    });

    socket.on("room:create", (payload, ack) => {
      const { playerId } = payload;
      const identity = identityFrom(socket, payload);
      const roomId = createUniqueRoomId(roomManager);
      const { room } = roomManager.createRoom(
        roomId,
        playerId,
        socket.id,
        identity,
      );
      ensureOnlineRecord(room.id, [], roomParticipantIds(room));
      socket.join(room.id);
      ack(successResponse(room.id, playerId));
      broadcastRoomState(io, room.id);
    });

    socket.on("room:join", (payload, ack) => {
      const { roomId, playerId } = payload;
      const identity = identityFrom(socket, payload);
      const result = roomManager.joinRoom(
        roomId,
        playerId,
        socket.id,
        identity,
      );
      if ("error" in result) {
        ack(errorResponse(result.error));
        return;
      }

      ensureOnlineRecord(
        result.room.id,
        result.room.gameState.history,
        roomParticipantIds(result.room),
      );
      socket.join(result.room.id);
      ack(successResponse(result.room.id, playerId));
      broadcastRoomState(io, result.room.id);
    });

    socket.on("invite:send", (payload, ack) => {
      // 1) 소켓 쿠키 또는 2) presence에 이미 등록된 소켓으로 발신자 확인
      let user = resolveSocketUser(socket, true);
      if (!user) {
        // HTTP presence 등록만 된 경우: 이 소켓이 누구 것인지 presence에서 역조회
        const debug = getPresenceDebug();
        const pair = debug.onlinePairs.find((p) => p.socketId === socket.id);
        if (pair) {
          const found = getUserById(pair.userId);
          if (found) {
            user = found;
            socket.data.user = found;
            console.log(
              `[omok:login] invite:send recovered user from presence ${found.nickname}`,
            );
          }
        }
      }

      if (!user) {
        console.log("[omok:invite] send UNAUTHORIZED", getPresenceDebug());
        ack(errorResponse("UNAUTHORIZED"));
        return;
      }

      console.log(`[omok:login] invite sender OK ${user.nickname}(${user.id})`);

      const target = payload.toUserId
        ? getUserById(payload.toUserId)
        : payload.toNickname
          ? (() => {
              const found = findUserByNickname(payload.toNickname!);
              return found
                ? {
                    id: found.id,
                    nickname: found.nickname,
                    createdAt: found.createdAt,
                  }
                : null;
            })()
          : null;

      if (!target) {
        ack(errorResponse("USER_NOT_FOUND"));
        return;
      }
      if (target.id === user.id) {
        ack(errorResponse("CANNOT_INVITE_SELF"));
        return;
      }

      const invite = createInvite({
        fromUserId: user.id,
        fromNickname: user.nickname,
        fromPlayerId: payload.playerId,
        toUserId: target.id,
        toNickname: target.nickname,
      });

      const targetSocketId = getUserSocketId(target.id);
      let delivered = false;
      if (targetSocketId) {
        delivered = emitToSocketId(io, targetSocketId, "invite:received", {
          invite,
        });
        if (delivered) {
          markInviteDelivered(invite.id);
        }
      }

      console.log(`[omok:invite] send result`, {
        from: user.nickname,
        to: target.nickname,
        inviteId: invite.id,
        targetSocketId: targetSocketId ?? null,
        delivered,
        debug: getPresenceDebug(),
      });

      ack({
        ok: true,
        inviteId: invite.id,
      });
    });

    socket.on("invite:respond", (payload, ack) => {
      const user = resolveSocketUser(socket, true);
      if (!user) {
        ack(errorResponse("UNAUTHORIZED"));
        return;
      }

      const invite = getInvite(payload.inviteId);
      if (!invite) {
        ack(errorResponse("INVITE_NOT_FOUND"));
        return;
      }
      if (invite.toUserId !== user.id) {
        ack(errorResponse("INVITE_NOT_AUTHORIZED"));
        return;
      }
      if (invite.status !== "pending") {
        ack(errorResponse("INVITE_EXPIRED"));
        return;
      }

      const inviterSocketId = getUserSocketId(invite.fromUserId);

      if (!payload.accept) {
        updateInviteStatus(invite.id, "declined");
        if (inviterSocketId) {
          emitToSocketId(io, inviterSocketId, "invite:resolved", {
            inviteId: invite.id,
            accepted: false,
            message: `${user.nickname}님이 초대를 거절했습니다.`,
          });
        }
        console.log(`[invite:respond] declined by ${user.nickname}`);
        ack({ ok: true });
        return;
      }

      if (!inviterSocketId) {
        updateInviteStatus(invite.id, "cancelled");
        console.log("[invite:respond] INVITER_OFFLINE");
        ack(errorResponse("INVITER_OFFLINE"));
        return;
      }

      // 수락 시 방 생성 후 두 유저 모두 입장
      const roomId = createUniqueRoomId(roomManager);
      const { room } = roomManager.createRoom(
        roomId,
        invite.fromPlayerId,
        inviterSocketId,
        {
          userId: invite.fromUserId,
          nickname: invite.fromNickname,
        },
      );

      const joinResult = roomManager.joinRoom(
        room.id,
        payload.playerId,
        socket.id,
        { userId: user.id, nickname: user.nickname },
      );
      if ("error" in joinResult) {
        ack(errorResponse(joinResult.error));
        return;
      }

      updateInviteStatus(invite.id, "accepted", room.id);
      ensureOnlineRecord(room.id, [], roomParticipantIds(joinResult.room));

      const inviterSocket = io.sockets.sockets.get(inviterSocketId);
      inviterSocket?.join(room.id);
      socket.join(room.id);

      emitToSocketId(io, inviterSocketId, "invite:resolved", {
        inviteId: invite.id,
        accepted: true,
        roomId: room.id,
        message: `${user.nickname}님이 초대를 수락했습니다.`,
      });
      const inviterSnapshot = toSnapshot(room.id, invite.fromPlayerId);
      if (inviterSnapshot) {
        emitToSocketId(io, inviterSocketId, "room:state", inviterSnapshot);
      }

      console.log(
        `[invite:respond] accepted room=${room.id} by ${user.nickname}`,
      );

      ack({
        ok: true,
        roomId: room.id,
        snapshot: toSnapshot(room.id, payload.playerId) ?? undefined,
      });
      broadcastRoomState(io, room.id);
    });

    socket.on("game:play", ({ roomId, playerId, row, col }, ack) => {
      const result = roomManager.applyMove(roomId, playerId, row, col);
      if ("error" in result) {
        const response = errorResponse(result.error);
        ack(response);
        socket.emit("game:error", {
          code: result.error,
          message: ROOM_ERROR_MESSAGES[result.error],
        });
        return;
      }

      syncRoomRecord(result.room);
      ack(successResponse(result.room.id, playerId));
      broadcastRoomState(io, result.room.id);
    });

    socket.on("game:reset", ({ roomId, playerId }, ack) => {
      const before = roomManager.getRoom(roomId);
      if (before) {
        closeOnlineRecord(
          before.id,
          before.gameState.history,
          before.gameState.winner,
          before.gameState.phase,
        );
      }

      const result = roomManager.resetRoomGame(roomId, playerId);
      if ("error" in result) {
        ack(errorResponse(result.error));
        return;
      }

      ensureOnlineRecord(
        result.room.id,
        [],
        roomParticipantIds(result.room),
      );
      ack(successResponse(result.room.id, playerId));
      broadcastRoomState(io, result.room.id);
    });

    socket.on("game:undo:request", ({ roomId, playerId }, ack) => {
      const result = roomManager.requestUndo(roomId, playerId);
      if ("error" in result) {
        ack(errorResponse(result.error));
        return;
      }

      const requester = findPlayer(result.room, playerId);
      ack({
        ok: true,
        requestId: result.requestId,
        snapshot: toSnapshot(result.room.id, playerId) ?? undefined,
      });

      socket.to(result.room.id).emit("game:undo:requested", {
        requestId: result.requestId,
        requesterRole: requester?.role ?? "black",
      });
    });

    socket.on("game:undo:respond", ({ roomId, playerId, requestId, accepted }, ack) => {
      const result = roomManager.respondUndo(roomId, playerId, requestId, accepted);
      if ("error" in result) {
        ack(errorResponse(result.error));
        return;
      }

      if (result.accepted) {
        syncRoomRecord(result.room);
      }

      ack(successResponse(result.room.id, playerId));
      broadcastRoomState(io, result.room.id);

      emitToPlayer(io, result.room.id, result.requesterPlayerId, "game:undo:result", {
        accepted: result.accepted,
        message: result.accepted
          ? "무르기가 적용되었습니다."
          : "상대가 무르기를 거절했습니다.",
      });
    });

    socket.on("game:undo:cancel", ({ roomId, playerId, requestId }, ack) => {
      const room = roomManager.getRoom(roomId);
      if (!room?.pendingUndo || room.pendingUndo.requestId !== requestId) {
        ack(errorResponse("INVALID_UNDO_REQUEST"));
        return;
      }

      const opponent = [room.black, room.white].find(
        (p) => p && p.playerId !== playerId,
      );

      const result = roomManager.cancelUndoRequest(roomId, playerId);
      if ("error" in result) {
        ack(errorResponse(result.error));
        return;
      }

      ack(successResponse(result.room.id, playerId));
      broadcastRoomState(io, result.room.id);

      if (opponent) {
        emitToPlayer(io, result.room.id, opponent.playerId, "game:undo:result", {
          accepted: false,
          message: "상대가 무르기 요청을 취소했습니다.",
        });
      }
    });

    socket.on("disconnect", () => {
      clearPresenceBySocket(socket.id);
      const affectedRooms = roomManager.markDisconnected(socket.id);
      for (const room of affectedRooms) {
        if (room.gameState.phase === "finished") {
          syncRoomRecord(room);
        }
        broadcastRoomState(io, room.id);
      }
      roomManager.removeEmptyRooms();
    });
  });
}
