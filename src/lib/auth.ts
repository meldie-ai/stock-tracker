import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

/**
 * Returns true if the given username has too many recent failed login
 * attempts and should be blocked from trying again right now.
 */
export async function isRateLimited(username: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentFailures = await prisma.loginAttempt.count({
    where: {
      username: username.toLowerCase(),
      success: false,
      createdAt: { gte: since },
    },
  });
  return recentFailures >= RATE_LIMIT_MAX_ATTEMPTS;
}

export async function recordLoginAttempt(params: {
  username: string;
  userId: string | null;
  success: boolean;
  ip: string | null;
}): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      username: params.username.toLowerCase(),
      userId: params.userId,
      success: params.success,
      ip: params.ip,
    },
  });
}
