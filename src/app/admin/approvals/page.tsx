"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Car } from "@/lib/api";
import {
  carImage,
  carTitle,
  groupByCity,
  setCarStatuses,
} from "@/lib/admin";
import { AdReviewModal } from "@/components/admin-ad-review";
import { formatMoney } from "@/lib/car-pricing-trust";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export default function AdminApprovalsPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<Car[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<Car | null>(null);
  const [view, setView] = useState<"list" | "cities">("list");
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  async function load() {
    try {
      const d = await api.get<{ items: Car[] }>("/admin/cars/pending", {
        limit: "100",
      });
      setItems(d.items ?? []);
      setSelected(new Set());
      setError(null);
      setSuccess(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "failedGeneric"));
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
    if (
      (status === "rejected" || status === "expired") &&
      !window.confirm(
        t(
          locale,
          status === "rejected" ? "confirmRejectListings" : "confirmExpireListings",
          { count: ids.length },
        ),
      )
    ) {
      return;
    }
    setBusy(true);
    setSuccess(null);
    try {
      const res = await setCarStatuses(ids, status);
      const done = new Set(res.updated);
      if (res.failed?.length) {
        setError(t(locale, "failedForListings", { count: res.failed.length }));
      } else {
        setError(null);
      }
      if (done.size)
        setSuccess(
          t(
            locale,
            status === "active"
              ? "listingsApproved"
              : status === "rejected"
                ? "listingsRejected"
                : "listingsExpired",
            { count: done.size },
          ),
        );
      setItems((list) => list.filter((c) => !done.has(c.id)));
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

  const q = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    let list = items;
    if (cityFilter) {
      list = list.filter(
        (c) =>
          String(c.city || c.province || "Unknown").trim() === cityFilter,
      );
    }
    if (!q) return list;
    return list.filter((c) =>
      [c.brandId, c.modelKey, c.city, c.province, c.sellerId, c.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [items, q, cityFilter]);

  const visibleIds = useMemo(
    () => new Set(visible.map((c) => c.id)),
    [visible],
  );
  const selectedVisible = useMemo(() => {
    return [...selected].filter((id) => visibleIds.has(id));
  }, [selected, visibleIds]);

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [visibleIds]);

  const cities = useMemo(() => groupByCity(items), [items]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedVisible.length === visible.length && visible.length > 0) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(visible.map((c) => c.id)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "adminApprovalsTitle")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminApprovalsSubtitle", { count: items.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView(view === "list" ? "cities" : "list")}
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
          >
            {view === "list" ? t(locale, "viewByCity") : t(locale, "viewList")}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
          >
            {t(locale, "refresh")}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t(locale, "listingsFilterPlaceholder")}
          className="w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
        />
        {cityFilter ? (
          <button
            type="button"
            onClick={() => setCityFilter(null)}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            {t(locale, "cityFilterChip", {
              name:
                cityFilter === "Unknown"
                  ? t(locale, "unknownCity")
                  : cityFilter,
            })}
          </button>
        ) : null}
      </div>

      {selectedVisible.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline">
          <span className="text-xs font-semibold">
            {t(locale, "selectedCount", { count: selectedVisible.length })}
          </span>
          <button
            type="button"
            disabled={busy}
            className="rounded-[var(--radius-control)] bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-50"
            onClick={() => void setStatus(selectedVisible, "active")}
          >
            {t(locale, "approveSelected")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            onClick={() => void setStatus(selectedVisible, "rejected")}
          >
            {t(locale, "rejectSelected")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            onClick={() => void setStatus(selectedVisible, "expired")}
          >
            {t(locale, "expireSelected")}
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-muted"
            onClick={() => setSelected(new Set())}
          >
            {t(locale, "clearSelection")}
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

      {view === "cities" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {cities.length === 0 ? (
            <p className="text-sm text-muted">{t(locale, "queueEmpty")}</p>
          ) : (
            cities.map((group) => (
              <button
                key={group.city}
                type="button"
                onClick={() => {
                  setCityFilter(group.city);
                  setView("list");
                }}
                className="rounded-[var(--radius-card)] bg-card p-4 text-left ring-1 ring-outline transition hover:ring-primary"
              >
                <p className="font-semibold">
                  {group.city === "Unknown"
                    ? t(locale, "unknownCity")
                    : group.city}
                </p>
                <p className="mt-2 text-2xl font-bold">{group.items.length}</p>
                <p className="text-xs text-muted">{t(locale, "pendingLabel")}</p>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.length === 0 ? (
            <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
              <p className="font-semibold">
                {items.length === 0
                  ? t(locale, "queueEmpty")
                  : t(locale, "noMatches")}
              </p>
              <p className="mt-1 text-sm text-muted">
                {items.length === 0
                  ? t(locale, "approvalsEmptyHint")
                  : t(locale, "approvalsNoMatchesHint")}
              </p>
            </div>
          ) : (
            <>
              <label className="flex items-center gap-2 text-xs font-semibold text-muted">
                <input
                  type="checkbox"
                  checked={
                    visible.length > 0 &&
                    selectedVisible.length === visible.length
                  }
                  onChange={toggleAll}
                />
                {t(locale, "selectAllVisible")}
              </label>
              {visible.map((car) => {
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
                          {t(locale, "noPhoto")}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold capitalize">
                          {carTitle(car)}
                        </p>
                        <p className="text-xs text-muted">
                          {[car.city, car.province].filter(Boolean).join(", ") ||
                            "—"}
                          {car.priceValue != null
                            ? ` · ${formatMoney(car.priceValue, car.currencyKey)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
              })}
            </>
          )}
        </div>
      )}

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
