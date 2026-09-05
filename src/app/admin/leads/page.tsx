"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Mail, MessageCircle, MoreHorizontal, StickyNote } from "lucide-react";
import { api } from "@/lib/api";
import { downloadCsv, statusBadgeClass } from "@/lib/admin";
import { AdminToast } from "@/components/admin-toast";
import {
  INTENT_LABEL_KEYS,
  LEAD_STATUSES,
  type LeadIntent,
  type LeadListResponse,
  type LeadRequest,
  type LeadStatus,
} from "@/lib/leads";
import { leadStatusLabel, t, type DictKey, type Locale } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const WAITING_MS = 48 * 60 * 60 * 1000;
const MENU_ITEM =
  "flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-xs font-semibold data-focus:bg-input disabled:opacity-50";

type StatusFilter = LeadStatus | "all";

const TABS: { value: StatusFilter; labelKey: DictKey }[] = [
  { value: "new", labelKey: "leadStatusNew" },
  { value: "contacted", labelKey: "leadStatusContacted" },
  { value: "resolved", labelKey: "leadStatusResolved" },
  { value: "all", labelKey: "all" },
];

const DATE_LOCALES: Record<Locale, string> = {
  en: "en-GB",
  ar: "ar-IQ",
  ku: "ckb-IQ",
};

function parseStatus(raw: string | null): StatusFilter {
  if (raw === "contacted" || raw === "resolved" || raw === "all") return raw;
  return "new";
}

function parseOffset(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function intentLabel(locale: Locale, intent: string): string {
  const key = INTENT_LABEL_KEYS[intent as LeadIntent];
  return key ? t(locale, key) : intent;
}

function leadStatusClass(status?: string): string {
  switch (status) {
    case "new":
      return "bg-sky-500/15 text-sky-700";
    case "contacted":
      return "bg-amber-500/15 text-amber-700";
    case "resolved":
      return "bg-emerald-500/15 text-emerald-700";
    default:
      return statusBadgeClass(status);
  }
}

function formatLeadWhen(value: string, locale: Locale): string {
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

function waHref(number: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}

function isWaiting(item: LeadRequest): boolean {
  if (item.status !== "new") return false;
  const t0 = new Date(item.createdAt).getTime();
  return Number.isFinite(t0) && Date.now() - t0 > WAITING_MS;
}

function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-t border-outline">
          <td className="px-4 py-3" colSpan={6}>
            <div className="flex items-center gap-3">
              <div className="h-3 w-36 animate-pulse rounded bg-input" />
              <div className="h-3 w-48 animate-pulse rounded bg-input" />
              <div className="h-3 w-24 animate-pulse rounded bg-input" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function AdminLeadsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useAppSelector((s) => s.preferences.locale);
  const status = parseStatus(searchParams.get("status"));
  const q = searchParams.get("q") || "";
  const offset = parseOffset(searchParams.get("offset"));

  const [qDraft, setQDraft] = useState(q);
  const [items, setItems] = useState<LeadRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({
    new: 0,
    contacted: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<LeadRequest | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

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
      router.replace(`/admin/leads?${params.toString()}`, { scroll: false });
    },
    [status, q, offset, router],
  );

  useEffect(() => {
    if (searchParams.get("status")) return;
    writeFilters({ status: "new" });
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
      const d = await api.get<LeadListResponse>("/admin/leads", query);
      setItems(d.items ?? []);
      setTotal(d.filteredTotal ?? d.total ?? 0);
      setCounts(d.counts ?? { new: 0, contacted: 0, resolved: 0 });
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t(locale, "failedToLoadLeads"),
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
      return counts.new + counts.contacted + counts.resolved;
    }
    return counts[value];
  }

  async function setStatus(id: string, next: LeadStatus) {
    setBusyId(id);
    try {
      const updated = await api.patch<LeadRequest>(`/admin/leads/${id}`, {
        status: next,
      });
      setItems((list) =>
        list
          .map((item) => (item.id === id ? { ...item, ...updated } : item))
          .filter((item) => status === "all" || item.status === status),
      );
      setCounts((c) => {
        const prev = items.find((row) => row.id === id);
        if (!prev || prev.status === next) return c;
        return {
          ...c,
          [prev.status]: Math.max(0, c[prev.status] - 1),
          [next]: c[next] + 1,
        };
      });
      if (status !== "all") {
        setTotal((n) => Math.max(0, n - 1));
      }
      setDrawer((open) =>
        open?.id === id ? { ...open, ...updated } : open,
      );
      setToast(t(locale, "leadsStatusUpdated"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  function openNotes(item: LeadRequest) {
    setDrawer(item);
    setNotesDraft(item.notes ?? "");
  }

  async function saveNotes() {
    if (!drawer) return;
    setBusyId(drawer.id);
    try {
      const updated = await api.patch<LeadRequest>(
        `/admin/leads/${drawer.id}`,
        { notes: notesDraft },
      );
      setItems((list) =>
        list.map((item) =>
          item.id === drawer.id ? { ...item, ...updated } : item,
        ),
      );
      setDrawer(updated);
      setToast(t(locale, "leadsNotesSaved"));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  function exportCurrent() {
    const header = [
      "Name",
      "Email",
      "WhatsApp",
      "Intent",
      "Status",
      "Message",
      "Notes",
      "Source",
      "Created",
    ];
    const rows = items.map((item) => [
      item.name,
      item.email,
      item.whatsappNumber,
      item.intent,
      item.status,
      item.message ?? "",
      item.notes ?? "",
      item.sourceUrl ?? "",
      item.createdAt,
    ]);
    downloadCsv(`leads-${status}.csv`, [header, ...rows]);
  }

  const from = items.length ? offset + 1 : 0;
  const to = offset + items.length;
  const hasPrev = offset > 0;
  const hasNext = offset + items.length < total;
  const showSkeleton = loading && items.length === 0;
  const empty = !loading && items.length === 0;
  const noneAtAll =
    counts.new + counts.contacted + counts.resolved === 0 && !q.trim();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "adminLeadsTitle")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminLeadsSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCurrent}
            disabled={items.length === 0}
            className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {t(locale, "exportCsv")}
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
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => writeFilters({ status: tab.value })}
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
        <input
          value={qDraft}
          onChange={(e) => setQDraft(e.target.value)}
          placeholder={t(locale, "leadsSearchPlaceholder")}
          className="ms-auto w-full max-w-xs rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm sm:w-auto"
        />
      </div>

      <p className="mt-3 text-xs text-muted">
        {t(locale, "leadsShowingRange", { from, to, total })}
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
              {noneAtAll
                ? t(locale, "leadsEmptyTitle")
                : t(locale, "noMatches")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {noneAtAll
                ? t(locale, "leadsEmptyHint")
                : t(locale, "tryDifferentFilter")}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-outline text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colName")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colContact")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colLookingTo")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colStatus")}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {t(locale, "colSubmitted")}
                </th>
                <th className="w-28 px-3 py-3 font-semibold">
                  <span className="sr-only">{t(locale, "colActions")}</span>
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
                    onClick={() => openNotes(item)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.name}</p>
                      {isWaiting(item) ? (
                        <p className="text-[11px] text-muted">
                          {t(locale, "leadsWaiting2d")}
                        </p>
                      ) : null}
                      {item.notes?.trim() || item.message?.trim() ? (
                        <p className="text-[11px] text-muted">
                          {t(locale, "leadsNotes")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`mailto:${item.email}`}
                        className="block text-primary-strong hover:underline"
                      >
                        {item.email}
                      </a>
                      <a
                        href={waHref(item.whatsappNumber)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 block text-xs text-muted hover:text-foreground"
                        dir="ltr"
                      >
                        {item.whatsappNumber}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {intentLabel(locale, item.intent)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={item.status}
                        disabled={busyId === item.id}
                        onChange={(e) =>
                          void setStatus(item.id, e.target.value as LeadStatus)
                        }
                        className={`rounded-full px-2 py-1 text-xs font-semibold capitalize outline-none ${leadStatusClass(item.status)}`}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {leadStatusLabel(locale, s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatLeadWhen(item.createdAt, locale)}
                    </td>
                    <td
                      className="px-3 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={waHref(item.whatsappNumber)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="WhatsApp"
                          className="rounded-[var(--radius-control)] p-1.5 text-muted hover:bg-input hover:text-foreground"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        <a
                          href={`mailto:${item.email}`}
                          aria-label="Email"
                          className="rounded-[var(--radius-control)] p-1.5 text-muted hover:bg-input hover:text-foreground"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          aria-label={t(locale, "leadsOpenNotes")}
                          onClick={() => openNotes(item)}
                          className="rounded-[var(--radius-control)] p-1.5 text-muted hover:bg-input hover:text-foreground"
                        >
                          <StickyNote className="h-4 w-4" />
                        </button>
                        <Menu>
                          <MenuButton
                            disabled={busyId === item.id}
                            aria-label={t(locale, "openMenu")}
                            className="rounded-[var(--radius-control)] p-1.5 text-muted hover:bg-input hover:text-foreground disabled:opacity-50"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </MenuButton>
                          <MenuItems
                            anchor="bottom end"
                            className="z-30 w-44 origin-top-end rounded-[var(--radius-card)] bg-card p-1 shadow-lg ring-1 ring-outline [--anchor-gap:4px]"
                          >
                            {item.status !== "contacted" ? (
                              <MenuItem>
                                <button
                                  type="button"
                                  className={MENU_ITEM}
                                  onClick={() =>
                                    void setStatus(item.id, "contacted")
                                  }
                                >
                                  {t(locale, "leadsMarkContacted")}
                                </button>
                              </MenuItem>
                            ) : null}
                            {item.status !== "resolved" ? (
                              <MenuItem>
                                <button
                                  type="button"
                                  className={MENU_ITEM}
                                  onClick={() =>
                                    void setStatus(item.id, "resolved")
                                  }
                                >
                                  {t(locale, "leadsMarkResolved")}
                                </button>
                              </MenuItem>
                            ) : null}
                            <MenuItem>
                              <button
                                type="button"
                                className={MENU_ITEM}
                                onClick={() => openNotes(item)}
                              >
                                {t(locale, "leadsOpenNotes")}
                              </button>
                            </MenuItem>
                          </MenuItems>
                        </Menu>
                      </div>
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
            {t(locale, "leadsPrev")}
          </button>
          <button
            type="button"
            disabled={!hasNext || loading}
            className="rounded-[var(--radius-control)] bg-input px-4 py-2 text-sm font-semibold disabled:opacity-50"
            onClick={() => writeFilters({ offset: offset + PAGE_SIZE })}
          >
            {t(locale, "leadsNext")}
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
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-card p-5 shadow-xl ring-1 ring-outline">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{drawer.name}</h2>
                <p className="mt-0.5 text-sm text-muted">
                  {intentLabel(locale, drawer.intent)}
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
            <p className="mt-3 text-sm">
              <a
                href={`mailto:${drawer.email}`}
                className="text-primary-strong hover:underline"
              >
                {drawer.email}
              </a>
            </p>
            <a
              href={waHref(drawer.whatsappNumber)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 text-sm text-muted hover:text-foreground"
              dir="ltr"
            >
              {drawer.whatsappNumber}
            </a>
            <p className="mt-2 text-xs text-muted">
              {formatLeadWhen(drawer.createdAt, locale)}
            </p>
            {drawer.message?.trim() ? (
              <div className="mt-4">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {t(locale, "leadsCustomerMessage")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">
                  {drawer.message}
                </p>
              </div>
            ) : null}
            {drawer.sourceUrl?.trim() ? (
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {t(locale, "leadsSourceUrl")}
                </p>
                <a
                  href={drawer.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-sm text-primary-strong hover:underline"
                >
                  {drawer.sourceUrl}
                </a>
              </div>
            ) : null}
            <label className="mt-4 block min-h-0 flex-1">
              <span className="mb-1.5 block text-xs font-semibold">
                {t(locale, "leadsNotes")}
              </span>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value.slice(0, 5000))}
                placeholder={t(locale, "leadsNotesPlaceholder")}
                className="h-40 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm outline-none"
              />
            </label>
            <button
              type="button"
              disabled={busyId === drawer.id}
              onClick={() => void saveNotes()}
              className="mt-3 rounded-[var(--radius-control)] bg-primary-fill px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
            >
              {t(locale, "save")}
            </button>
          </aside>
        </div>
      ) : null}

      <AdminToast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default function AdminLeadsPage() {
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
      <AdminLeadsInner />
    </Suspense>
  );
}
