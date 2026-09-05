"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { type AdminStats } from "@/lib/admin";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export default function AdminPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setStats(await api.get<AdminStats>("/admin/stats"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "failedToLoad"));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const pendingCars = stats?.pendingCars ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {t(locale, "adminDashboardTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminDashboardSubtitle")}
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

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {stats ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {(
              [
                [
                  "statusActive",
                  stats.activeCars,
                  "/admin/listings?status=active",
                ],
                ["statusPending", stats.pendingCars, "/admin/approvals"],
                ["sold", stats.soldCars, "/admin/listings?status=sold"],
                ["statUsers", stats.users, "/admin/users"],
                ["showrooms", stats.showrooms ?? 0, "/admin/showrooms"],
              ] as const
            ).map(([labelKey, value, href]) => (
              <Link
                key={labelKey}
                href={href}
                className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
              >
                <p className="text-xs uppercase tracking-wide text-muted">
                  {t(locale, labelKey)}
                </p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/admin/services?status=pending"
              className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                {t(locale, "statPendingServices")}
              </p>
              <p className="mt-2 text-2xl font-bold">
                {stats.pendingServices ?? 0}
              </p>
            </Link>
            <Link
              href="/admin/flagged"
              className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                {t(locale, "statOpenFlags")}
              </p>
              <p className="mt-2 text-2xl font-bold">{stats.openFlags ?? 0}</p>
            </Link>
            <Link
              href="/admin/messages"
              className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                {t(locale, "statOpenTickets")}
              </p>
              <p className="mt-2 text-2xl font-bold">{stats.openTickets ?? 0}</p>
            </Link>
            <Link
              href="/admin/listings"
              className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                {t(locale, "statAllListings")}
              </p>
              <p className="mt-2 text-sm font-semibold text-primary-strong">
                {t(locale, "manage")}
              </p>
            </Link>
            <Link
              href="/admin/ads"
              className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                {t(locale, "statAds")}
              </p>
              <p className="mt-2 text-sm font-semibold text-primary-strong">
                {t(locale, "manage")}
              </p>
            </Link>
            <Link
              href="/admin/analytics"
              className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                {t(locale, "statAnalytics")}
              </p>
              <p className="mt-2 text-sm font-semibold text-primary-strong">
                {t(locale, "reports")}
              </p>
            </Link>
          </div>
        </>
      ) : null}

      <div className="mt-10 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline">
        <h2 className="text-xl font-semibold">
          {t(locale, "pendingApprovals")}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {t(locale, "adminApprovalsSubtitle", { count: pendingCars })}
        </p>
        <Link
          href="/admin/approvals"
          className="mt-4 inline-flex rounded-[var(--radius-control)] bg-primary-fill px-4 py-2 text-sm font-semibold text-on-primary"
        >
          {t(locale, "approvalsOpenQueue")}
        </Link>
      </div>
    </div>
  );
}
