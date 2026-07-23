import type { GameState } from "@/lib/game";

export type PlayerRole = "black" | "white";

export type RoomPlayStatus = "waiting" | "ready" | "playing" | "finished";

export interface RoomPlayer {
  playerId: string;
  socketId: string;
  role: PlayerRole;
  userId?: string;
  nickname?: string;
}

export type InviteErrorCode =
  | "UNAUTHORIZED"
  | "USER_NOT_FOUND"
  | "CANNOT_INVITE_SELF"
  | "FRIEND_OFFLINE"
  | "INVITER_OFFLINE"
  | "INVITE_NOT_FOUND"
  | "INVITE_NOT_AUTHORIZED"
  | "INVITE_EXPIRED";

export const INVITE_ERROR_MESSAGES: Record<InviteErrorCode, string> = {
  UNAUTHORIZED: "로그인이 필요합니다.",
  USER_NOT_FOUND: "해당 닉네임의 사용자를 찾을 수 없습니다.",
  CANNOT_INVITE_SELF: "자기 자신에게는 초대할 수 없습니다.",
  FRIEND_OFFLINE:
    "상대가 아직 접속 중이 아닙니다. 초대는 저장되며 상대가 앱을 열면 확인할 수 있습니다.",
  INVITER_OFFLINE: "초대자가 접속을 종료해 방을 만들 수 없습니다.",
  INVITE_NOT_FOUND: "초대를 찾을 수 없습니다.",
  INVITE_NOT_AUTHORIZED: "이 초대를 처리할 권한이 없습니다.",
  INVITE_EXPIRED: "만료되었거나 이미 처리된 초대입니다.",
};

export function actionErrorMessage(
  code: RoomErrorCode | InviteErrorCode | undefined,
  fallback = "요청에 실패했습니다.",
): string {
  if (!code) {
    return fallback;
  }
  if (code in ROOM_ERROR_MESSAGES) {
    return ROOM_ERROR_MESSAGES[code as RoomErrorCode];
  }
  if (code in INVITE_ERROR_MESSAGES) {
    return INVITE_ERROR_MESSAGES[code as InviteErrorCode];
  }
  return fallback;
}

export interface Room {
  id: string;
  gameState: GameState;
  black: RoomPlayer | null;
  white: RoomPlayer | null;
  pendingUndo: PendingUndoRequest | null;
}

export interface RoomSnapshot {
  roomId: string;
  gameState: GameState;
  yourRole: PlayerRole | null;
  status: RoomPlayStatus;
  opponentConnected: boolean;
}

export type RoomErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "NOT_IN_ROOM"
  | "WAITING_OPPONENT"
  | "NOT_YOUR_TURN"
  | "INVALID_MOVE"
  | "DOUBLE_THREE"
  | "DOUBLE_FOUR"
  | "OVERLINE"
  | "OCCUPIED"
  | "CANNOT_UNDO"
  | "UNDO_REQUEST_PENDING"
  | "INVALID_UNDO_REQUEST";

export const ROOM_ERROR_MESSAGES: Record<RoomErrorCode, string> = {
  ROOM_NOT_FOUND: "방을 찾을 수 없습니다.",
  ROOM_FULL: "방이 가득 찼습니다.",
  NOT_IN_ROOM: "이 방에 참가하지 않았습니다.",
  WAITING_OPPONENT: "상대를 기다리는 중입니다.",
  NOT_YOUR_TURN: "내 차례가 아닙니다.",
  INVALID_MOVE: "착수할 수 없는 위치입니다.",
  DOUBLE_THREE: "쌍삼(열린 삼이 두 방향 이상)은 착수할 수 없습니다. 한쪽이 막힌 삼은 해당하지 않습니다.",
  DOUBLE_FOUR: "쌍사(4가 두 방향 이상)는 착수할 수 없습니다.",
  OVERLINE: "장목(6목 이상)은 착수할 수 없습니다.",
  OCCUPIED: "이미 돌이 놓인 위치입니다.",
  CANNOT_UNDO: "지금은 무르기를 할 수 없습니다.",
  UNDO_REQUEST_PENDING: "이미 무르기 동의를 기다리는 중입니다.",
  INVALID_UNDO_REQUEST: "유효하지 않은 무르기 요청입니다.",
};

export interface PendingUndoRequest {
  requestId: string;
  requestedByPlayerId: string;
}
