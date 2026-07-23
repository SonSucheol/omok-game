import { NextResponse } from "next/server";
import { createGameRecord, listGameRecords } from "@/lib/records";
import type { GameRecordMode } from "@/lib/records";
import type { Move } from "@/lib/game";
import { Stone } from "@/lib/game";
import type { AiMode } from "@/lib/ai";
import { AUTH_ERROR_MESSAGES, getSessionUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: AUTH_ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 },
    );
  }

  const records = listGameRecords({
    finishedOnly: true,
    participantUserId: user.id,
  });
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  try {
    const user = getSessionUserFromRequest(request);
    const body = (await request.json()) as {
      mode?: GameRecordMode;
      moves?: Move[];
      winner?: Stone | null;
      finished?: boolean;
      roomId?: string;
      aiMode?: AiMode;
      aiStrength?: number;
    };

    if (!body.mode || !Array.isArray(body.moves)) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    // 게스트 대국은 리플레이 소유자가 없으므로 저장 생략
    if (!user) {
      return NextResponse.json({ skipped: true, reason: "GUEST" });
    }

    const winner =
      body.winner === Stone.BLACK || body.winner === Stone.WHITE
        ? body.winner
        : null;

    const record = createGameRecord({
      mode: body.mode,
      moves: body.moves,
      winner,
      finished: body.finished ?? true,
      roomId: body.roomId,
      aiMode: body.aiMode,
      aiStrength: body.aiStrength,
      participantIds: [user.id],
    });

    return NextResponse.json({ record });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "SAVE_FAILED" }, { status: 500 });
  }
}
