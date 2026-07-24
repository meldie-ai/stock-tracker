"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/manage", label: "Manage" },
  { href: "/history", label: "History" },
];

export default function NavBar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <nav className="flex gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                  : "text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{username}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-zinc-500 hover:text-red-600"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
