import { describe, expect, it } from "vitest";
import { Stone } from "@/lib/game";
import { RoomManager, getRoomStatus } from "@/lib/online/room-manager";

describe("RoomManager", () => {
  it("creates a room with black player and waiting status", () => {
    const manager = new RoomManager();
    const { room, role } = manager.createRoom("ABC123", "player-a", "socket-a");

    expect(role).toBe("black");
    expect(room.black?.playerId).toBe("player-a");
    expect(room.white).toBeNull();
    expect(getRoomStatus(room)).toBe("waiting");
  });

  it("lets a second player join as white", () => {
    const manager = new RoomManager();
    manager.createRoom("ABC123", "player-a", "socket-a");

    const result = manager.joinRoom("ABC123", "player-b", "socket-b");
    expect("error" in result).toBe(false);
    if ("error" in result) {
      return;
    }

    expect(result.role).toBe("white");
    expect(getRoomStatus(result.room)).toBe("ready");
  });

  it("reconnects an existing player without taking a new slot", () => {
    const manager = new RoomManager();
    manager.createRoom("ABC123", "player-a", "socket-a");
    manager.joinRoom("ABC123", "player-b", "socket-b");

    const reconnect = manager.joinRoom("ABC123", "player-a", "socket-a2");
    expect("error" in reconnect).toBe(false);
    if ("error" in reconnect) {
      return;
    }

    expect(reconnect.role).toBe("black");
    expect(reconnect.room.black?.socketId).toBe("socket-a2");
  });

  it("keeps a waiting room when the host socket disconnects", () => {
    const manager = new RoomManager();
    manager.createRoom("ABC123", "player-a", "socket-a");

    manager.markDisconnected("socket-a");
    manager.removeEmptyRooms();

    expect(manager.getRoom("ABC123")).toBeDefined();
    expect(manager.joinRoom("ABC123", "player-a", "socket-a2")).toMatchObject({
      role: "black",
    });
  });

  it("awards win to the remaining player when one disconnects mid-game", () => {
    const manager = new RoomManager();
    manager.createRoom("ABC123", "player-a", "socket-a");
    manager.joinRoom("ABC123", "player-b", "socket-b");
    manager.applyMove("ABC123", "player-a", 7, 7);

    manager.markDisconnected("socket-a");

    const room = manager.getRoom("ABC123");
    expect(room?.gameState.phase).toBe("finished");
    expect(room?.gameState.winner).toBe(Stone.WHITE);
    expect(getRoomStatus(room!)).toBe("finished");
  });

  it("keeps the forfeit winner after the remaining player also leaves", () => {
    const manager = new RoomManager();
    manager.createRoom("ABC123", "player-a", "socket-a");
    manager.joinRoom("ABC123", "player-b", "socket-b");

    manager.markDisconnected("socket-a");
    manager.markDisconnected("socket-b");

    const room = manager.getRoom("ABC123");
    expect(room?.gameState.phase).toBe("finished");
    expect(room?.gameState.winner).toBe(Stone.WHITE);
  });

  it("rejects a third player when the room is full", () => {
    const manager = new RoomManager();
    manager.createRoom("ABC123", "player-a", "socket-a");
    manager.joinRoom("ABC123", "player-b", "socket-b");

    const result = manager.joinRoom("ABC123", "player-c", "socket-c");
    expect(result).toEqual({ error: "ROOM_FULL" });
  });

  it("applies moves only for the current player", () => {
    const manager = new RoomManager();
    manager.createRoom("ABC123", "player-a", "socket-a");
    manager.joinRoom("ABC123", "player-b", "socket-b");

    const first = manager.applyMove("ABC123", "player-a", 7, 7);
    expect("error" in first).toBe(false);

    const wrongTurn = manager.applyMove("ABC123", "player-a", 7, 8);
    expect(wrongTurn).toEqual({ error: "NOT_YOUR_TURN" });

    const second = manager.applyMove("ABC123", "player-b", 7, 8);
    expect("error" in second).toBe(false);
    if ("error" in second) {
      return;
    }

    expect(second.gameState.board[7][7]).toBe(Stone.BLACK);
    expect(second.gameState.board[7][8]).toBe(Stone.WHITE);
  });

  it("requests undo and applies it when opponent accepts", () => {
    const manager = new RoomManager();
    manager.createRoom("ABC123", "player-a", "socket-a");
    manager.joinRoom("ABC123", "player-b", "socket-b");
    manager.applyMove("ABC123", "player-a", 7, 7)!;

    const request = manager.requestUndo("ABC123", "player-a");
    expect("error" in request).toBe(false);
    if ("error" in request) {
      return;
    }

    const selfRespond = manager.respondUndo(
      "ABC123",
      "player-a",
      request.requestId,
      true,
    );
    expect("error" in selfRespond).toBe(true);

    const request2 = manager.requestUndo("ABC123", "player-a");
    if ("error" in request2) {
      return;
    }

    const accept = manager.respondUndo(
      "ABC123",
      "player-b",
      request2.requestId,
      true,
    );
    expect("error" in accept).toBe(false);
    if ("error" in accept) {
      return;
    }

    expect(accept.accepted).toBe(true);
    expect(accept.gameState.board[7][7]).toBe(Stone.EMPTY);
  });

  it("rejects black double-three moves online", () => {
    const manager = new RoomManager();
    const { room } = manager.createRoom("ABC123", "player-a", "socket-a");
    manager.joinRoom("ABC123", "player-b", "socket-b");

    room.gameState.board[1][2] = Stone.BLACK;
    room.gameState.board[2][1] = Stone.BLACK;
    room.gameState.board[2][3] = Stone.BLACK;
    room.gameState.board[3][2] = Stone.BLACK;
    room.gameState.currentPlayer = Stone.BLACK;

    const result = manager.applyMove("ABC123", "player-a", 2, 2);
    expect(result).toEqual({ error: "DOUBLE_THREE" });
  });
});
