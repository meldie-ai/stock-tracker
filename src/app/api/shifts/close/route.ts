import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { closeActiveShift } from "@/lib/shiftClose";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const activeShift = await prisma.shift.findFirst({ where: { status: "ACTIVE" } });
  if (!activeShift) {
    return NextResponse.json({ error: "No active shift" }, { status: 409 });
  }

  try {
    const closedShift = await closeActiveShift(activeShift.id, auth.user.userId);
    return NextResponse.json(closedShift);
  } catch (err) {
    console.error("Failed to close shift", err);
    return NextResponse.json({ error: "Failed to end shift" }, { status: 500 });
  }
}
