import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { closeActiveShift } from "@/lib/shiftClose";

// Runs once a day at 10:30pm Brisbane time (see vercel.json — Brisbane doesn't
// observe daylight saving, so the UTC cron time never needs adjusting). If a
// shift was left active (no one closed it before locking up), this closes it
// the same way "End shift" does — stock snapshot, sale backfill, CLOSED status
// — so the catalog doesn't sit mid-shift overnight, and leaves a note explaining
// why no one is credited with ending it.

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeShift = await prisma.shift.findFirst({ where: { status: "ACTIVE" } });
  if (!activeShift) {
    return NextResponse.json({ endedShiftId: null });
  }

  try {
    const closedShift = await closeActiveShift(activeShift.id, null, {
      usernameSnapshot: "Automatic",
      text: "Shift automatically ended at 10:30pm — no one had ended it manually.",
    });
    return NextResponse.json({ endedShiftId: closedShift.id });
  } catch (err) {
    console.error("Failed to auto-end shift", err);
    return NextResponse.json({ error: "Failed to auto-end shift" }, { status: 500 });
  }
}
