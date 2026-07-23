import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./lib/online/socket";
import { roomManager } from "./lib/online/room-manager";
import { ensureOnlineRecord, saveGameProgress } from "./lib/records";
import type { ClientToServerEvents, ServerToClientEvents } from "./lib/online/events";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const bindHost = process.env.BIND_HOST ?? "0.0.0.0";

const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();

function sendJson(
  res: import("http").ServerResponse,
  status: number,
  body: unknown,
): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    const pathname = parsedUrl.pathname ?? "";

    // 커스텀 서버와 동일 프로세스의 방 상태 조회 / 기록 동기화
    if (pathname?.startsWith("/api/rooms/")) {
      const roomId = pathname.replace("/api/rooms/", "").toUpperCase();
      const room = roomManager.getRoom(roomId);
      if (!room) {
        sendJson(res, 404, { error: "ROOM_NOT_FOUND", roomId });
        return;
      }

      if (req.method === "POST" && parsedUrl.query.sync === "1") {
        const record = ensureOnlineRecord(room.id, room.gameState.history);
        saveGameProgress(
          record.id,
          room.gameState.history,
          room.gameState.winner,
          room.gameState.phase,
        );
        sendJson(res, 200, {
          roomId: room.id,
          synced: true,
          recordId: record.id,
          moveCount: room.gameState.history.length,
          phase: room.gameState.phase,
        });
        return;
      }

      sendJson(res, 200, {
        roomId: room.id,
        phase: room.gameState.phase,
        winner: room.gameState.winner,
        moveCount: room.gameState.history.length,
        history: room.gameState.history,
        currentPlayer: room.gameState.currentPlayer,
      });
      return;
    }

    void Promise.resolve(handle(req, res, parsedUrl)).catch((error) => {
      console.error("Request handler error:", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  setupSocketHandlers(io);

  httpServer.listen(port, bindHost, () => {
    console.log(`> omok-game ready on http://localhost:${port}`);
    console.log(`> LAN access: http://<your-ip>:${port}`);
  });
}).catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
