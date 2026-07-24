import { NextRequest } from "next/server";

/**
 * Defense-in-depth CSRF check for mutating requests: the SameSite=Lax session
 * cookie already blocks cross-site form/GET-triggered requests, but this
 * verifies Origin (or Referer as fallback) matches the app's own host too.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  if (!host) return false;

  const candidate = origin ?? referer;
  if (!candidate) return false;

  try {
    const candidateHost = new URL(candidate).host;
    return candidateHost === host;
  } catch {
    return false;
  }
}
