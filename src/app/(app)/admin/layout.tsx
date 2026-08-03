import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/");

  return (
    <div>
      <nav className="flex flex-wrap gap-2 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <Link
          href="/admin/staff"
          className="touch-manipulation rounded-md px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 active:bg-black/10 hover:bg-black/5 dark:active:bg-zinc-800 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Staff
        </Link>
        <Link
          href="/audit"
          className="touch-manipulation rounded-md px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 active:bg-black/10 hover:bg-black/5 dark:active:bg-zinc-800 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Audit Log
        </Link>
        <Link
          href="/admin/reports"
          className="touch-manipulation rounded-md px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 active:bg-black/10 hover:bg-black/5 dark:active:bg-zinc-800 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Sales Report
        </Link>
      </nav>
      {children}
    </div>
  );
}
