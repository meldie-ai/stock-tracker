"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDateDDMMYY, formatTime12 } from "@/lib/dateFormat";

type StaffUser = {
  id: string;
  username: string;
  role: "ADMIN" | "STAFF";
  deactivatedAt: string | null;
  lastLoginAt: string | null;
};

export default function AdminStaffClient({ users }: { users: StaffUser[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetPasswordFor, setResetPasswordFor] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  function run(action: () => Promise<Response>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  function createStaff() {
    if (!newUsername.trim() || !newPassword) return;
    run(() =>
      fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword }),
      })
    );
    setNewUsername("");
    setNewPassword("");
  }

  function deactivate(id: string) {
    if (
      !confirm(
        "Deactivate this account? They won't be able to log in, but their shift and audit history stays intact."
      )
    ) {
      return;
    }
    run(() => fetch(`/api/admin/users/${id}/deactivate`, { method: "POST" }));
  }

  function reactivate(id: string) {
    run(() => fetch(`/api/admin/users/${id}/reactivate`, { method: "POST" }));
  }

  function submitResetPassword(id: string) {
    if (!resetPasswordValue) return;
    run(() =>
      fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordValue }),
      })
    );
    setResetPasswordFor(null);
    setResetPasswordValue("");
  }

  return (
    <div>
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-4">
        <h2 className="text-sm font-semibold mb-2">Add staff account</h2>
        <div className="flex flex-col gap-2">
          <input
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Password (min 8 characters)"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
          />
          <button
            onClick={createStaff}
            disabled={isPending}
            className="rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium disabled:opacity-50 self-start"
          >
            Create account
          </button>
        </div>
      </section>

      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {users.map((user) => (
        <section
          key={user.id}
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 mb-3"
        >
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            <span className="uppercase">{user.username}</span>{" "}
            <span className="text-xs font-normal text-zinc-400">({user.role})</span>
          </p>
          <p className="text-xs text-zinc-500">
            {user.deactivatedAt ? "Deactivated" : "Active"}
            {user.lastLoginAt &&
              ` · Last login ${formatDateDDMMYY(new Date(user.lastLoginAt))} ${formatTime12(
                new Date(user.lastLoginAt)
              )}`}
          </p>

          {user.role !== "ADMIN" && (
            <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-900">
              {user.deactivatedAt ? (
                <button
                  onClick={() => reactivate(user.id)}
                  disabled={isPending}
                  className="text-xs text-zinc-600 dark:text-zinc-400 hover:underline"
                >
                  Reactivate
                </button>
              ) : (
                <button
                  onClick={() => deactivate(user.id)}
                  disabled={isPending}
                  className="text-xs text-red-500 hover:underline"
                >
                  Deactivate
                </button>
              )}

              {resetPasswordFor === user.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="New password"
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    className="w-36 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() => submitResetPassword(user.id)}
                    disabled={isPending}
                    className="text-xs font-medium text-zinc-900 dark:text-zinc-50 hover:underline"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setResetPasswordFor(null);
                      setResetPasswordValue("");
                    }}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResetPasswordFor(user.id)}
                  className="text-xs text-zinc-500 hover:underline"
                >
                  Reset password
                </button>
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
