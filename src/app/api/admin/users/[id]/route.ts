import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRequest } from "@/lib/apiHelpers";

/**
 * Permanently deletes a staff account — only once it's deactivated, so an
 * account still in use can't be removed out from under someone. Shift, sale,
 * audit log, and login-attempt rows that reference this user aren't deleted —
 * each one is set up with ON DELETE SET NULL plus its own usernameSnapshot
 * (or equivalent), so they keep displaying this account's name correctly
 * even after the row itself is gone.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest(request);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot delete an admin account" }, { status: 403 });
  }
  if (!target.deactivatedAt) {
    return NextResponse.json(
      { error: "Deactivate this account before deleting it" },
      { status: 409 }
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
