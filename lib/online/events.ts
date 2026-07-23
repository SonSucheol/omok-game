import type { GameState } from "@/lib/game";
import type {
  InviteErrorCode,
  PlayerRole,
  RoomErrorCode,
  RoomPlayStatus,
  RoomSnapshot,
} from "./types";
import type { GameInvite } from "./presence";

export interface PlayerIdentityPayload {
  playerId: string;
  userId?: string;
  nickname?: string;
}

export interface CreateRoomPayload extends PlayerIdentityPayload {}

export interface JoinRoomPayload extends PlayerIdentityPayload {
  roomId: string;
}

export interface PlayMovePayload {
  roomId: string;
  playerId: string;
  row: number;
  col: number;
}

export interface ResetGamePayload {
  roomId: string;
  playerId: string;
}

export interface UndoRequestPayload {
  roomId: string;
  playerId: string;
}

export interface UndoRespondPayload {
  roomId: string;
  playerId: string;
  requestId: string;
  accepted: boolean;
}

export interface UndoCancelPayload {
  roomId: string;
  playerId: string;
  requestId: string;
}

export interface InviteSendPayload {
  playerId: string;
  toNickname?: string;
  toUserId?: string;
}

export interface InviteRespondPayload {
  playerId: string;
  inviteId: string;
  accept: boolean;
}

export interface RoomActionResponse {
  ok: boolean;
  error?: RoomErrorCode | InviteErrorCode;
  snapshot?: RoomSnapshot;
  requestId?: string;
  inviteId?: string;
  roomId?: string;
}

export interface UndoRequestedPayload {
  requestId: string;
  requesterRole: PlayerRole;
}

export interface UndoResultPayload {
  accepted: boolean;
  message: string;
}

export interface InviteReceivedPayload {
  invite: GameInvite;
}

export interface InviteResolvedPayload {
  inviteId: string;
  accepted: boolean;
  roomId?: string;
  message: string;
}

export interface ServerToClientEvents {
  "room:state": (snapshot: RoomSnapshot) => void;
  "game:error": (payload: { code: RoomErrorCode; message: string }) => void;
  "game:undo:requested": (payload: UndoRequestedPayload) => void;
  "game:undo:result": (payload: UndoResultPayload) => void;
  "invite:received": (payload: InviteReceivedPayload) => void;
  "invite:resolved": (payload: InviteResolvedPayload) => void;
}

export interface ClientToServerEvents {
  "room:create": (
    payload: CreateRoomPayload,
    ack: (response: RoomActionResponse) => void,
  ) => void;
  "room:join": (
    payload: JoinRoomPayload,
    ack: (response: RoomActionResponse) => void,
  ) => void;
  "game:play": (
    payload: PlayMovePayload,
    ack: (response: RoomActionResponse) => void,
  ) => void;
  "game:reset": (
    payload: ResetGamePayload,
    ack: (response: RoomActionResponse) => void,
  ) => void;
  "game:undo:request": (
    payload: UndoRequestPayload,
    ack: (response: RoomActionResponse) => void,
  ) => void;
  "game:undo:respond": (
    payload: UndoRespondPayload,
    ack: (response: RoomActionResponse) => void,
  ) => void;
  "game:undo:cancel": (
    payload: UndoCancelPayload,
    ack: (response: RoomActionResponse) => void,
  ) => void;
  "invite:send": (
    payload: InviteSendPayload,
    ack: (response: RoomActionResponse) => void,
  ) => void;
  "invite:respond": (
    payload: InviteRespondPayload,
    ack: (response: RoomActionResponse) => void,
  ) => void;
}

export type { GameState, PlayerRole, RoomPlayStatus, RoomSnapshot };
