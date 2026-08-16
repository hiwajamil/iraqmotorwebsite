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

export default function AdminPage() {
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
      setError(e instanceof Error ? e.message : "Failed to load admin");
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
        setError(`Failed for ${res.failed.length} listing(s)`);
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
      setError(e instanceof Error ? e.message : "Update failed");
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
          <h1 className="text-3xl font-bold">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Platform stats and pending listing queue
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

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {stats ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {(
              [
                ["Active", stats.activeCars, "/admin/listings?status=active"],
                ["Pending", stats.pendingCars, "/admin/approvals"],
                ["Sold", stats.soldCars, "/admin/listings?status=sold"],
                ["Users", stats.users, "/admin/users"],
                ["Showrooms", stats.showrooms ?? 0, "/admin/showrooms"],
              ] as const
            ).map(([label, value, href]) => (
              <Link
                key={label}
                href={href}
                className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
              >
                <p className="text-xs uppercase tracking-wide text-muted">
                  {label}
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
                Open flags
              </p>
              <p className="mt-2 text-2xl font-bold">{stats.openFlags ?? 0}</p>
            </Link>
            <Link
              href="/admin/messages"
              className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                Open tickets
              </p>
              <p className="mt-2 text-2xl font-bold">{stats.openTickets ?? 0}</p>
            </Link>
            <Link
              href="/admin/listings"
              className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                All listings
              </p>
              <p className="mt-2 text-sm font-semibold text-primary">Manage →</p>
            </Link>
            <Link
              href="/admin/ads"
              className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                Ads
              </p>
              <p className="mt-2 text-sm font-semibold text-primary">
                Manage →
              </p>
            </Link>
            <Link
              href="/admin/analytics"
              className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline transition hover:ring-primary"
            >
              <p className="text-xs uppercase tracking-wide text-muted">
                Analytics
              </p>
              <p className="mt-2 text-sm font-semibold text-primary">
                Reports →
              </p>
            </Link>
          </div>
        </>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Pending approvals</h2>
        <Link
          href="/admin/approvals"
          className="text-xs font-semibold text-primary"
        >
          View all
        </Link>
      </div>

      {selected.size > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline">
          <span className="text-xs font-semibold">{selected.size} selected</span>
          <button
            type="button"
            disabled={busy}
            className="rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-50"
            onClick={() => void setStatus([...selected], "active")}
          >
            Approve selected
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            onClick={() => void setStatus([...selected], "rejected")}
          >
            Reject selected
          </button>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {pending.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
            <p className="font-semibold">Queue is empty</p>
            <p className="mt-1 text-sm text-muted">
              Nothing waiting for approval right now.
            </p>
            <Link
              href="/admin/listings"
              className="mt-4 inline-block text-xs font-semibold text-primary"
            >
              Manage all listings →
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
                      No photo
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
                    Review
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                    onClick={() => void setStatus([car.id], "active")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    onClick={() => void setStatus([car.id], "rejected")}
                  >
                    Reject
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
