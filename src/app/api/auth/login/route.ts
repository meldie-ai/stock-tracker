import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isRateLimited, recordLoginAttempt, verifyPassword } from "@/lib/auth";
import { getClientIp } from "@/lib/apiHelpers";
import { loginSchema } from "@/lib/validation";

const GENERIC_ERROR = { error: "Invalid username or password" };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(GENERIC_ERROR, { status: 400 });
  }

  const { username, password } = parsed.data;
  const normalizedUsername = username.toLowerCase();
  const ip = getClientIp(request);

  if (await isRateLimited(normalizedUsername)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
  });

  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  await recordLoginAttempt({
    username: normalizedUsername,
    userId: user?.id ?? null,
    success: valid,
    ip,
  });

  if (!user || !valid) {
    return NextResponse.json(GENERIC_ERROR, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.issuedAt = Date.now();
  await session.save();

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return NextResponse.json({ username: user.username });
}
