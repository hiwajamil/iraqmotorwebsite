"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MoreHorizontal } from "lucide-react";
import { api, type Car } from "@/lib/api";
import {
  type AdminStats,
  carImage,
  carTitle,
  parseAdminDate,
  setCarStatuses,
} from "@/lib/admin";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdminToast } from "@/components/admin-toast";
import { AdReviewModal } from "@/components/admin-ad-review";
import { formatMoney } from "@/lib/car-pricing-trust";
import { HOME_CITIES, homeCityLabel } from "@/lib/home-data";
import { t, type Locale } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const PAGE_SIZE = "50";
const SEARCH_DEBOUNCE_MS = 300;
const MENU_ITEM =
  "flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-xs font-semibold data-focus:bg-input disabled:opacity-50";

type QueueSort = "oldest" | "newest";
type QueueAction = "active" | "rejected" | "expired";
type Toast = { message: string; tone: "success" | "error" };

type PendingListResponse = {
  items: Car[];
  total: number;
  nextCursor?: string | null;
};

function parseSort(raw: string | null): QueueSort {
  return raw === "newest" ? "newest" : "oldest";
}

function sellerPrimary(car: Car): string {
  const name = String(car.sellerName ?? "").trim();
  if (name) return name;
  const showroom = String(car.sellerShowroom ?? "").trim();
  if (showroom) return showroom;
  if (car.sellerId) return car.sellerId.slice(0, 10);
  return "—";
}

function createdDate(car: Car): Date | null {
  const raw = car.createdAt;
  if (!raw) return null;
  if (typeof raw === "string") return parseAdminDate(raw);
  if (typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.iso === "string") return parseAdminDate(obj.iso);
  if (typeof obj._seconds === "number" || typeof obj.seconds === "number") {
    return parseAdminDate({
      _seconds: typeof obj._seconds === "number" ? obj._seconds : undefined,
      seconds: typeof obj.seconds === "number" ? obj.seconds : undefined,
    });
  }
  return null;
}

function waitingAge(car: Car, locale: Locale): string {
  const d = createdDate(car);
  if (!d) return "—";
  const hours = Math.max(0, Math.floor((Date.now() - d.getTime()) / 3_600_000));
  if (hours < 24) return t(locale, "approvalsWaitingHours", { count: hours });
  return t(locale, "approvalsWaitingDays", { count: Math.floor(hours / 24) });
}

function ListingThumb({ car, locale }: { car: Car; locale: Locale }) {
  const img = carImage(car);
  if (img) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={img}
        alt=""
        className="h-12 w-16 shrink-0 rounded-md object-cover"
      />
    );
  }
  return (
    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-input text-[10px] text-muted">
      {t(locale, "noPhoto")}
    </div>
  );
}

function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-t border-outline">
          <td className="px-3 py-2" colSpan={8}>
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-pulse rounded bg-input" />
              <div className="h-12 w-16 animate-pulse rounded-md bg-input" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-48 max-w-full animate-pulse rounded bg-input" />
                <div className="h-2.5 w-32 max-w-[60%] animate-pulse rounded bg-input" />
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2 md:hidden">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline"
        >
          <div className="h-4 w-4 animate-pulse rounded bg-input" />
          <div className="h-12 w-16 animate-pulse rounded-md bg-input" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-40 max-w-full animate-pulse rounded bg-input" />
            <div className="h-2.5 w-24 animate-pulse rounded bg-input" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminApprovalsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useAppSelector((s) => s.preferences.locale);
  const q = searchParams.get("q") || "";
  const city = searchParams.get("city") || "";
  const sort = parseSort(searchParams.get("sort"));

  const [qDraft, setQDraft] = useState(q);
  const [items, setItems] = useState<Car[]>([]);
  const [matchTotal, setMatchTotal] = useState(0);
  const [pendingCars, setPendingCars] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<Car | null>(null);
  const [pending, setPending] = useState<{
    ids: string[];
    status: QueueAction;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const writeFilters = useCallback(
    (next: { q?: string | null; city?: string | null; sort?: QueueSort | null }) => {
      const params = new URLSearchParams();
      const nextQ = next.q !== undefined ? next.q || "" : q;
      const nextCity = next.city !== undefined ? next.city || "" : city;
      const nextSort = next.sort !== undefined ? next.sort || "oldest" : sort;
      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (nextCity.trim()) params.set("city", nextCity.trim());
      if (nextSort === "newest") params.set("sort", "newest");
      const qs = params.toString();
      router.replace(qs ? `/admin/approvals?${qs}` : "/admin/approvals", {
        scroll: false,
      });
    },
    [q, city, sort, router],
  );

  useEffect(() => {
    setQDraft(q);
  }, [q]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const trimmed = qDraft.trim();
      if (trimmed === q.trim()) return;
      writeFilters({ q: trimmed || null });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [qDraft, q, writeFilters]);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.get<AdminStats>("/admin/stats");
      setPendingCars(s.pendingCars);
    } catch {
      // Keep last known queue total.
    }
  }, []);

  const load = useCallback(
    async (opts?: { append?: boolean; cursor?: string | null }) => {
      setLoading(true);
      if (!opts?.append) {
        setItems([]);
        setNextCursor(null);
        setSelected(new Set());
      }
      try {
        const query: Record<string, string> = {
          limit: PAGE_SIZE,
          sort,
        };
        if (q.trim()) query.q = q.trim();
        if (city.trim()) query.city = city.trim();
        if (opts?.cursor) query.cursor = opts.cursor;
        const d = await api.get<PendingListResponse>(
          "/admin/cars/pending",
          query,
        );
        const list = d.items ?? [];
        setItems((prev) => (opts?.append ? [...prev, ...list] : list));
        const total = d.total ?? 0;
        setMatchTotal(total);
        if (!q.trim() && !city.trim() && !opts?.append) {
          setPendingCars(total);
        }
        setNextCursor(d.nextCursor ?? null);
        if (!opts?.append) setSelected(new Set());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : t(locale, "failedToLoad"));
      } finally {
        setLoading(false);
      }
    },
    [q, city, sort, locale],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const itemIds = useMemo(() => new Set(items.map((c) => c.id)), [items]);
  const selectedVisible = useMemo(
    () => [...selected].filter((id) => itemIds.has(id)),
    [selected, itemIds],
  );
  const allSelected =
    items.length > 0 && items.every((c) => selected.has(c.id));

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => itemIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [itemIds]);

  async function applyStatus(
    ids: string[],
    status: QueueAction,
    reason?: string,
  ) {
    if (!ids.length) return false;
    setBusy(true);
    try {
      const res = await setCarStatuses(ids, status, reason);
      const done = new Set(res.updated);
      if (res.failed?.length) {
        setError(t(locale, "failedForListings", { count: res.failed.length }));
        setToast({
          message: t(locale, "failedForListings", { count: res.failed.length }),
          tone: "error",
        });
      } else {
        setError(null);
      }
      if (done.size) {
        setToast({
          message: t(
            locale,
            status === "active"
              ? "listingsApproved"
              : status === "rejected"
                ? "listingsRejected"
                : "listingsExpired",
            { count: done.size },
          ),
          tone: "success",
        });
        setItems((list) => list.filter((c) => !done.has(c.id)));
        setMatchTotal((n) => Math.max(0, n - done.size));
        setPendingCars((n) => Math.max(0, n - done.size));
        setSelected((prev) => {
          const next = new Set(prev);
          done.forEach((id) => next.delete(id));
          return next;
        });
        if (review && done.has(review.id)) setReview(null);
        void loadStats();
      }
      return done.size > 0;
    } catch (e) {
      const message = e instanceof Error ? e.message : t(locale, "updateFailed");
      setError(message);
      setToast({ message, tone: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function requestStatus(ids: string[], status: QueueAction) {
    if (!ids.length) return;
    if (status === "active") {
      void applyStatus(ids, status);
      return;
    }
    setRejectReason("");
    setPending({ ids, status });
  }

  async function confirmPending() {
    if (!pending) return;
    const reason = rejectReason.trim();
    if (pending.status === "rejected" && !reason) return;
    const ok = await applyStatus(
      pending.ids,
      pending.status,
      pending.status === "rejected" ? reason : undefined,
    );
    if (ok) setPending(null);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((c) => c.id)));
  }

  const cityChips = HOME_CITIES.filter(
    (c): c is (typeof HOME_CITIES)[number] & { key: string } => c.key != null,
  );
  const filtersOn = Boolean(q.trim() || city.trim());
  const emptyQueue =
    !loading && items.length === 0 && pendingCars === 0 && !filtersOn;
  const noMatches =
    !loading && items.length === 0 && (pendingCars > 0 || filtersOn);
  const showSkeleton = loading && items.length === 0;

  const confirmTitle = pending
    ? pending.status === "rejected"
      ? t(locale, "listingsConfirmRejectTitle")
      : t(locale, "listingsConfirmExpireTitle")
    : "";
  const confirmDescription = pending
    ? t(
        locale,
        pending.status === "rejected"
          ? "confirmRejectListings"
          : "confirmExpireListings",
        { count: pending.ids.length },
      )
    : "";

  function rowMenu(car: Car) {
    return (
      <Menu>
        <MenuButton
          disabled={busy}
          aria-label={t(locale, "openMenu")}
          className="rounded-[var(--radius-control)] p-1.5 text-muted hover:bg-input hover:text-foreground disabled:opacity-50"
        >
          <MoreHorizontal className="h-4 w-4" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          className="z-30 w-40 origin-top-end rounded-[var(--radius-card)] bg-card p-1 shadow-lg ring-1 ring-outline [--anchor-gap:4px]"
        >
          <MenuItem>
            <button
              type="button"
              className={MENU_ITEM}
              onClick={() => requestStatus([car.id], "expired")}
            >
              {t(locale, "expire")}
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {t(locale, "adminApprovalsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminApprovalsSubtitle", { count: pendingCars })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void load();
            void loadStats();
          }}
          className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
        >
          {t(locale, "refresh")}
        </button>
      </div>

      <input
        value={qDraft}
        onChange={(e) => setQDraft(e.target.value)}
        placeholder={t(locale, "listingsFilterPlaceholder")}
        className="mt-4 w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => writeFilters({ city: null })}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            !city ? "bg-primary-fill text-on-primary" : "bg-input text-muted"
          }`}
        >
          {t(locale, "all")}
        </button>
        {cityChips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => writeFilters({ city: c.key })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              city === c.key
                ? "bg-primary-fill text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {homeCityLabel(c, locale)}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["oldest", "sortOldest"],
            ["newest", "sortNewest"],
          ] as const
        ).map(([value, labelKey]) => (
          <button
            key={value}
            type="button"
            onClick={() => writeFilters({ sort: value })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              sort === value
                ? "bg-primary-fill text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {t(locale, labelKey)}
          </button>
        ))}
      </div>

      {selectedVisible.length > 0 ? (
        <div className="sticky top-24 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline">
          <span className="text-xs font-semibold">
            {t(locale, "selectedCount", { count: selectedVisible.length })}
          </span>
          <button
            type="button"
            disabled={busy}
            className="rounded-[var(--radius-control)] bg-primary-fill px-3 py-1.5 text-xs font-semibold text-on-primary disabled:opacity-50"
            onClick={() => requestStatus(selectedVisible, "active")}
          >
            {t(locale, "approveSelected")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            onClick={() => requestStatus(selectedVisible, "rejected")}
          >
            {t(locale, "rejectSelected")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            onClick={() => requestStatus(selectedVisible, "expired")}
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

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {showSkeleton ? (
        <>
          <div className="mt-4">
            <SkeletonCards />
          </div>
          <div className="mt-4 hidden overflow-x-auto rounded-[var(--radius-card)] ring-1 ring-outline md:block">
            <table className="w-full text-left text-sm">
              <tbody>
                <SkeletonRows />
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {emptyQueue ? (
        <div className="mt-6 rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
          <p className="font-semibold">{t(locale, "queueEmpty")}</p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "approvalsEmptyHint")}
          </p>
        </div>
      ) : null}

      {noMatches ? (
        <div className="mt-6 rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
          <p className="font-semibold">{t(locale, "noMatches")}</p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "approvalsNoMatchesHint")}
          </p>
        </div>
      ) : null}

      {!emptyQueue && !noMatches && !showSkeleton ? (
        <>
          <div className="mt-4 space-y-2 md:hidden">
            {items.map((car) => (
              <div
                key={car.id}
                className="flex items-start gap-3 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline"
              >
                <input
                  type="checkbox"
                  checked={selected.has(car.id)}
                  onChange={() => toggle(car.id)}
                  aria-label={carTitle(car)}
                />
                <ListingThumb car={car} locale={locale} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="text-left font-semibold capitalize hover:text-primary-strong"
                    onClick={() => setReview(car)}
                  >
                    {carTitle(car)}
                  </button>
                  <p className="text-[11px] text-muted">
                    {[car.city || car.province, sellerPrimary(car)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-[11px] text-muted">
                    {car.priceValue != null
                      ? formatMoney(car.priceValue, car.currencyKey)
                      : "—"}
                    {" · "}
                    {waitingAge(car, locale)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-[var(--radius-control)] bg-primary-fill px-2.5 py-1 text-[11px] font-semibold text-on-primary disabled:opacity-50"
                      onClick={() => requestStatus([car.id], "active")}
                    >
                      {t(locale, "approve")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded-[var(--radius-control)] bg-input px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
                      onClick={() => requestStatus([car.id], "rejected")}
                    >
                      {t(locale, "reject")}
                    </button>
                    <button
                      type="button"
                      className="rounded-[var(--radius-control)] bg-input px-2.5 py-1 text-[11px] font-semibold"
                      onClick={() => setReview(car)}
                    >
                      {t(locale, "review")}
                    </button>
                    {rowMenu(car)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-[var(--radius-card)] ring-1 ring-outline md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-input text-xs uppercase text-muted">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      disabled={items.length === 0}
                      aria-label={t(locale, "selectAllVisible")}
                    />
                  </th>
                  <th className="w-20 px-2 py-2">{t(locale, "colThumbnail")}</th>
                  <th className="px-3 py-2">{t(locale, "colTitle")}</th>
                  <th className="px-3 py-2">{t(locale, "colCity")}</th>
                  <th className="px-3 py-2 text-right">
                    {t(locale, "listingsColPrice")}
                  </th>
                  <th className="px-3 py-2">{t(locale, "listingsColSeller")}</th>
                  <th className="px-3 py-2">{t(locale, "approvalsColWaiting")}</th>
                  <th className="px-3 py-2">
                    <span className="sr-only">{t(locale, "colActions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((car) => (
                  <tr
                    key={car.id}
                    className="border-t border-outline align-middle"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(car.id)}
                        onChange={() => toggle(car.id)}
                        aria-label={carTitle(car)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <ListingThumb car={car} locale={locale} />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-left font-semibold capitalize hover:text-primary-strong"
                        onClick={() => setReview(car)}
                      >
                        {carTitle(car)}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {String(car.city || car.province || "—")}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {car.priceValue != null
                        ? formatMoney(car.priceValue, car.currencyKey)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">{sellerPrimary(car)}</td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {waitingAge(car, locale)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-[var(--radius-control)] bg-primary-fill px-2.5 py-1 text-[11px] font-semibold text-on-primary disabled:opacity-50"
                          onClick={() => requestStatus([car.id], "active")}
                        >
                          {t(locale, "approve")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-[var(--radius-control)] bg-input px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
                          onClick={() => requestStatus([car.id], "rejected")}
                        >
                          {t(locale, "reject")}
                        </button>
                        <button
                          type="button"
                          className="rounded-[var(--radius-control)] bg-input px-2.5 py-1 text-[11px] font-semibold"
                          onClick={() => setReview(car)}
                        >
                          {t(locale, "review")}
                        </button>
                        {rowMenu(car)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {nextCursor ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={loading}
            className="rounded-[var(--radius-control)] bg-input px-4 py-2 text-sm font-semibold disabled:opacity-50"
            onClick={() => void load({ append: true, cursor: nextCursor })}
          >
            {t(locale, "loadMore")}
          </button>
        </div>
      ) : null}

      {review ? (
        <AdReviewModal
          car={review}
          open
          busy={busy}
          onClose={() => setReview(null)}
          onApprove={() => requestStatus([review.id], "active")}
          onReject={() => requestStatus([review.id], "rejected")}
          onExpire={() => requestStatus([review.id], "expired")}
        />
      ) : null}

      <AdminConfirmDialog
        open={Boolean(pending)}
        title={confirmTitle}
        description={confirmDescription}
        danger={pending?.status === "rejected"}
        busy={busy}
        confirmDisabled={
          pending?.status === "rejected" && !rejectReason.trim()
        }
        onConfirm={() => void confirmPending()}
        onCancel={() => {
          if (!busy) setPending(null);
        }}
      >
        {pending?.status === "rejected" ? (
          <label className="mt-4 block text-xs font-semibold text-muted">
            {t(locale, "rejectionReasonLabel")}
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t(locale, "rejectionReasonPlaceholder")}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
        ) : null}
      </AdminConfirmDialog>

      <AdminToast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}

export default function AdminApprovalsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded bg-input" />
          <div className="h-4 w-72 animate-pulse rounded bg-input" />
          <div className="mt-6 h-40 animate-pulse rounded-[var(--radius-card)] bg-card ring-1 ring-outline" />
        </div>
      }
    >
      <AdminApprovalsInner />
    </Suspense>
  );
}
