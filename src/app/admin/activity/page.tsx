"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  type ActivityLog,
  formatActivity,
  formatAdminWhen,
} from "@/lib/admin";

export default function AdminActivityPage() {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    try {
      const d = await api.get<{ items: ActivityLog[] }>("/admin/activity");
      setItems(d.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((log) => {
      const { title, detail } = formatActivity(log);
      return [title, detail, log.adminDisplayName, log.adminId, log.type, log.carId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, query]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Activity logs</h1>
          <p className="mt-1 text-sm text-muted">
            Recent admin actions across the platform
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
        >
          Refresh
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search actions, admins, car ids…"
        className="mt-4 w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
      />

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
            <p className="font-semibold">
              {items.length === 0 ? "No activity yet" : "No matches"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {items.length === 0
                ? "Admin actions like approvals and bans will show up here."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          visible.map((log) => {
            const { title, detail } = formatActivity(log);
            return (
              <div
                key={log.id}
                className="rounded-[var(--radius-card)] bg-card p-4 text-sm ring-1 ring-outline"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold">{title}</p>
                  <p className="text-xs text-muted">
                    {formatAdminWhen(log.createdAt || log.timestamp)}
                  </p>
                </div>
                {detail ? <p className="mt-1 text-muted">{detail}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                  <span>{log.adminDisplayName || log.adminId || "System"}</span>
                  {log.carId ? (
                    <Link
                      href={`/admin/listings?status=all`}
                      className="font-semibold text-primary"
                    >
                      car {log.carId.slice(0, 8)}…
                    </Link>
                  ) : null}
                  {log.ticketId ? (
                    <Link
                      href="/admin/messages"
                      className="font-semibold text-primary"
                    >
                      ticket
                    </Link>
                  ) : null}
                  {log.flagId ? (
                    <Link
                      href="/admin/flagged"
                      className="font-semibold text-primary"
                    >
                      flag
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
