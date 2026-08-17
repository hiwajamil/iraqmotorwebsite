"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Car } from "@/lib/api";
import {
  type AdminStats,
  carImage,
  carTitle,
  setCarStatuses,
} from "@/lib/admin";
import { AdReviewModal } from "@/components/admin-ad-review";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export default function AdminPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pending, setPending] = useState<Car[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<Car | null>(null);

  async function load() {
    try {
      const [s, p] = await Promise.all([
        api.get<AdminStats>("/admin/stats"),
        api.get<{ items: Car[] }>("/admin/cars/pending", { limit: "100" }),
      ]);
      setStats(s);
      setPending(p.items ?? []);
      setSelected(new Set());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "failedToLoad"));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(
    ids: string[],
    status: "active" | "rejected" | "expired",
  ) {
    if (!ids.length) return;
    setBusy(true);
    try {
      const res = await setCarStatuses(ids, status);
      const done = new Set(res.updated);
      if (res.failed?.length) {
        setError(
          t(locale, "failedForListings", { count: res.failed.length }),
        );
      }
      setPending((list) => list.filter((c) => !done.has(c.id)));
      setStats((s) =>
        s
          ? {
              ...s,
              pendingCars: Math.max(0, s.pendingCars - done.size),
              activeCars:
                status === "active" ? s.activeCars + done.size : s.activeCars,
            }
          : s,
      );
      setSelected((prev) => {
        const next = new Set(prev);
        done.forEach((id) => next.delete(id));
        return next;
      });
      if (review && done.has(review.id)) setReview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "updateFailed"));
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

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
              <p className="mt-2 text-sm font-semibold text-primary">
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
              <p className="mt-2 text-sm font-semibold text-primary">
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
              <p className="mt-2 text-sm font-semibold text-primary">
                {t(locale, "reports")}
              </p>
            </Link>
          </div>
        </>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {t(locale, "pendingApprovals")}
        </h2>
        <Link
          href="/admin/approvals"
          className="text-xs font-semibold text-primary"
        >
          {t(locale, "viewAll")}
        </Link>
      </div>

      {selected.size > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline">
          <span className="text-xs font-semibold">
            {t(locale, "selectedCount", { count: selected.size })}
          </span>
          <button
            type="button"
            disabled={busy}
            className="rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-50"
            onClick={() => void setStatus([...selected], "active")}
          >
            {t(locale, "approveSelected")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            onClick={() => void setStatus([...selected], "rejected")}
          >
            {t(locale, "rejectSelected")}
          </button>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {pending.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
            <p className="font-semibold">{t(locale, "queueEmpty")}</p>
            <p className="mt-1 text-sm text-muted">
              {t(locale, "queueEmptyHint")}
            </p>
            <Link
              href="/admin/listings"
              className="mt-4 inline-block text-xs font-semibold text-primary"
            >
              {t(locale, "manageAllListings")}
            </Link>
          </div>
        ) : (
          pending.slice(0, 8).map((car) => {
            const img = carImage(car);
            return (
              <div
                key={car.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(car.id)}
                    onChange={() => toggle(car.id)}
                  />
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-14 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-input text-xs text-muted">
                      {t(locale, "noPhoto")}
                    </div>
                  )}
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="text-left font-semibold capitalize hover:text-primary"
                      onClick={() => setReview(car)}
                    >
                      {carTitle(car)}
                    </button>
                    <p className="text-xs text-muted">
                      {[car.city, car.province].filter(Boolean).join(", ") ||
                        car.id}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
                    onClick={() => setReview(car)}
                  >
                    {t(locale, "review")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                    onClick={() => void setStatus([car.id], "active")}
                  >
                    {t(locale, "approve")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    onClick={() => void setStatus([car.id], "rejected")}
                  >
                    {t(locale, "reject")}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {review ? (
        <AdReviewModal
          car={review}
          open
          busy={busy}
          onClose={() => setReview(null)}
          onApprove={() => void setStatus([review.id], "active")}
          onReject={() => void setStatus([review.id], "rejected")}
          onExpire={() => void setStatus([review.id], "expired")}
        />
      ) : null}
    </div>
  );
}
