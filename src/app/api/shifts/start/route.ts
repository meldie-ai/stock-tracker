import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const existingActive = await prisma.shift.findFirst({
    where: { status: "ACTIVE" },
  });
  if (existingActive) {
    return NextResponse.json(
      { error: "A shift is already active. End it before starting a new one." },
      { status: 409 }
    );
  }

  const shift = await prisma.shift.create({
    data: { startedByUserId: auth.user.userId },
  });

  return NextResponse.json(shift, { status: 201 });
}
