"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MoreHorizontal } from "lucide-react";
import { api, type Car, type CarsListResponse } from "@/lib/api";
import {
  type AdminStats,
  type CarAdminStatus,
  LISTING_STATUSES,
  carImage,
  carTitle,
  formatAdminWhen,
  setCarStatuses,
  statusBadgeClass,
} from "@/lib/admin";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdReviewModal } from "@/components/admin-ad-review";
import { formatMoney } from "@/lib/car-pricing-trust";
import {
  IRAQ_CITIES,
  accountTypeLabel,
  listingStatusLabel,
  t,
  type DictKey,
  type Locale,
} from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const ALL_STATUSES = "pending,active,sold,expired,rejected";
const PAGE_SIZE = "40";
const SEARCH_DEBOUNCE_MS = 300;
const SUCCESS_CLEAR_MS = 4000;

type ListingSort = "newest" | "price_asc" | "price_desc";

const LISTING_SORTS: { value: ListingSort; labelKey: DictKey }[] = [
  { value: "newest", labelKey: "sortNewest" },
  { value: "price_asc", labelKey: "listingsSortPriceAsc" },
  { value: "price_desc", labelKey: "listingsSortPriceDesc" },
];

type PendingAction =
  | { type: "status"; ids: string[]; next: CarAdminStatus }
  | { type: "delete"; car: Car };

const MENU_ITEM =
  "flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-xs font-semibold data-focus:bg-input disabled:opacity-50";

function parseStatus(
  raw: string | null,
  hasSeller: boolean,
): CarAdminStatus | "all" {
  const fallback = hasSeller ? "all" : "active";
  const value = (raw || fallback) as CarAdminStatus | "all";
  return LISTING_STATUSES.some((s) => s.value === value) ? value : fallback;
}

function parseSort(raw: string | null): ListingSort {
  if (raw === "price_asc" || raw === "price_desc") return raw;
  return "newest";
}

function sellerAccountType(car: Car): string | undefined {
  const raw = car.sellerAccountType ?? car.accountType;
  return typeof raw === "string" && raw.trim() ? raw : undefined;
}

function sellerPrimary(car: Car): string {
  const name = String(car.sellerName ?? "").trim();
  if (name) return name;
  const showroom = String(car.sellerShowroom ?? "").trim();
  if (showroom) return showroom;
  if (car.sellerId) return car.sellerId.slice(0, 10);
  return "—";
}

function tabCount(
  value: CarAdminStatus | "all",
  stats: AdminStats | null,
): number | null {
  if (!stats) return null;
  const expired = stats.expiredCars ?? 0;
  const rejected = stats.rejectedCars ?? 0;
  switch (value) {
    case "pending":
      return stats.pendingCars;
    case "active":
      return stats.activeCars;
    case "sold":
      return stats.soldCars;
    case "expired":
      return expired;
    case "rejected":
      return rejected;
    case "all":
      return (
        stats.pendingCars +
        stats.activeCars +
        stats.soldCars +
        expired +
        rejected
      );
    default:
      return null;
  }
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

function ListingActionsMenu({
  car,
  busy,
  locale,
  onReview,
  onActivate,
  onSold,
  onExpire,
  onDelete,
}: {
  car: Car;
  busy: boolean;
  locale: Locale;
  onReview: () => void;
  onActivate: () => void;
  onSold: () => void;
  onExpire: () => void;
  onDelete: () => void;
}) {
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
        className="z-30 w-44 origin-top-end rounded-[var(--radius-card)] bg-card p-1 shadow-lg ring-1 ring-outline [--anchor-gap:4px]"
      >
        <MenuItem>
          <button type="button" className={MENU_ITEM} onClick={onReview}>
            {t(locale, "review")}
          </button>
        </MenuItem>
        {car.status !== "active" ? (
          <MenuItem>
            <button
              type="button"
              disabled={busy}
              className={MENU_ITEM}
              onClick={onActivate}
            >
              {t(locale, "activate")}
            </button>
          </MenuItem>
        ) : null}
        {car.status === "active" ? (
          <MenuItem>
            <button
              type="button"
              disabled={busy}
              className={MENU_ITEM}
              onClick={onSold}
            >
              {t(locale, "dashMarkSold")}
            </button>
          </MenuItem>
        ) : null}
        {car.status !== "expired" ? (
          <MenuItem>
            <button
              type="button"
              disabled={busy}
              className={MENU_ITEM}
              onClick={onExpire}
            >
              {t(locale, "expire")}
            </button>
          </MenuItem>
        ) : null}
        <MenuItem>
          <button
            type="button"
            disabled={busy}
            className={`${MENU_ITEM} text-red-600`}
            onClick={onDelete}
          >
            {t(locale, "dashDelete")}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-t border-outline">
          <td className="px-3 py-2" colSpan={9}>
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

function AdminListingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useAppSelector((s) => s.preferences.locale);
  const sellerId = searchParams.get("sellerId") || "";
  const status = parseStatus(searchParams.get("status"), Boolean(sellerId));
  const q = searchParams.get("q") || "";
  const city = searchParams.get("city") || "";
  const sort = parseSort(searchParams.get("sort"));

  const [qDraft, setQDraft] = useState(q);
  const [items, setItems] = useState<Car[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [cities, setCities] = useState<string[]>([...IRAQ_CITIES]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [review, setReview] = useState<Car | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const writeFilters = useCallback(
    (next: {
      status?: CarAdminStatus | "all";
      sellerId?: string | null;
      q?: string | null;
      city?: string | null;
      sort?: ListingSort | null;
    }) => {
      const params = new URLSearchParams();
      const s = next.status ?? status;
      const seller =
        next.sellerId !== undefined ? next.sellerId || "" : sellerId;
      const nextQ = next.q !== undefined ? next.q || "" : q;
      const nextCity = next.city !== undefined ? next.city || "" : city;
      const nextSort = next.sort !== undefined ? next.sort || "newest" : sort;
      if (s) params.set("status", s);
      if (seller) params.set("sellerId", seller);
      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (nextCity.trim()) params.set("city", nextCity.trim());
      if (nextSort && nextSort !== "newest") params.set("sort", nextSort);
      const qs = params.toString();
      router.replace(qs ? `/admin/listings?${qs}` : "/admin/listings", {
        scroll: false,
      });
    },
    [status, sellerId, q, city, sort, router],
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

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), SUCCESS_CLEAR_MS);
    return () => window.clearTimeout(id);
  }, [success]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await api.get<AdminStats>("/admin/stats"));
    } catch {
      // Tab counts stay at last known values.
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
          status: status === "all" ? ALL_STATUSES : status,
          limit: PAGE_SIZE,
          sort,
        };
        if (q.trim()) query.q = q.trim();
        if (city.trim()) query.city = city.trim();
        if (sellerId.trim()) query.sellerId = sellerId.trim();
        if (opts?.cursor) query.cursor = opts.cursor;
        const d = await api.get<CarsListResponse>("/cars", query);
        const list = d.items ?? d.data ?? [];
        setItems((prev) => (opts?.append ? [...prev, ...list] : list));
        setNextCursor(d.nextCursor ?? null);
        if (d.pagination?.totalItems != null) {
          setTotalItems(d.pagination.totalItems);
        } else if (!opts?.append) {
          setTotalItems(list.length);
        }
        if (!opts?.append) setSelected(new Set());
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : t(locale, "failedToLoad"));
      } finally {
        setLoading(false);
      }
    },
    [status, sellerId, q, city, sort, locale],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadStats();
    void api
      .get<{ config: { activeCities?: string[] } | null }>("/catalog/config")
      .then((d) => {
        const fromConfig = (d.config?.activeCities ?? [])
          .map((c) => String(c).trim())
          .filter(Boolean);
        if (fromConfig.length) setCities(fromConfig);
      })
      .catch(() => {
        // IRAQ_CITIES fallback already set.
      });
  }, [loadStats]);

  async function applyStatus(
    ids: string[],
    next: CarAdminStatus,
    reason?: string,
  ) {
    if (!ids.length) return false;
    setBusy(true);
    setSuccess(null);
    try {
      const res = await setCarStatuses(ids, next, reason);
      const done = new Set(res.updated);
      if (res.failed?.length) {
        setError(t(locale, "failedForListings", { count: res.failed.length }));
      } else {
        setError(null);
      }
      if (done.size) {
        setSuccess(
          t(locale, "listingsStatusUpdated", {
            count: done.size,
            status: listingStatusLabel(locale, next),
          }),
        );
      }
      setItems((list) =>
        list
          .map((c) => (done.has(c.id) ? { ...c, status: next } : c))
          .filter((c) => status === "all" || c.status === status),
      );
      if (status !== "all") {
        setTotalItems((n) => Math.max(0, n - done.size));
      }
      setSelected((prev) => {
        const n = new Set(prev);
        done.forEach((id) => n.delete(id));
        return n;
      });
      if (review && done.has(review.id)) {
        setReview((r) => (r ? { ...r, status: next } : r));
      }
      void loadStats();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "updateFailed"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function requestStatus(ids: string[], next: CarAdminStatus) {
    if (!ids.length) return;
    if (next === "rejected" || next === "expired") {
      setRejectReason("");
      setPending({ type: "status", ids, next });
      return;
    }
    void applyStatus(ids, next);
  }

  async function applyDelete(car: Car) {
    setBusy(true);
    try {
      await api.delete(`/cars/${car.id}`);
      setItems((list) => list.filter((c) => c.id !== car.id));
      setTotalItems((n) => Math.max(0, n - 1));
      setSelected((prev) => {
        if (!prev.has(car.id)) return prev;
        const n = new Set(prev);
        n.delete(car.id);
        return n;
      });
      if (review?.id === car.id) setReview(null);
      setSuccess(t(locale, "listingDeleted"));
      setError(null);
      void loadStats();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "deleteFailed"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function requestDelete(car: Car) {
    setPending({ type: "delete", car });
  }

  async function confirmPending() {
    if (!pending) return;
    if (
      pending.type === "status" &&
      pending.next === "rejected" &&
      !rejectReason.trim()
    ) {
      return;
    }
    const ok =
      pending.type === "delete"
        ? await applyDelete(pending.car)
        : await applyStatus(
            pending.ids,
            pending.next,
            pending.next === "rejected" ? rejectReason.trim() : undefined,
          );
    if (ok) setPending(null);
  }

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

  const confirmTitle = pending
    ? pending.type === "delete"
      ? t(locale, "listingsConfirmDeleteTitle")
      : pending.next === "expired"
        ? t(locale, "listingsConfirmExpireTitle")
        : t(locale, "listingsConfirmRejectTitle")
    : "";
  const confirmDescription = pending
    ? pending.type === "delete"
      ? t(locale, "confirmDeleteListing", { title: carTitle(pending.car) })
      : t(locale, "confirmSetStatus", {
          count: pending.ids.length,
          status: listingStatusLabel(locale, pending.next),
        })
    : "";

  const kpi: {
    key: DictKey;
    value: number | undefined;
    href?: string;
    status?: CarAdminStatus;
  }[] = [
    {
      key: "statusPending",
      value: stats?.pendingCars,
      status: "pending",
    },
    {
      key: "statusActive",
      value: stats?.activeCars,
      status: "active",
    },
    { key: "sold", value: stats?.soldCars, status: "sold" },
    {
      key: "statOpenFlags",
      value: stats?.openFlags,
      href: "/admin/flagged",
    },
  ];

  function rowMenu(car: Car) {
    return (
      <ListingActionsMenu
        car={car}
        busy={busy}
        locale={locale}
        onReview={() => setReview(car)}
        onActivate={() => requestStatus([car.id], "active")}
        onSold={() => requestStatus([car.id], "sold")}
        onExpire={() => requestStatus([car.id], "expired")}
        onDelete={() => requestDelete(car)}
      />
    );
  }

  const empty = !loading && items.length === 0;
  const showSkeleton = loading && items.length === 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "adminListingsTitle")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminListingsSubtitle")}
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

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {kpi.map((card) => {
          const className =
            "rounded-[var(--radius-card)] bg-card px-3 py-2 text-left ring-1 ring-outline transition hover:ring-primary";
          const body = (
            <>
              <p className="text-[11px] uppercase tracking-wide text-muted">
                {t(locale, card.key)}
              </p>
              <p className="mt-1 text-lg font-bold">
                {card.value == null ? "—" : card.value}
              </p>
            </>
          );
          if (card.href) {
            return (
              <Link key={card.key} href={card.href} className={className}>
                {body}
              </Link>
            );
          }
          return (
            <button
              key={card.key}
              type="button"
              className={className}
              onClick={() =>
                card.status ? writeFilters({ status: card.status }) : undefined
              }
            >
              {body}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {LISTING_STATUSES.map((s) => {
          const count = tabCount(s.value, stats);
          return (
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
              {t(locale, s.labelKey)}
              {count != null ? ` ${count}` : ""}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder={t(locale, "listingsFilterPlaceholder")}
          className="w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
        />
        {cities.length > 0 ? (
          <select
            value={city}
            onChange={(e) => writeFilters({ city: e.target.value || null })}
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
            aria-label={t(locale, "listingsCityPlaceholder")}
          >
            <option value="">{t(locale, "filterAllCities")}</option>
            {(city && !cities.includes(city) ? [city, ...cities] : cities).map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ),
            )}
          </select>
        ) : (
          <input
            value={city}
            onChange={(e) => writeFilters({ city: e.target.value || null })}
            placeholder={t(locale, "listingsCityPlaceholder")}
            className="w-40 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
          />
        )}
        <select
          value={sort}
          onChange={(e) =>
            writeFilters({ sort: parseSort(e.target.value) })
          }
          className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
          aria-label={t(locale, "sort")}
        >
          {LISTING_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {t(locale, s.labelKey)}
            </option>
          ))}
        </select>
        {sellerId ? (
          <button
            type="button"
            onClick={() => writeFilters({ sellerId: null })}
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            {t(locale, "sellerFilterChip", { id: sellerId.slice(0, 10) })}
          </button>
        ) : null}
        <p className="ms-auto text-xs text-muted">
          {t(locale, "listingsShowingOf", {
            loaded: items.length,
            total: totalItems,
          })}
        </p>
      </div>

      {selectedVisible.length > 0 ? (
        <div className="sticky top-24 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline">
          <span className="text-xs font-semibold">
            {t(locale, "selectedCount", { count: selectedVisible.length })}
          </span>
          {(
            [
              ["active", "activate"],
              ["pending", "statusPending"],
              ["sold", "sold"],
              ["expired", "expire"],
              ["rejected", "reject"],
            ] as const
          ).map(([value, labelKey]) => (
            <button
              key={value}
              type="button"
              disabled={busy}
              className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              onClick={() => void requestStatus(selectedVisible, value)}
            >
              {t(locale, labelKey)}
            </button>
          ))}
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

      {showSkeleton ? <div className="mt-4"><SkeletonCards /></div> : null}

      {empty ? (
        <div className="mt-6 rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
          <p className="font-semibold">{t(locale, "listingsEmptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "listingsEmptyHint")}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-2 md:hidden">
            {items.map((car) => {
              const account = sellerAccountType(car);
              return (
                <div
                  key={car.id}
                  className="flex items-start gap-3 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(car.id)}
                    onChange={() => toggle(car.id)}
                    aria-label={carTitle(car)}
                  />
                  <ListingThumb car={car} locale={locale} />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-left text-sm font-semibold capitalize hover:text-primary"
                      onClick={() => setReview(car)}
                    >
                      {carTitle(car)}
                    </button>
                    <p className="text-[11px] text-muted">
                      {[car.year, car.id.slice(0, 8)].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {[car.city, car.province].filter(Boolean).join(", ") || "—"}
                      {car.priceValue != null
                        ? ` · ${formatMoney(car.priceValue, car.currencyKey)}`
                        : ""}
                    </p>
                    {car.sellerId ? (
                      <button
                        type="button"
                        className="mt-0.5 text-left text-xs text-primary hover:underline"
                        onClick={() => writeFilters({ sellerId: car.sellerId })}
                      >
                        {sellerPrimary(car)}
                        {account
                          ? ` · ${accountTypeLabel(locale, account)}`
                          : ""}
                      </button>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted">
                        {sellerPrimary(car)}
                      </p>
                    )}
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(car.status)}`}
                    >
                      {listingStatusLabel(locale, car.status)}
                    </span>
                  </div>
                  {rowMenu(car)}
                </div>
              );
            })}
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
                      aria-label={t(locale, "listingsSelectAll")}
                    />
                  </th>
                  <th className="w-20 px-2 py-2">{t(locale, "colThumbnail")}</th>
                  <th className="px-3 py-2">{t(locale, "colTitle")}</th>
                  <th className="px-3 py-2">{t(locale, "listingsColSeller")}</th>
                  <th className="px-3 py-2">{t(locale, "colCity")}</th>
                  <th className="px-3 py-2 text-right">
                    {t(locale, "listingsColPrice")}
                  </th>
                  <th className="px-3 py-2">{t(locale, "listingsColPosted")}</th>
                  <th className="px-3 py-2">{t(locale, "colStatus")}</th>
                  <th className="w-12 px-2 py-2">
                    <span className="sr-only">{t(locale, "colActions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {showSkeleton ? (
                  <SkeletonRows />
                ) : (
                  items.map((car) => {
                    const account = sellerAccountType(car);
                    return (
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
                            className="text-left font-semibold capitalize hover:text-primary"
                            onClick={() => setReview(car)}
                          >
                            {carTitle(car)}
                          </button>
                          <p className="text-[11px] text-muted">
                            {[car.year, car.id].filter(Boolean).join(" · ")}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          {car.sellerId ? (
                            <button
                              type="button"
                              className="text-left hover:text-primary"
                              onClick={() =>
                                writeFilters({ sellerId: car.sellerId })
                              }
                            >
                              <p className="font-medium">{sellerPrimary(car)}</p>
                              <p className="text-[11px] text-muted">
                                {account
                                  ? accountTypeLabel(locale, account)
                                  : car.sellerId.slice(0, 10)}
                              </p>
                            </button>
                          ) : (
                            <p className="text-muted">—</p>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {car.city || car.province || "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatMoney(car.priceValue, car.currencyKey)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                          {formatAdminWhen(
                            car.createdAt as Parameters<
                              typeof formatAdminWhen
                            >[0],
                          ) || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(car.status)}`}
                          >
                            {listingStatusLabel(locale, car.status)}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">{rowMenu(car)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

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
          onSold={() => requestStatus([review.id], "sold")}
          onDelete={() => requestDelete(review)}
          onUpdated={(next) => {
            setReview(next);
            setItems((list) =>
              list.map((c) => (c.id === next.id ? { ...c, ...next } : c)),
            );
          }}
        />
      ) : null}

      <AdminConfirmDialog
        open={Boolean(pending)}
        title={confirmTitle}
        description={confirmDescription}
        danger={
          pending?.type === "delete" ||
          (pending?.type === "status" && pending.next === "rejected")
        }
        busy={busy}
        confirmDisabled={
          pending?.type === "status" &&
          pending.next === "rejected" &&
          !rejectReason.trim()
        }
        onConfirm={() => void confirmPending()}
        onCancel={() => {
          if (!busy) setPending(null);
        }}
      >
        {pending?.type === "status" && pending.next === "rejected" ? (
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
    </div>
  );
}

export default function AdminListingsPage() {
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
      <AdminListingsInner />
    </Suspense>
  );
}
