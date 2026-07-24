import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { getClosedShiftsWithinDays } from "@/lib/data";

const HISTORY_RETENTION_DAYS = 7;

export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const shifts = await getClosedShiftsWithinDays(HISTORY_RETENTION_DAYS);
  return NextResponse.json(shifts);
}
