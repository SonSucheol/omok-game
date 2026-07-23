import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = getSessionUserFromRequest(request);
  return NextResponse.json({ user });
}
