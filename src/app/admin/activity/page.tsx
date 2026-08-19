"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { api } from "@/lib/api";
import {
  ACTIVITY_FILTERS,
  activityDayLabel,
  activityTypeBadgeClass,
  activityTypeLabel,
  formatActivity,
  formatAdminWhen,
  shortenActivityIds,
  type ActivityFilter,
  type ActivityListResponse,
  type ActivityLog,
} from "@/lib/admin";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const PAGE_SIZE = "50";
const SEARCH_DEBOUNCE_MS = 300;

function parseType(raw: string | null): ActivityFilter {
  const value = (raw || "all") as ActivityFilter;
  return ACTIVITY_FILTERS.some((f) => f.value === value) ? value : "all";
}

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-20 animate-pulse rounded-full bg-input" />
              <div className="h-4 w-48 max-w-full animate-pulse rounded bg-input" />
              <div className="h-3 w-72 max-w-[80%] animate-pulse rounded bg-input" />
            </div>
            <div className="h-3 w-24 shrink-0 animate-pulse rounded bg-input" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminActivityInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useAppSelector((s) => s.preferences.locale);
  const type = parseType(searchParams.get("type"));

  const [qDraft, setQDraft] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setQ(qDraft.trim());
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
        const query: Record<string, string> = { limit: PAGE_SIZE };
        if (type !== "all") query.type = type;
        if (q) query.q = q;
        if (opts?.cursor) query.cursor = opts.cursor;
        const d = await api.get<ActivityListResponse>("/admin/activity", query);
        const list = d.items ?? [];
        setItems((prev) => (opts?.append ? [...prev, ...list] : list));
        setNextCursor(d.nextCursor ?? null);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : t(locale, "failedToLoad"));
      } finally {
        setLoading(false);
      }
    },
    [type, q, locale],
  );

  useEffect(() => {
    void load();
  }, [load]);

  function writeType(next: ActivityFilter) {
    const params = new URLSearchParams();
    if (next !== "all") params.set("type", next);
    const qs = params.toString();
    router.replace(qs ? `/admin/activity?${qs}` : "/admin/activity", {
      scroll: false,
    });
  }

  const groups = useMemo(() => {
    const out: { label: string; items: ActivityLog[] }[] = [];
    for (const log of items) {
      const label =
        activityDayLabel(log.createdAt || log.timestamp, locale) ||
        t(locale, "activityFallback");
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(log);
      else out.push({ label, items: [log] });
    }
    return out;
  }, [items, locale]);

  const showSkeleton = loading && items.length === 0;
  const empty = !loading && items.length === 0 && !error;

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

      <div className="mt-4 flex flex-wrap gap-2">
        {ACTIVITY_FILTERS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => writeType(tab.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              type === tab.value
                ? "bg-primary text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {t(locale, tab.labelKey)}
          </button>
        ))}
      </div>

      <input
        value={qDraft}
        onChange={(e) => setQDraft(e.target.value)}
        placeholder={t(locale, "activitySearchPlaceholder")}
        className="mt-4 w-full max-w-md rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
      />

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6">
        {showSkeleton ? (
          <SkeletonRows />
        ) : empty ? (
          <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
            <ClipboardList className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 font-semibold">
              {q
                ? t(locale, "noMatches")
                : t(locale, "activityEmptyTitle")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {q
                ? t(locale, "tryDifferentSearch")
                : t(locale, "activityEmptyHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.items.map((log) => {
                    const { title, detail } = formatActivity(log, locale);
                    return (
                      <div
                        key={log.id}
                        className="rounded-[var(--radius-card)] bg-card p-4 text-sm ring-1 ring-outline"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${activityTypeBadgeClass(log.type)}`}
                            >
                              {activityTypeLabel(locale, log.type)}
                            </span>
                            <p className="mt-1.5 font-semibold">{title}</p>
                          </div>
                          <p className="shrink-0 text-xs text-muted">
                            {formatAdminWhen(
                              log.createdAt || log.timestamp,
                              locale,
                            )}
                          </p>
                        </div>
                        {detail ? (
                          <p className="mt-1 text-muted">{detail}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          <span>
                            {log.adminDisplayName ||
                              log.adminId ||
                              t(locale, "activitySystem")}
                          </span>
                          {log.carId ? (
                            <Link
                              href={`/cars/${log.carId}`}
                              className="font-semibold text-primary"
                            >
                              {t(locale, "activityViewListing")}
                              {" · "}
                              {t(locale, "activityCarLink", {
                                id: shortId(log.carId),
                              })}
                            </Link>
                          ) : null}
                          {log.userId ? (
                            <Link
                              href={`/admin/listings?sellerId=${encodeURIComponent(log.userId)}`}
                              className="font-semibold text-primary"
                            >
                              {t(locale, "activityViewSeller")}
                            </Link>
                          ) : null}
                          {log.ticketId ? (
                            <Link
                              href={`/admin/messages?id=${encodeURIComponent(log.ticketId)}`}
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
                          {log.adId ? (
                            <Link
                              href="/admin/ads"
                              className="font-semibold text-primary"
                            >
                              {t(locale, "activityViewAd")}
                              {" · "}
                              {shortenActivityIds(log.adId)}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
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
            {t(locale, "loadMore")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminActivityPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded bg-input" />
          <div className="h-4 w-72 animate-pulse rounded bg-input" />
          <div className="mt-6 space-y-2">
            <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-card ring-1 ring-outline" />
            <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-card ring-1 ring-outline" />
          </div>
        </div>
      }
    >
      <AdminActivityInner />
    </Suspense>
  );
}
