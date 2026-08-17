"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  type ActivityLog,
  formatActivity,
  formatAdminWhen,
} from "@/lib/admin";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export default function AdminActivityPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    try {
      const d = await api.get<{ items: ActivityLog[] }>("/admin/activity");
      setItems(d.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "failedGeneric"));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((log) => {
      const { title, detail } = formatActivity(log, locale);
      return [title, detail, log.adminDisplayName, log.adminId, log.type, log.carId]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [items, query, locale]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {t(locale, "adminActivityTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminActivitySubtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
        >
          {t(locale, "refresh")}
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t(locale, "activitySearchPlaceholder")}
        className="mt-4 w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
      />

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
            <p className="font-semibold">
              {items.length === 0
                ? t(locale, "activityEmptyTitle")
                : t(locale, "noMatches")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {items.length === 0
                ? t(locale, "activityEmptyHint")
                : t(locale, "tryDifferentSearch")}
            </p>
          </div>
        ) : (
          visible.map((log) => {
            const { title, detail } = formatActivity(log, locale);
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
                  <span>
                    {log.adminDisplayName ||
                      log.adminId ||
                      t(locale, "activitySystem")}
                  </span>
                  {log.carId ? (
                    <Link
                      href={`/admin/listings?status=all`}
                      className="font-semibold text-primary"
                    >
                      {t(locale, "activityCarLink", {
                        id: `${log.carId.slice(0, 8)}…`,
                      })}
                    </Link>
                  ) : null}
                  {log.ticketId ? (
                    <Link
                      href="/admin/messages"
                      className="font-semibold text-primary"
                    >
                      {t(locale, "ticketFallback")}
                    </Link>
                  ) : null}
                  {log.flagId ? (
                    <Link
                      href="/admin/flagged"
                      className="font-semibold text-primary"
                    >
                      {t(locale, "flagReportFallback")}
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
