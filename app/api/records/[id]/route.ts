import { NextResponse } from "next/server";
import { getGameRecord, userCanAccessRecord } from "@/lib/records";
import { AUTH_ERROR_MESSAGES, getSessionUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const user = getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: AUTH_ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 },
    );
  }

  const { id } = await params;
  const record = getGameRecord(id);
  if (!record || !userCanAccessRecord(record, user.id)) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ record });
}
