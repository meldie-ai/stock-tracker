import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client";

export interface SessionData {
  userId: string;
  username: string;
  issuedAt: number;
}

export type CurrentUser = { userId: string; username: string; role: Role };

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    "SESSION_SECRET must be set to a random string of at least 32 characters"
  );
}

export const sessionOptions: SessionOptions = {
  password: sessionSecret,
  cookieName: "stocktracker_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Returns the current authenticated user's session data, or null if not logged in.
 * Every API route (other than login and the cron endpoint) must call this first.
 */
export async function getSessionUser(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return {
    userId: session.userId,
    username: session.username,
    issuedAt: session.issuedAt,
  };
}

/**
 * Like getSessionUser(), but also re-checks the DB: rejects a deactivated
 * account, and rejects a session issued before the account's last password
 * reset. Without this, deactivating someone or resetting their password
 * wouldn't take effect until their existing cookie naturally expired (up to
 * 30 days) — the cookie itself has no way to be revoked early otherwise.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSessionUser();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { username: true, role: true, deactivatedAt: true, passwordChangedAt: true },
  });
  if (!user || user.deactivatedAt) return null;
  if (user.passwordChangedAt && session.issuedAt < user.passwordChangedAt.getTime()) {
    return null;
  }

  return { userId: session.userId, username: user.username, role: user.role };
}
