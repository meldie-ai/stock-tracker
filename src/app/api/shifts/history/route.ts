import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { getClosedShiftsWithinDays } from "@/lib/data";
import { SHIFT_RETENTION_DAYS } from "@/lib/retention";

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const shifts = await getClosedShiftsWithinDays(SHIFT_RETENTION_DAYS);
  return NextResponse.json(shifts);
}
