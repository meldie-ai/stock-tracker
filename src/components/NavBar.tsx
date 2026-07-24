"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CopyTextButton from "@/components/CopyTextButton";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/manage", label: "Manage" },
  { href: "/history", label: "History" },
];

export default function NavBar({ username }: { username: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openedForPathname, setOpenedForPathname] = useState(pathname);

  // Close the menu when navigation changes the route, without an effect:
  // adjusting state during render is React's recommended pattern for this.
  if (pathname !== openedForPathname) {
    setOpenedForPathname(pathname);
    if (open) setOpen(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-3xl items-center justify-between px-4">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          <span className="text-xl leading-none">☰</span>
        </button>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Stock Tracker
        </span>
        <span className="w-9" />
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-4 top-full z-50 mt-1 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 shadow-lg">
            <nav className="flex flex-col mb-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    pathname === link.href
                      ? "rounded-md px-2 py-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                      : "rounded-md px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-900 pt-3 mb-3">
              <CopyTextButton
                label="Copy Products Sold List"
                fetchUrl="/api/shifts/active/text?kind=SOLD"
              />
              <CopyTextButton
                label="Copy Stock Count List"
                fetchUrl="/api/shifts/active/text?kind=STOCK"
                variant="secondary"
              />
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-900 pt-3">
              <span className="text-sm text-zinc-500">{username}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-zinc-500 hover:text-red-600"
              >
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
