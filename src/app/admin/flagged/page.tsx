"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MoreHorizontal } from "lucide-react";
import { api, type Car } from "@/lib/api";
import {
  type FlaggedAd,
  type FlaggedListResponse,
  carImage,
  carTitle,
  formatAdminWhen,
  setCarStatuses,
  statusBadgeClass,
} from "@/lib/admin";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdminToast } from "@/components/admin-toast";
import { AdReviewModal } from "@/components/admin-ad-review";
import {
  listingStatusLabel,
  t,
  type DictKey,
  type Locale,
} from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const PAGE_SIZE = "50";
const SEARCH_DEBOUNCE_MS = 300;
const MENU_ITEM =
  "flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-xs font-semibold data-focus:bg-input disabled:opacity-50";

type FlagFilter = "open" | "resolved" | "dismissed" | "all";
type ListingAction = "reject" | "expire" | "delete";
type PendingAction =
  | { type: "flag"; item: FlaggedAd; status: "resolved" | "dismissed" }
  | { type: "listing"; item: FlaggedAd; listingAction: ListingAction };

const TABS: { value: FlagFilter; labelKey: DictKey }[] = [
  { value: "open", labelKey: "flagStatusOpen" },
  { value: "resolved", labelKey: "flagStatusResolved" },
  { value: "dismissed", labelKey: "flagStatusDismissed" },
  { value: "all", labelKey: "all" },
];

const REASON_KEYS: Record<string, DictKey> = {
  sold_already: "flagReasonSoldAlready",
  wrong_price: "flagReasonWrongPrice",
  misleading: "flagReasonMisleading",
  spam: "flagReasonSpam",
  other: "flagReasonOther",
};

function parseStatus(raw: string | null): FlagFilter {
  const value = (raw || "open").toLowerCase();
  if (value === "pending") return "open";
  if (value === "resolved" || value === "dismissed" || value === "all") {
    return value;
  }
  return "open";
}

function flagStatus(item: FlaggedAd): FlagFilter {
  const raw = (item.status || "open").toLowerCase();
  if (raw === "pending") return "open";
  if (raw === "resolved" || raw === "dismissed") return raw;
  return "open";
}

function flagToCar(item: FlaggedAd): Car | null {
  if (item.adData && typeof item.adData === "object") {
    return {
      ...item.adData,
      id: String(item.adId || item.adData.id || ""),
    } as Car;
  }
  return null;
}

function reporterId(item: FlaggedAd): string {
  const id = String(item.reporterId || item.reportedBy || "").trim();
  return id;
}

function shortId(value: string): string {
  if (!value) return "—";
  return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

function reasonLabel(locale: Locale, reason?: string): string {
  if (!reason) return t(locale, "flagReportFallback");
  const key = REASON_KEYS[reason.trim().toLowerCase().replace(/\s+/g, "_")];
  return key ? t(locale, key) : reason;
}

function flagBadgeClass(status: FlagFilter): string {
  if (status === "resolved") return "bg-emerald-500/15 text-emerald-700";
  if (status === "dismissed") return "bg-slate-500/15 text-slate-600";
  return "bg-amber-500/15 text-amber-700";
}

function FlagThumb({ car, locale }: { car: Car | null; locale: Locale }) {
  const img = car ? carImage(car) : null;
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

function AdminFlaggedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useAppSelector((s) => s.preferences.locale);
  const status = parseStatus(searchParams.get("status"));

  const [qDraft, setQDraft] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FlaggedAd[]>([]);
  const [counts, setCounts] = useState({
    open: 0,
    resolved: 0,
    dismissed: 0,
  });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [review, setReview] = useState<Car | null>(null);
  const [reviewFlag, setReviewFlag] = useState<FlaggedAd | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const writeStatus = useCallback(
    (next: FlagFilter) => {
      const params = new URLSearchParams();
      params.set("status", next);
      router.replace(`/admin/flagged?${params.toString()}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    if (searchParams.get("status")) return;
    writeStatus("open");
  }, [searchParams, writeStatus]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setQuery(qDraft.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [qDraft]);

  const load = useCallback(
    async (opts?: { append?: boolean; cursor?: string | null }) => {
      setLoading(true);
      if (!opts?.append) {
        setItems([]);
        setNextCursor(null);
      }
      try {
        const d = await api.get<FlaggedListResponse>("/admin/flagged", {
          status,
          limit: PAGE_SIZE,
          ...(opts?.cursor ? { cursor: opts.cursor } : {}),
        });
        const list = d.items ?? [];
        setItems((prev) => (opts?.append ? [...prev, ...list] : list));
        setCounts(d.counts ?? { open: 0, resolved: 0, dismissed: 0 });
        setNextCursor(d.nextCursor ?? null);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : t(locale, "failedGeneric"));
      } finally {
        setLoading(false);
      }
    },
    [status, locale],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const tabCount = useCallback(
    (value: FlagFilter) => {
      if (value === "all") {
        return counts.open + counts.resolved + counts.dismissed;
      }
      return counts[value];
    },
    [counts],
  );

  const reportsByAd = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (!item.adId) continue;
      map.set(item.adId, (map.get(item.adId) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const visible = useMemo(() => {
    if (!query) return items;
    return items.filter((item) => {
      const preview = flagToCar(item);
      return [
        item.reason,
        reasonLabel(locale, item.reason),
        item.details,
        item.adId,
        item.resolution,
        reporterId(item),
        preview ? carTitle(preview) : "",
        preview?.brandId,
        preview?.modelKey,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [items, query, locale]);

  function closeReviewIf(flagId: string) {
    if (reviewFlag?.id === flagId) {
      setReview(null);
      setReviewFlag(null);
    }
  }

  async function patchFlag(
    item: FlaggedAd,
    body: {
      status?: "open" | "resolved" | "dismissed";
      resolution?: string;
      listingAction?: ListingAction;
    },
  ) {
    setBusy(true);
    try {
      await api.patch(`/admin/flagged/${item.id}`, body);
      setToast(
        body.listingAction === "delete"
          ? t(locale, "listingDeletedByAdmin")
          : body.status === "dismissed"
            ? t(locale, "flagDismissedByAdmin")
            : t(locale, "flagResolvedByAdmin"),
      );
      setError(null);
      closeReviewIf(item.id);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "updateFailed"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function confirmPending() {
    if (!pending) return;
    const ok =
      pending.type === "listing"
        ? await patchFlag(pending.item, {
            listingAction: pending.listingAction,
          })
        : await patchFlag(pending.item, {
            status: pending.status,
            resolution:
              pending.status === "dismissed"
                ? t(locale, "flagDismissedByAdmin")
                : t(locale, "flagResolvedByAdmin"),
          });
    if (ok) setPending(null);
  }

  async function openReview(item: FlaggedAd) {
    setReviewFlag(item);
    const embedded = flagToCar(item);
    if (embedded?.id) {
      setReview(embedded);
      return;
    }
    if (!item.adId) return;
    try {
      const car = await api.get<Car>(`/cars/${item.adId}`);
      setReview(car);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t(locale, "couldNotLoadListing"),
      );
      setReviewFlag(null);
    }
  }

  async function approveAfterReview() {
    if (!review || !reviewFlag) return;
    setBusy(true);
    try {
      await api.patch(`/admin/cars/${review.id}/status`, { status: "active" });
      await api.patch(`/admin/flagged/${reviewFlag.id}`, {
        status: "resolved",
        resolution: t(locale, "flagApprovedAfterReview"),
      });
      setToast(t(locale, "flagApprovedAfterReview"));
      setError(null);
      setReview(null);
      setReviewFlag(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "updateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function soldAfterReview() {
    if (!review || !reviewFlag) return;
    setBusy(true);
    try {
      const res = await setCarStatuses([review.id], "sold");
      if (res.failed?.length) {
        setError(t(locale, "updateFailed"));
        return;
      }
      await api.patch(`/admin/flagged/${reviewFlag.id}`, {
        status: "resolved",
        resolution: t(locale, "flagResolvedByAdmin"),
      });
      setToast(t(locale, "flagResolvedByAdmin"));
      setError(null);
      setReview(null);
      setReviewFlag(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "updateFailed"));
    } finally {
      setBusy(false);
    }
  }

  const confirmTitle = pending
    ? pending.type === "listing"
      ? pending.listingAction === "delete"
        ? t(locale, "flaggedConfirmDeleteTitle")
        : pending.listingAction === "expire"
          ? t(locale, "flaggedConfirmExpireTitle")
          : t(locale, "flaggedConfirmRejectTitle")
      : pending.status === "dismissed"
        ? t(locale, "flaggedConfirmDismissTitle")
        : t(locale, "flaggedConfirmResolveTitle")
    : "";

  const confirmDescription = pending
    ? pending.type === "listing" && pending.listingAction === "delete"
      ? t(locale, "confirmDeleteFlagged")
      : pending.type === "listing"
        ? t(locale, "confirmSetStatus", {
            count: 1,
            status: listingStatusLabel(
              locale,
              pending.listingAction === "expire" ? "expired" : "rejected",
            ),
          })
        : pending.status === "dismissed"
          ? t(locale, "flagDismissedByAdmin")
          : t(locale, "flagResolvedByAdmin")
    : "";

  function rowMenu(item: FlaggedAd) {
    const st = flagStatus(item);
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
            <button
              type="button"
              className={MENU_ITEM}
              onClick={() => void openReview(item)}
            >
              {t(locale, "review")}
            </button>
          </MenuItem>
          {st !== "resolved" ? (
            <MenuItem>
              <button
                type="button"
                disabled={busy}
                className={MENU_ITEM}
                onClick={() =>
                  setPending({ type: "flag", item, status: "resolved" })
                }
              >
                {t(locale, "resolve")}
              </button>
            </MenuItem>
          ) : null}
          {st !== "dismissed" ? (
            <MenuItem>
              <button
                type="button"
                disabled={busy}
                className={MENU_ITEM}
                onClick={() =>
                  setPending({ type: "flag", item, status: "dismissed" })
                }
              >
                {t(locale, "dismiss")}
              </button>
            </MenuItem>
          ) : null}
          {item.adId ? (
            <MenuItem>
              <button
                type="button"
                disabled={busy}
                className={`${MENU_ITEM} text-red-600`}
                onClick={() =>
                  setPending({
                    type: "listing",
                    item,
                    listingAction: "delete",
                  })
                }
              >
                {t(locale, "deleteAd")}
              </button>
            </MenuItem>
          ) : null}
        </MenuItems>
      </Menu>
    );
  }

  function reportHint(item: FlaggedAd) {
    if (!item.adId) return null;
    const n = reportsByAd.get(item.adId) ?? 0;
    if (n < 2) return null;
    return (
      <p className="text-[11px] font-semibold text-amber-700">
        {t(locale, "flaggedReportsCount", { count: n })}
      </p>
    );
  }

  const showSkeleton = loading && items.length === 0;
  const empty = !loading && visible.length === 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {t(locale, "adminFlaggedTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminFlaggedSubtitle")}
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

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => writeStatus(tab.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === tab.value
                ? "bg-primary-fill text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {t(locale, tab.labelKey)}
            <span className="ms-1 tabular-nums opacity-80">
              {tabCount(tab.value)}
            </span>
          </button>
        ))}
      </div>

      <input
        value={qDraft}
        onChange={(e) => setQDraft(e.target.value)}
        placeholder={t(locale, "flaggedSearchPlaceholder")}
        className="mt-4 w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
      />

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {empty ? (
        <div className="mt-6 rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
          <p className="font-semibold">
            {status === "open"
              ? t(locale, "flaggedEmptyOpenTitle")
              : t(locale, "flaggedEmptyTitle")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {status === "open"
              ? t(locale, "flaggedEmptyOpenHint")
              : t(locale, "flaggedEmptyHint")}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-2 md:hidden">
            {showSkeleton ? (
              <SkeletonCards />
            ) : (
              visible.map((item) => {
                const preview = flagToCar(item);
                const st = flagStatus(item);
                const listing = preview?.status;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-[var(--radius-card)] bg-card p-3 ring-1 ring-outline"
                  >
                    <FlagThumb car={preview} locale={locale} />
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="text-left font-semibold capitalize hover:text-primary-strong"
                        onClick={() => void openReview(item)}
                      >
                        {preview
                          ? carTitle(preview)
                          : t(locale, "flagReportFallback")}
                      </button>
                      <p className="text-xs text-muted">
                        {reasonLabel(locale, item.reason)}
                        {item.adId ? (
                          <>
                            {" · "}
                            <Link
                              href={`/cars/${item.adId}`}
                              className="hover:text-primary-strong"
                            >
                              {shortId(item.adId)}
                            </Link>
                          </>
                        ) : null}
                      </p>
                      {item.details ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted">
                          {item.details}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-muted">
                        {shortId(reporterId(item))}
                        {" · "}
                        {formatAdminWhen(item.createdAt || item.timestamp) ||
                          "—"}
                      </p>
                      {reportHint(item)}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {listing ? (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(listing)}`}
                          >
                            {listingStatusLabel(locale, listing)}
                          </span>
                        ) : null}
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${flagBadgeClass(st)}`}
                        >
                          {t(
                            locale,
                            st === "resolved"
                              ? "flagStatusResolved"
                              : st === "dismissed"
                                ? "flagStatusDismissed"
                                : "flagStatusOpen",
                          )}
                        </span>
                      </div>
                    </div>
                    {rowMenu(item)}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 hidden overflow-x-auto rounded-[var(--radius-card)] ring-1 ring-outline md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-input text-xs uppercase text-muted">
                <tr>
                  <th className="w-20 px-2 py-2">{t(locale, "colThumbnail")}</th>
                  <th className="px-3 py-2">{t(locale, "colTitle")}</th>
                  <th className="px-3 py-2">{t(locale, "flagReportFallback")}</th>
                  <th className="px-3 py-2">{t(locale, "flaggedColReporter")}</th>
                  <th className="px-3 py-2">{t(locale, "flaggedColWhen")}</th>
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
                  visible.map((item) => {
                    const preview = flagToCar(item);
                    const st = flagStatus(item);
                    const listing = preview?.status;
                    return (
                      <tr
                        key={item.id}
                        className="border-t border-outline align-middle"
                      >
                        <td className="px-2 py-2">
                          <FlagThumb car={preview} locale={locale} />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-left font-semibold capitalize hover:text-primary-strong"
                            onClick={() => void openReview(item)}
                          >
                            {preview
                              ? carTitle(preview)
                              : t(locale, "flagReportFallback")}
                          </button>
                          {item.adId ? (
                            <p className="text-[11px] text-muted">
                              <Link
                                href={`/cars/${item.adId}`}
                                className="hover:text-primary-strong"
                              >
                                {item.adId}
                              </Link>
                            </p>
                          ) : null}
                          {reportHint(item)}
                        </td>
                        <td className="px-3 py-2">
                          <p>{reasonLabel(locale, item.reason)}</p>
                          {item.details ? (
                            <p className="line-clamp-2 text-[11px] text-muted">
                              {item.details}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-muted">
                          {shortId(reporterId(item))}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                          {formatAdminWhen(item.createdAt || item.timestamp) ||
                            "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col items-start gap-1">
                            {listing ? (
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeClass(listing)}`}
                              >
                                {listingStatusLabel(locale, listing)}
                              </span>
                            ) : null}
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${flagBadgeClass(st)}`}
                            >
                              {t(
                                locale,
                                st === "resolved"
                                  ? "flagStatusResolved"
                                  : st === "dismissed"
                                    ? "flagStatusDismissed"
                                    : "flagStatusOpen",
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right">
                          {rowMenu(item)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {nextCursor && !query ? (
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
          onClose={() => {
            setReview(null);
            setReviewFlag(null);
          }}
          onApprove={() => void approveAfterReview()}
          onReject={() => {
            if (!reviewFlag) return;
            setPending({
              type: "listing",
              item: reviewFlag,
              listingAction: "reject",
            });
          }}
          onExpire={() => {
            if (!reviewFlag) return;
            setPending({
              type: "listing",
              item: reviewFlag,
              listingAction: "expire",
            });
          }}
          onSold={() => void soldAfterReview()}
          onDelete={() => {
            if (!reviewFlag) return;
            setPending({
              type: "listing",
              item: reviewFlag,
              listingAction: "delete",
            });
          }}
        />
      ) : null}

      <AdminConfirmDialog
        open={Boolean(pending)}
        title={confirmTitle}
        description={confirmDescription}
        danger={
          pending?.type === "listing" && pending.listingAction === "delete"
        }
        busy={busy}
        onConfirm={() => void confirmPending()}
        onCancel={() => {
          if (!busy) setPending(null);
        }}
      />

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default function AdminFlaggedPage() {
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
      <AdminFlaggedInner />
    </Suspense>
  );
}
