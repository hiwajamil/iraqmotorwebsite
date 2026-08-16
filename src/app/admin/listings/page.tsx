"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Car } from "@/lib/api";
import {
  type CarAdminStatus,
  LISTING_STATUSES,
  carImage,
  carTitle,
  setCarStatuses,
  statusBadgeClass,
} from "@/lib/admin";
import { AdReviewModal } from "@/components/admin-ad-review";
import { formatMoney } from "@/lib/car-pricing-trust";

const ALL_STATUSES = "pending,active,sold,expired,rejected";

function parseStatus(
  raw: string | null,
  hasSeller: boolean,
): CarAdminStatus | "all" {
  const fallback = hasSeller ? "all" : "active";
  const value = (raw || fallback) as CarAdminStatus | "all";
  return LISTING_STATUSES.some((s) => s.value === value) ? value : fallback;
}

function AdminListingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = parseStatus(
    searchParams.get("status"),
    Boolean(searchParams.get("sellerId")),
  );
  const sellerId = searchParams.get("sellerId") || "";

  const [items, setItems] = useState<Car[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<Car | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function writeFilters(next: {
    status?: CarAdminStatus | "all";
    sellerId?: string | null;
  }) {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const seller =
      next.sellerId !== undefined ? next.sellerId || "" : sellerId;
    if (s) params.set("status", s);
    if (seller) params.set("sellerId", seller);
    const qs = params.toString();
    router.replace(qs ? `/admin/listings?${qs}` : "/admin/listings", {
      scroll: false,
    });
  }

  const load = useCallback(
    async (opts?: { append?: boolean; cursor?: string | null }) => {
      setLoading(true);
      try {
        const query: Record<string, string> = {
          status: status === "all" ? ALL_STATUSES : status,
          limit: "40",
          sort: "newest",
        };
        if (sellerId.trim()) query.sellerId = sellerId.trim();
        if (opts?.cursor) query.cursor = opts.cursor;
        const d = await api.get<{ items: Car[]; nextCursor?: string | null }>(
          "/cars",
          query,
        );
        const list = d.items ?? [];
        setItems((prev) => (opts?.append ? [...prev, ...list] : list));
        setNextCursor(d.nextCursor ?? null);
        if (!opts?.append) setSelected(new Set());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load listings");
      } finally {
        setLoading(false);
      }
    },
    [status, sellerId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatusFor(ids: string[], next: CarAdminStatus) {
    if (!ids.length) return;
    if (
      (next === "rejected" || next === "expired") &&
      !window.confirm(`Set ${ids.length} listing(s) to ${next}?`)
    ) {
      return;
    }
    setBusy(true);
    setSuccess(null);
    try {
      const res = await setCarStatuses(ids, next);
      const done = new Set(res.updated);
      if (res.failed?.length) {
        setError(`Failed for ${res.failed.length} listing(s)`);
      } else {
        setError(null);
      }
      if (done.size) setSuccess(`${done.size} listing(s) set to ${next}`);
      setItems((list) =>
        list
          .map((c) => (done.has(c.id) ? { ...c, status: next } : c))
          .filter((c) => status === "all" || c.status === status),
      );
      setSelected((prev) => {
        const n = new Set(prev);
        done.forEach((id) => n.delete(id));
        return n;
      });
      if (review && done.has(review.id)) {
        setReview((r) => (r ? { ...r, status: next } : r));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteListing(car: Car) {
    if (!window.confirm(`Permanently delete "${carTitle(car)}"?`)) return;
    setBusy(true);
    try {
      await api.delete(`/cars/${car.id}`);
      setItems((list) => list.filter((c) => c.id !== car.id));
      if (review?.id === car.id) setReview(null);
      setSuccess("Listing deleted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  const q = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!q) return items;
    return items.filter((c) =>
      [c.brandId, c.modelKey, c.city, c.province, c.sellerId, c.id, c.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [items, q]);

  const visibleIds = useMemo(
    () => new Set(visible.map((c) => c.id)),
    [visible],
  );
  const selectedVisible = useMemo(
    () => [...selected].filter((id) => visibleIds.has(id)),
    [selected, visibleIds],
  );

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

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
          <h1 className="text-3xl font-bold">Listings</h1>
          <p className="mt-1 text-sm text-muted">
            Manage listing lifecycle across all statuses
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

      <div className="mt-4 flex flex-wrap gap-2">
        {LISTING_STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => writeFilters({ status: s.value })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === s.value
                ? "bg-primary text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter loaded results by brand, city, seller…"
          className="w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
        />
        {sellerId ? (
          <button
            type="button"
            onClick={() => writeFilters({ sellerId: null })}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            Seller: {sellerId.slice(0, 10)}… ×
          </button>
        ) : null}
      </div>

      {selectedVisible.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline">
          <span className="text-xs font-semibold">
            {selectedVisible.length} selected
          </span>
          {(
            [
              ["active", "Activate"],
              ["pending", "Pending"],
              ["sold", "Sold"],
              ["expired", "Expire"],
              ["rejected", "Reject"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={busy}
              className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              onClick={() => void setStatusFor(selectedVisible, value)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className="text-xs font-semibold text-muted"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      ) : null}

      {success ? (
        <p className="mt-4 text-sm text-emerald-600" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {loading && items.length === 0 ? (
          <p className="text-sm text-muted">Loading listings…</p>
        ) : visible.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
            <p className="font-semibold">No listings here</p>
            <p className="mt-1 text-sm text-muted">
              Try another status filter or refresh the queue.
            </p>
          </div>
        ) : (
          visible.map((car) => {
            const img = carImage(car);
            return (
              <div
                key={car.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
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
                      className="h-16 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-input text-xs text-muted">
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
                        "—"}
                      {car.priceValue != null
                        ? ` · ${formatMoney(car.priceValue, car.currencyKey)}`
                        : ""}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(car.status)}`}
                    >
                      {car.status || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
                    onClick={() => setReview(car)}
                  >
                    Review
                  </button>
                  {car.status !== "active" ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                      onClick={() => void setStatusFor([car.id], "active")}
                    >
                      Activate
                    </button>
                  ) : null}
                  {car.status === "active" ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      onClick={() => void setStatusFor([car.id], "sold")}
                    >
                      Mark sold
                    </button>
                  ) : null}
                  {car.status !== "expired" ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      onClick={() => void setStatusFor([car.id], "expired")}
                    >
                      Expire
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-[var(--radius-control)] px-3 py-2 text-xs font-semibold text-red-600 hover:bg-input disabled:opacity-50"
                    onClick={() => void deleteListing(car)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {nextCursor ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={loading}
            className="rounded-[var(--radius-control)] bg-input px-4 py-2 text-sm font-semibold disabled:opacity-50"
            onClick={() => void load({ append: true, cursor: nextCursor })}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}

      {review ? (
        <AdReviewModal
          car={review}
          open
          busy={busy}
          onClose={() => setReview(null)}
          onApprove={() => void setStatusFor([review.id], "active")}
          onReject={() => void setStatusFor([review.id], "rejected")}
          onExpire={() => void setStatusFor([review.id], "expired")}
          onSold={() => void setStatusFor([review.id], "sold")}
          onDelete={() => void deleteListing(review)}
          onUpdated={(next) => {
            setReview(next);
            setItems((list) =>
              list.map((c) => (c.id === next.id ? { ...c, ...next } : c)),
            );
          }}
        />
      ) : null}
    </div>
  );
}

export default function AdminListingsPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted">Loading listings…</p>}
    >
      <AdminListingsInner />
    </Suspense>
  );
}
