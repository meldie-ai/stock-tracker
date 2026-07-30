import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "@/lib/session";
import { isSameOrigin } from "@/lib/csrf";

export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
  return null;
}

/**
 * Guards a mutating API route: requires a valid, non-deactivated session AND
 * a same-origin request. Every non-login, non-cron route handler should call
 * this first.
 */
export async function requireAuthenticatedRequest(
  request: NextRequest
): Promise<{ user: CurrentUser } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isMutating = request.method !== "GET" && request.method !== "HEAD";
  if (isMutating && !isSameOrigin(request)) {
    return { error: NextResponse.json({ error: "Invalid origin" }, { status: 403 }) };
  }

  return { user };
}

/** Like requireAuthenticatedRequest, but also requires role === "ADMIN". */
export async function requireAdminRequest(
  request: NextRequest
): Promise<{ user: CurrentUser } | { error: NextResponse }> {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth;
  if (auth.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return auth;
}
