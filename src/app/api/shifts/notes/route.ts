import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthenticatedRequest } from "@/lib/apiHelpers";
import { shiftNoteSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedRequest(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = shiftNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Note can't be empty" }, { status: 400 });
  }

  const activeShift = await prisma.shift.findFirst({ where: { status: "ACTIVE" } });
  if (!activeShift) {
    return NextResponse.json({ error: "Start a shift to do this" }, { status: 409 });
  }

  const note = await prisma.shiftNote.create({
    data: {
      shiftId: activeShift.id,
      userId: auth.user.userId,
      usernameSnapshot: auth.user.username,
      text: parsed.data.text,
    },
  });

  return NextResponse.json(note, { status: 201 });
}
