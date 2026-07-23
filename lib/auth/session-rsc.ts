import { cookies } from "next/headers";
import { getUserFromSessionToken } from "./store";
import type { PublicUser } from "./types";
import { SESSION_COOKIE } from "./types";

/** Server Component / RSC 전용 */
export async function getSessionUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return getUserFromSessionToken(token);
}
