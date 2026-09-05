"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { api } from "@/lib/api";
import { statusBadgeClass } from "@/lib/admin";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdminToast } from "@/components/admin-toast";
import {
  SERVICE_STATUSES,
  serviceCategoryTitle,
  serviceCityLabel,
  serviceStatusLabel,
  type ServiceListResponse,
  type ServiceStatus,
  type UserService,
} from "@/lib/car-services";
import { t, type DictKey, type Locale } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

type StatusFilter = ServiceStatus | "all";

const TABS: { value: StatusFilter; labelKey: DictKey }[] = [
  { value: "pending", labelKey: "servicesStatusPending" },
  { value: "approved", labelKey: "servicesStatusApproved" },
  { value: "rejected", labelKey: "servicesStatusRejected" },
  { value: "all", labelKey: "all" },
];

const DATE_LOCALES: Record<Locale, string> = {
  en: "en-GB",
  ar: "ar-IQ",
  ku: "ckb-IQ",
};

function parseStatus(raw: string | null): StatusFilter {
  if (raw === "approved" || raw === "rejected" || raw === "all") return raw;
  return "pending";
}

function parseOffset(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function serviceStatusClass(status?: string): string {
  switch (status) {
    case "approved":
      return "bg-emerald-500/15 text-emerald-700";
    case "pending":
      return "bg-amber-500/15 text-amber-700";
    case "rejected":
      return "bg-red-500/15 text-red-700";
    default:
      return statusBadgeClass(status);
  }
}

function formatWhen(value: string, locale: Locale): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || "—";
  try {
    return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  }
}

function submitterLabel(item: UserService): string {
  const s = item.submitter;
  return (
    s?.showroomName?.trim() ||
    s?.displayName?.trim() ||
    item.userId ||
    "—"
  );
}

function waHref(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-t border-outline">
          <td className="px-4 py-3" colSpan={7}>
            <div className="h-3 w-2/3 max-w-md animate-pulse rounded bg-input" />
          </td>
        </tr>
      ))}
    </>
  );
}

function AdminServicesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useAppSelector((s) => s.preferences.locale);
  const status = parseStatus(searchParams.get("status"));
  const q = searchParams.get("q") || "";
  const offset = parseOffset(searchParams.get("offset"));

  const [qDraft, setQDraft] = useState(q);
  const [items, setItems] = useState<UserService[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<UserService | null>(null);
  const [rejectItem, setRejectItem] = useState<UserService | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const writeFilters = useCallback(
    (next: { status?: StatusFilter; q?: string | null; offset?: number }) => {
      const params = new URLSearchParams();
      const s = next.status ?? status;
      const nextQ = next.q !== undefined ? next.q || "" : q;
      const nextOffset =
        next.offset !== undefined
          ? next.offset
          : next.status !== undefined || next.q !== undefined
            ? 0
            : offset;
      params.set("status", s);
      if (nextQ.trim()) params.set("q", nextQ.trim());
      if (nextOffset > 0) params.set("offset", String(nextOffset));
      router.replace(`/admin/services?${params.toString()}`, { scroll: false });
    },
    [status, q, offset, router],
  );

  useEffect(() => {
    if (searchParams.get("status")) return;
    writeFilters({ status: "pending" });
  }, [searchParams, writeFilters]);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(offset),
      };
      if (status !== "all") query.status = status;
      if (q.trim()) query.q = q.trim();
      const d = await api.get<ServiceListResponse>("/admin/services", query);
      setItems(d.items ?? []);
      setTotal(d.total ?? 0);
      setCounts(d.counts ?? { pending: 0, approved: 0, rejected: 0 });
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t(locale, "servicesLoadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [status, q, offset, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  function tabCount(value: StatusFilter): number {
    if (value === "all") {
      return counts.pending + counts.approved + counts.rejected;
    }
    return counts[value];
  }

  async function patchStatus(
    item: UserService,
    next: ServiceStatus,
    rejectionReason?: string,
  ) {
    setBusyId(item.id);
    try {
      const updated = await api.patch<UserService>(
        `/admin/services/${item.id}`,
        {
          status: next,
          ...(rejectionReason ? { rejectionReason } : {}),
        },
      );
      setItems((list) =>
        list
          .map((row) => (row.id === item.id ? { ...row, ...updated } : row))
          .filter((row) => status === "all" || row.status === status),
      );
      setCounts((c) => {
        if (item.status === next) return c;
        return {
          ...c,
          [item.status]: Math.max(0, c[item.status] - 1),
          [next]: c[next] + 1,
        };
      });
      if (status !== "all") {
        setTotal((n) => Math.max(0, n - 1));
      }
      setDrawer((open) =>
        open?.id === item.id ? { ...open, ...updated } : open,
      );
      setToast(
        next === "rejected"
          ? t(locale, "servicesRejectedToast")
          : t(locale, "servicesApprovedToast"),
      );
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "updateFailed"));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function requestStatus(item: UserService, next: ServiceStatus) {
    if (next === "rejected") {
      setRejectItem(item);
      setRejectReason(item.rejectionReason ?? "");
      return;
    }
    void patchStatus(item, next);
  }

  async function confirmReject() {
    if (!rejectItem || !rejectReason.trim()) return;
    const ok = await patchStatus(
      rejectItem,
      "rejected",
      rejectReason.trim(),
    );
    if (ok) {
      setRejectItem(null);
      setRejectReason("");
    }
  }

  const from = items.length ? offset + 1 : 0;
  const to = offset + items.length;
  const hasPrev = offset > 0;
  const hasNext = offset + items.length < total;
  const showSkeleton = loading && items.length === 0;
  const empty = !loading && items.length === 0;
  const emptyPending = empty && status === "pending" && !q.trim();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {t(locale, "adminServicesTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminServicesSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/services"
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
          >
            {t(locale, "servicesViewDirectory")}
          </Link>
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
        {TABS.map((tab) => {
          const count = tabCount(tab.value);
          const pill = (
            <button
              type="button"
              onClick={() => writeFilters({ status: tab.value })}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                status === tab.value
                  ? "bg-primary-fill text-on-primary"
                  : "bg-input text-muted"
              }`}
            >
              {t(locale, tab.labelKey)}
              <span className="ms-1 tabular-nums opacity-80">{count}</span>
            </button>
          );
          if (tab.value === "approved") {
            return (
              <span key={tab.value} className="inline-flex items-center gap-1">
                {pill}
                <Link
                  href="/services"
                  className="text-[11px] font-semibold text-primary-strong hover:underline"
                >
                  {t(locale, "servicesViewDirectory")}
                </Link>
              </span>
            );
          }
          return <span key={tab.value}>{pill}</span>;
        })}
        <input
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder={t(locale, "servicesSearch")}
          className="ms-auto w-full max-w-xs rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm sm:w-auto"
        />
      </div>

      <p className="mt-3 text-xs text-muted">
        {t(locale, "servicesShowingRange", { from, to, total })}
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] bg-card ring-1 ring-outline">
        {empty ? (
          <div className="p-8 text-center">
            <p className="font-semibold">
              {emptyPending
                ? t(locale, "adminServicesEmptyTitle")
                : t(locale, "noMatches")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {emptyPending
                ? t(locale, "adminServicesEmptyHint")
                : t(locale, "tryDifferentFilter")}
            </p>
            {emptyPending ? (
              <p className="mt-3 text-sm text-muted">
                {t(locale, "servicesEmptyPendingHint", {
                  count: counts.approved,
                })}{" "}
                <Link href="/services" className="font-semibold text-primary-strong">
                  {t(locale, "servicesViewDirectory")}
                </Link>
              </p>
            ) : null}
          </div>
        ) : (
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-outline text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "servicesTitle")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "servicesCategory")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colCity")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colPhone")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "servicesSubmitter")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colStatus")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colSubmitted")}
                </th>
              </tr>
            </thead>
            <tbody>
              {showSkeleton ? (
                <SkeletonRows />
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b border-outline/70 last:border-0 hover:bg-input/40"
                    onClick={() => setDrawer(item)}
                  >
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate font-medium">{item.title}</p>
                    </td>
                    <td className="px-4 py-3">
                      {item.categoryTitle
                        ? serviceCategoryTitle(locale, {
                            slug: item.categorySlug || "",
                            title: item.categoryTitle,
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {serviceCityLabel(locale, item.city)}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={`tel:${item.phone}`}
                        className="text-primary-strong hover:underline"
                        dir="ltr"
                      >
                        {item.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <p className="truncate">{submitterLabel(item)}</p>
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${serviceStatusClass(item.status)}`}
                        >
                          {serviceStatusLabel(locale, item.status)}
                        </span>
                        <select
                          value={item.status}
                          disabled={busyId === item.id}
                          onChange={(e) =>
                            requestStatus(
                              item,
                              e.target.value as ServiceStatus,
                            )
                          }
                          className="rounded-[var(--radius-control)] bg-input px-2 py-1 text-[11px] outline-none"
                        >
                          {SERVICE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {serviceStatusLabel(locale, s)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatWhen(item.createdAt, locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {hasPrev || hasNext ? (
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            disabled={!hasPrev || loading}
            className="rounded-[var(--radius-control)] bg-input px-4 py-2 text-sm font-semibold disabled:opacity-50"
            onClick={() =>
              writeFilters({ offset: Math.max(0, offset - PAGE_SIZE) })
            }
          >
            {t(locale, "servicesPrev")}
          </button>
          <button
            type="button"
            disabled={!hasNext || loading}
            className="rounded-[var(--radius-control)] bg-input px-4 py-2 text-sm font-semibold disabled:opacity-50"
            onClick={() => writeFilters({ offset: offset + PAGE_SIZE })}
          >
            {t(locale, "servicesNext")}
          </button>
        </div>
      ) : null}

      {drawer ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={t(locale, "helpClose")}
            onClick={() => {
              if (!busyId) setDrawer(null);
            }}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-card p-5 shadow-xl ring-1 ring-outline">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold">{drawer.title}</h2>
                <p className="mt-0.5 text-sm text-muted">
                  {drawer.categoryTitle
                    ? serviceCategoryTitle(locale, {
                        slug: drawer.categorySlug || "",
                        title: drawer.categoryTitle,
                      })
                    : "—"}
                  {" · "}
                  {serviceCityLabel(locale, drawer.city)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-[var(--radius-control)] bg-input px-2 py-1 text-xs font-semibold"
                onClick={() => setDrawer(null)}
              >
                {t(locale, "helpClose")}
              </button>
            </div>
            <span
              className={`mt-3 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${serviceStatusClass(drawer.status)}`}
            >
              {serviceStatusLabel(locale, drawer.status)}
            </span>
            <p className="mt-4 whitespace-pre-wrap text-sm">
              {drawer.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`tel:${drawer.phone}`}
                className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
              >
                <Phone className="h-3.5 w-3.5" />
                {drawer.phone}
              </a>
              <a
                href={waHref(drawer.phone)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            </div>
            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wide text-muted">
                {t(locale, "servicesSubmitter")}
              </p>
              <Link
                href={`/admin/listings?sellerId=${encodeURIComponent(drawer.userId)}`}
                className="mt-1 block font-semibold text-primary-strong hover:underline"
              >
                {submitterLabel(drawer)}
              </Link>
              {drawer.submitter?.phone ? (
                <a
                  href={`tel:${drawer.submitter.phone}`}
                  className="mt-1 flex items-center gap-1 text-sm text-muted hover:text-foreground"
                  dir="ltr"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {drawer.submitter.phone}
                </a>
              ) : null}
            </div>
            {drawer.rejectionReason?.trim() ? (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {t(locale, "servicesRejectReason")}
                </p>
                <p className="mt-1 text-sm">{drawer.rejectionReason}</p>
              </div>
            ) : null}
            <p className="mt-4 text-xs text-muted">
              {formatWhen(drawer.createdAt, locale)}
            </p>
            <div className="mt-auto flex gap-2 pt-6">
              {drawer.status !== "approved" ? (
                <button
                  type="button"
                  disabled={busyId === drawer.id}
                  onClick={() => void patchStatus(drawer, "approved")}
                  className="flex-1 rounded-[var(--radius-control)] bg-primary-fill px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
                >
                  {t(locale, "approve")}
                </button>
              ) : null}
              {drawer.status !== "rejected" ? (
                <button
                  type="button"
                  disabled={busyId === drawer.id}
                  onClick={() => requestStatus(drawer, "rejected")}
                  className="flex-1 rounded-[var(--radius-control)] bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t(locale, "reject")}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      <AdminConfirmDialog
        open={Boolean(rejectItem)}
        title={t(locale, "servicesRejectConfirmTitle")}
        description={t(locale, "servicesRejectConfirmBody")}
        confirmLabel={t(locale, "reject")}
        danger
        busy={busyId === rejectItem?.id}
        confirmDisabled={!rejectReason.trim()}
        onConfirm={() => void confirmReject()}
        onCancel={() => {
          if (!busyId) {
            setRejectItem(null);
            setRejectReason("");
          }
        }}
      >
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value.slice(0, 500))}
          placeholder={t(locale, "servicesRejectReasonPlaceholder")}
          rows={4}
          className="mt-3 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm outline-none"
        />
      </AdminConfirmDialog>

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default function AdminServicesPage() {
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
      <AdminServicesInner />
    </Suspense>
  );
}
