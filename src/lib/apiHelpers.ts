import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, type SessionData } from "@/lib/session";
import { isSameOrigin } from "@/lib/csrf";

export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return null;
}

/**
 * Guards a mutating API route: requires a valid session AND a same-origin
 * request. Every non-login, non-cron route handler should call this first.
 */
export async function requireAuthenticatedRequest(
  request: NextRequest
): Promise<{ user: SessionData } | { error: NextResponse }> {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isMutating = request.method !== "GET" && request.method !== "HEAD";
  if (isMutating && !isSameOrigin(request)) {
    return { error: NextResponse.json({ error: "Invalid origin" }, { status: 403 }) };
  }

  return { user };
}
