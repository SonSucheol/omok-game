import {
  createInitialState,
  getMoveRejectReason,
  playMove,
  resetGame,
  canUndo,
  undoMove,
  Stone,
  type GameState,
} from "@/lib/game";
import type { PlayerRole, Room, RoomPlayer, RoomPlayStatus, PendingUndoRequest } from "./types";

const ROOM_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createRequestId(): string {
  return `undo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateRoomId(length = 6): string {
  let id = "";
  for (let i = 0; i < length; i += 1) {
    id += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)];
  }
  return id;
}

export function getOpponentPlayer(room: Room, playerId: string): RoomPlayer | null {
  if (room.black?.playerId === playerId) {
    return room.white;
  }
  if (room.white?.playerId === playerId) {
    return room.black;
  }
  return null;
}

export function roleToStone(role: PlayerRole): Stone {
  return role === "black" ? Stone.BLACK : Stone.WHITE;
}

export function getRoomStatus(room: Room): RoomPlayStatus {
  if (!room.white) {
    return "waiting";
  }
  if (room.gameState.phase === "finished") {
    return "finished";
  }
  if (room.gameState.history.length === 0) {
    return "ready";
  }
  return "playing";
}

export function isPlayerConnected(player: RoomPlayer | null): boolean {
  return Boolean(player?.socketId);
}

export function findPlayer(room: Room, playerId: string): RoomPlayer | null {
  if (room.black?.playerId === playerId) {
    return room.black;
  }
  if (room.white?.playerId === playerId) {
    return room.white;
  }
  return null;
}

export function createRoomSnapshot(
  room: Room,
  viewerPlayerId: string,
): {
  yourRole: PlayerRole | null;
  status: RoomPlayStatus;
  opponentConnected: boolean;
} {
  const yourRole =
    room.black?.playerId === viewerPlayerId
      ? "black"
      : room.white?.playerId === viewerPlayerId
        ? "white"
        : null;

  const opponent =
    yourRole === "black"
      ? room.white
      : yourRole === "white"
        ? room.black
        : null;

  return {
    yourRole,
    status: getRoomStatus(room),
    opponentConnected: isPlayerConnected(opponent),
  };
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(
    roomId: string,
    playerId: string,
    socketId: string,
    identity?: { userId?: string; nickname?: string },
  ): { room: Room; role: PlayerRole } {
    const id = roomId.toUpperCase();
    const room: Room = {
      id,
      gameState: createInitialState(),
      black: {
        playerId,
        socketId,
        role: "black",
        userId: identity?.userId,
        nickname: identity?.nickname,
      },
      white: null,
      pendingUndo: null,
    };
    this.rooms.set(id, room);
    return { room, role: "black" };
  }

  joinRoom(
    roomId: string,
    playerId: string,
    socketId: string,
    identity?: { userId?: string; nickname?: string },
  ): { room: Room; role: PlayerRole } | { error: "ROOM_NOT_FOUND" | "ROOM_FULL" } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) {
      return { error: "ROOM_NOT_FOUND" };
    }

    const existing = findPlayer(room, playerId);
    if (existing) {
      existing.socketId = socketId;
      if (identity?.userId) {
        existing.userId = identity.userId;
      }
      if (identity?.nickname) {
        existing.nickname = identity.nickname;
      }
      return { room, role: existing.role };
    }

    if (room.white) {
      return { error: "ROOM_FULL" };
    }

    room.white = {
      playerId,
      socketId,
      role: "white",
      userId: identity?.userId,
      nickname: identity?.nickname,
    };
    return { room, role: "white" };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  markDisconnected(socketId: string): Room[] {
    const affected: Room[] = [];

    for (const room of this.rooms.values()) {
      let leftRole: PlayerRole | null = null;

      if (room.black?.socketId === socketId) {
        room.black.socketId = "";
        leftRole = "black";
      }
      if (room.white?.socketId === socketId) {
        room.white.socketId = "";
        leftRole = "white";
      }

      if (!leftRole) {
        continue;
      }

      // 양측이 입장한 진행 중 대국에서 한 명이 나가면 잔류 측 승리
      if (
        room.black &&
        room.white &&
        room.gameState.phase === "playing"
      ) {
        const remaining = leftRole === "black" ? room.white : room.black;
        if (remaining.socketId) {
          room.gameState = {
            ...room.gameState,
            phase: "finished",
            winner: roleToStone(remaining.role),
            winningCells: [],
          };
          room.pendingUndo = null;
        }
      }

      affected.push(room);
    }

    return affected;
  }

  removeEmptyRooms(): void {
    for (const [id, room] of this.rooms.entries()) {
      // 상대 대기 중인 방은 방장이 페이지를 이동해도 유지
      if (!room.white) {
        continue;
      }

      const blackGone = !room.black?.socketId;
      const whiteGone = !room.white.socketId;
      if (blackGone && whiteGone) {
        this.rooms.delete(id);
      }
    }
  }

  applyMove(
    roomId: string,
    playerId: string,
    row: number,
    col: number,
  ):
    | { room: Room; gameState: GameState }
  | { error: "ROOM_NOT_FOUND" | "NOT_IN_ROOM" | "WAITING_OPPONENT" | "NOT_YOUR_TURN" | "INVALID_MOVE" | "DOUBLE_THREE" | "DOUBLE_FOUR" | "OVERLINE" | "OCCUPIED" } {
    const room = this.getRoom(roomId);
    if (!room) {
      return { error: "ROOM_NOT_FOUND" };
    }

    const player = findPlayer(room, playerId);
    if (!player) {
      return { error: "NOT_IN_ROOM" };
    }

    if (!room.white) {
      return { error: "WAITING_OPPONENT" };
    }

    if (room.gameState.currentPlayer !== roleToStone(player.role)) {
      return { error: "NOT_YOUR_TURN" };
    }

    const rejectReason = getMoveRejectReason(room.gameState, row, col);
    if (rejectReason === "double_three") {
      return { error: "DOUBLE_THREE" };
    }
    if (rejectReason === "double_four") {
      return { error: "DOUBLE_FOUR" };
    }
    if (rejectReason === "overline") {
      return { error: "OVERLINE" };
    }
    if (rejectReason === "occupied") {
      return { error: "OCCUPIED" };
    }
    if (rejectReason !== null) {
      return { error: "INVALID_MOVE" };
    }

    const next = playMove(room.gameState, row, col);
    if (!next) {
      return { error: "INVALID_MOVE" };
    }

    room.gameState = next;
    room.pendingUndo = null;
    return { room, gameState: next };
  }

  requestUndo(
    roomId: string,
    playerId: string,
  ):
    | { room: Room; requestId: string; opponentPlayerId: string }
    | { error: "ROOM_NOT_FOUND" | "NOT_IN_ROOM" | "WAITING_OPPONENT" | "CANNOT_UNDO" | "UNDO_REQUEST_PENDING" } {
    const room = this.getRoom(roomId);
    if (!room) {
      return { error: "ROOM_NOT_FOUND" };
    }

    const player = findPlayer(room, playerId);
    if (!player) {
      return { error: "NOT_IN_ROOM" };
    }

    if (!room.white) {
      return { error: "WAITING_OPPONENT" };
    }

    if (!canUndo(room.gameState)) {
      return { error: "CANNOT_UNDO" };
    }

    if (room.pendingUndo) {
      return { error: "UNDO_REQUEST_PENDING" };
    }

    const opponent = getOpponentPlayer(room, playerId);
    if (!opponent) {
      return { error: "WAITING_OPPONENT" };
    }

    const requestId = createRequestId();
    room.pendingUndo = {
      requestId,
      requestedByPlayerId: playerId,
    };

    return {
      room,
      requestId,
      opponentPlayerId: opponent.playerId,
    };
  }

  respondUndo(
    roomId: string,
    playerId: string,
    requestId: string,
    accepted: boolean,
  ):
    | { room: Room; accepted: true; gameState: GameState; requesterPlayerId: string }
    | { room: Room; accepted: false; requesterPlayerId: string }
    | { error: "ROOM_NOT_FOUND" | "NOT_IN_ROOM" | "INVALID_UNDO_REQUEST" | "CANNOT_UNDO" } {
    const room = this.getRoom(roomId);
    if (!room) {
      return { error: "ROOM_NOT_FOUND" };
    }

    const player = findPlayer(room, playerId);
    if (!player) {
      return { error: "NOT_IN_ROOM" };
    }

    const pending = room.pendingUndo;
    if (!pending || pending.requestId !== requestId) {
      return { error: "INVALID_UNDO_REQUEST" };
    }

    if (pending.requestedByPlayerId === playerId) {
      return { error: "INVALID_UNDO_REQUEST" };
    }

    const requesterPlayerId = pending.requestedByPlayerId;

    if (!accepted) {
      room.pendingUndo = null;
      return { room, accepted: false, requesterPlayerId };
    }

    if (!canUndo(room.gameState)) {
      room.pendingUndo = null;
      return { error: "CANNOT_UNDO" };
    }

    const next = undoMove(room.gameState);
    if (!next) {
      room.pendingUndo = null;
      return { error: "CANNOT_UNDO" };
    }

    room.gameState = next;
    room.pendingUndo = null;
    return { room, accepted: true, gameState: next, requesterPlayerId };
  }

  cancelUndoRequest(roomId: string, playerId: string): { room: Room } | { error: "ROOM_NOT_FOUND" | "NOT_IN_ROOM" | "INVALID_UNDO_REQUEST" } {
    const room = this.getRoom(roomId);
    if (!room) {
      return { error: "ROOM_NOT_FOUND" };
    }

    const pending = room.pendingUndo;
    if (!pending || pending.requestedByPlayerId !== playerId) {
      return { error: "INVALID_UNDO_REQUEST" };
    }

    room.pendingUndo = null;
    return { room };
  }

  resetRoomGame(
    roomId: string,
    playerId: string,
  ):
    | { room: Room; gameState: GameState }
    | { error: "ROOM_NOT_FOUND" | "NOT_IN_ROOM" | "WAITING_OPPONENT" } {
    const room = this.getRoom(roomId);
    if (!room) {
      return { error: "ROOM_NOT_FOUND" };
    }

    const player = findPlayer(room, playerId);
    if (!player) {
      return { error: "NOT_IN_ROOM" };
    }

    if (!room.white) {
      return { error: "WAITING_OPPONENT" };
    }

    room.gameState = resetGame();
    room.pendingUndo = null;
    return { room, gameState: room.gameState };
  }
}

export const roomManager = new RoomManager();

export function createUniqueRoomId(
  manager: RoomManager,
  attempts = 20,
): string {
  for (let i = 0; i < attempts; i += 1) {
    const id = generateRoomId();
    if (!manager.getRoom(id)) {
      return id;
    }
  }
  throw new Error("Failed to generate a unique room id");
}
