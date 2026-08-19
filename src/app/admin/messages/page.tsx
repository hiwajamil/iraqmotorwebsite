"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  type SupportTicket,
  type TicketListResponse,
  type TicketMessage,
  formatAdminWhen,
} from "@/lib/admin";
import { t, type DictKey } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const PAGE_SIZE = "50";
const POLL_MS = 10_000;

type StatusFilter = "open" | "resolved" | "all";

const TABS: { value: StatusFilter; labelKey: DictKey }[] = [
  { value: "open", labelKey: "ticketStatusOpen" },
  { value: "resolved", labelKey: "ticketStatusResolved" },
  { value: "all", labelKey: "all" },
];

function parseStatus(raw: string | null): StatusFilter {
  if (raw === "resolved" || raw === "all") return raw;
  return "open";
}

function AdminMessagesInner() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = parseStatus(searchParams.get("status"));
  const selectedId = searchParams.get("id") || "";

  const [items, setItems] = useState<SupportTicket[]>([]);
  const [counts, setCounts] = useState({ open: 0, resolved: 0 });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const threadGen = useRef(0);
  const threadRef = useRef<HTMLDivElement | null>(null);

  const writeFilters = useCallback(
    (next: { status?: StatusFilter; id?: string | null }) => {
      const params = new URLSearchParams();
      const s = next.status ?? status;
      const id = next.id !== undefined ? next.id || "" : selectedId;
      params.set("status", s);
      if (id) params.set("id", id);
      router.replace(`/admin/messages?${params.toString()}`, { scroll: false });
    },
    [status, selectedId, router],
  );

  useEffect(() => {
    if (searchParams.get("status")) return;
    writeFilters({ status: "open" });
  }, [searchParams, writeFilters]);

  const loadTickets = useCallback(
    async (opts?: { append?: boolean; cursor?: string | null }) => {
      if (!opts?.append) setLoading(true);
      try {
        const query: Record<string, string> = {
          status,
          limit: PAGE_SIZE,
        };
        if (opts?.cursor) query.cursor = opts.cursor;
        const d = await api.get<TicketListResponse>("/admin/tickets", query);
        const list = d.items ?? [];
        setItems((prev) => (opts?.append ? [...prev, ...list] : list));
        setCounts(d.counts ?? { open: 0, resolved: 0 });
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
    void loadTickets();
  }, [loadTickets]);

  const openTicket = useCallback(
    async (ticket: SupportTicket, opts?: { silent?: boolean }) => {
      const gen = ++threadGen.current;
      if (!opts?.silent) {
        setSelected((cur) =>
          cur?.id === ticket.id ? { ...cur, ...ticket } : ticket,
        );
        setThreadLoading(true);
      }
      try {
        const d = await api.get<{ items: TicketMessage[] }>(
          `/admin/tickets/${ticket.id}/messages`,
        );
        if (gen !== threadGen.current) return;
        setMessages(d.items ?? []);
      } catch (e) {
        if (gen !== threadGen.current) return;
        setMessages([]);
        setError(
          e instanceof Error ? e.message : t(locale, "failedToLoadThread"),
        );
      } finally {
        if (gen === threadGen.current) setThreadLoading(false);
      }
    },
    [locale],
  );

  useEffect(() => {
    setReply("");
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setMessages([]);
      return;
    }
    const fromList = items.find((row) => row.id === selectedId);
    void openTicket(fromList ?? { id: selectedId, status: "open" });
  }, [selectedId, openTicket]);

  useEffect(() => {
    if (!selectedId) return;
    setSelected((cur) => {
      const fromList = items.find((row) => row.id === selectedId);
      return fromList ?? cur;
    });
  }, [items, selectedId]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!selectedId) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void openTicket({ id: selectedId }, { silent: true });
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [selectedId, openTicket]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((ticket) =>
      [
        ticket.subject,
        ticket.userDisplayName,
        ticket.userId,
        ticket.lastMessage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [items, query]);

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/tickets/${selected.id}/messages`, {
        text: reply.trim(),
      });
      setReply("");
      await openTicket(selected);
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "replyFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(next: "open" | "resolved") {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await api.patch<SupportTicket>(
        `/admin/tickets/${selected.id}`,
        { status: next },
      );
      setSelected(updated);
      setItems((list) =>
        list
          .map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
          .filter((row) => status === "all" || (row.status || "open") === status),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t(locale, "statusUpdateFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  function tabCount(value: StatusFilter): number {
    if (value === "all") return counts.open + counts.resolved;
    return counts[value];
  }

  const showListSkeleton = loading && items.length === 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">
            {t(locale, "adminMessagesTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "adminMessagesSubtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadTickets()}
          className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
        >
          {t(locale, "refresh")}
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => writeFilters({ status: tab.value })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === tab.value
                ? "bg-primary text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {t(locale, tab.labelKey)}
            <span className="ms-1 tabular-nums opacity-80">
              {tabCount(tab.value)}
            </span>
          </button>
        ))}
        <label className="relative ms-auto w-full max-w-xs sm:w-auto">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, "ticketsSearchPlaceholder")}
            className="w-full rounded-[var(--radius-control)] bg-input py-2 ps-8 pe-3 text-sm"
          />
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-2">
          {showListSkeleton ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-[var(--radius-card)] bg-input"
              />
            ))
          ) : visible.length === 0 ? (
            <div className="rounded-[var(--radius-card)] bg-card p-6 text-center ring-1 ring-outline">
              <p className="font-semibold">{t(locale, "ticketsEmptyTitle")}</p>
              <p className="mt-1 text-sm text-muted">
                {status === "open"
                  ? t(locale, "ticketsEmptyOpenHint")
                  : t(locale, "ticketsEmptyHint")}
              </p>
            </div>
          ) : (
            visible.map((ticket) => {
              const active = selectedId === ticket.id;
              const unread = ticket.unreadForAdmin === true;
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => writeFilters({ id: ticket.id })}
                  className={`w-full rounded-[var(--radius-card)] p-3 text-left ring-1 transition ${
                    active
                      ? "bg-primary/10 ring-primary"
                      : "bg-card ring-outline hover:ring-primary/40"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        unread ? "bg-primary" : "bg-outline"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {ticket.subject ||
                          ticket.userDisplayName ||
                          t(locale, "ticketFallback")}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted">
                        {ticket.lastMessage || "—"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted">
                        {formatAdminWhen(
                          ticket.lastMessageAt || ticket.updatedAt,
                        ) || "—"}
                        {" · "}
                        {ticket.status === "resolved"
                          ? t(locale, "ticketStatusResolved")
                          : t(locale, "ticketStatusOpen")}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
          {nextCursor && !query.trim() ? (
            <button
              type="button"
              disabled={loading}
              className="w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
              onClick={() =>
                void loadTickets({ append: true, cursor: nextCursor })
              }
            >
              {t(locale, "loadMore")}
            </button>
          ) : null}
        </div>

        <div className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
          {threadLoading && !selected?.id ? (
            <div className="space-y-3">
              <div className="h-6 w-40 animate-pulse rounded bg-input" />
              <div className="h-24 animate-pulse rounded-2xl bg-input" />
            </div>
          ) : !selectedId ? (
            <p className="text-sm text-muted">{t(locale, "selectTicketHint")}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline pb-3">
                <div>
                  <p className="font-semibold">
                    {selected?.subject || t(locale, "supportTicketFallback")}
                  </p>
                  <p className="text-xs text-muted">
                    {selected?.userId ? (
                      <Link
                        href={`/admin/listings?sellerId=${encodeURIComponent(selected.userId)}`}
                        className="text-primary hover:underline"
                      >
                        {selected.userDisplayName || selected.userId}
                      </Link>
                    ) : (
                      selected?.userDisplayName || "—"
                    )}
                    {" · "}
                    {selected?.status === "resolved"
                      ? t(locale, "ticketStatusResolved")
                      : t(locale, "ticketStatusOpen")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    onClick={() => void setStatus("open")}
                  >
                    {t(locale, "open")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                    onClick={() => void setStatus("resolved")}
                  >
                    {t(locale, "resolve")}
                  </button>
                </div>
              </div>

              <div
                ref={threadRef}
                className="mt-4 max-h-[420px] space-y-3 overflow-y-auto"
              >
                {threadLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 w-2/3 animate-pulse rounded-2xl bg-input"
                    />
                  ))
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted">{t(locale, "threadEmpty")}</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.isAdmin || m.senderId === user?.uid;
                    return (
                      <div
                        key={m.id}
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          mine
                            ? "ml-auto bg-primary text-on-primary"
                            : "bg-input"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            mine ? "text-on-primary/80" : "text-muted"
                          }`}
                        >
                          {formatAdminWhen(m.timestamp)}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <form
                className="mt-4 flex gap-2 border-t border-outline pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendReply();
                }}
              >
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendReply();
                    }
                  }}
                  placeholder={t(locale, "replyPlaceholder")}
                  rows={2}
                  className="min-w-0 flex-1 resize-none rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy || !reply.trim()}
                  className="self-end rounded-[var(--radius-control)] bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                >
                  {t(locale, "send")}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded bg-input" />
          <div className="mt-6 h-64 animate-pulse rounded-[var(--radius-card)] bg-card ring-1 ring-outline" />
        </div>
      }
    >
      <AdminMessagesInner />
    </Suspense>
  );
}
