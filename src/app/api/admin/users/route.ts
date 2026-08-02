import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRequest } from "@/lib/apiHelpers";
import { createStaffSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAdminRequest(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 400 });
  }

  // Stored exactly as typed so it displays the way the admin intended (e.g. "Minsel@kp").
  // Login still matches case-insensitively, so uniqueness must be checked the same way —
  // otherwise "Minsel" and "minsel" could both be created as distinct accounts.
  const username = parsed.data.username.trim();
  const existing = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: "STAFF",
      passwordChangedAt: new Date(),
    },
  });

  return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
}
