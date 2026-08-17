"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  type SupportTicket,
  type TicketMessage,
  formatAdminWhen,
} from "@/lib/admin";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export default function AdminMessagesPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const { user } = useAuth();
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const threadGen = useRef(0);

  function ticketStatusLabel(status?: string) {
    const s = status || "open";
    if (s === "resolved") return t(locale, "ticketStatusResolved");
    if (s === "open") return t(locale, "ticketStatusOpen");
    return s;
  }

  async function loadTickets() {
    try {
      const d = await api.get<{ items: SupportTicket[] }>("/admin/tickets");
      setItems(d.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "failedGeneric"));
    }
  }

  async function openTicket(ticket: SupportTicket) {
    const gen = ++threadGen.current;
    setSelected(ticket);
    setReply("");
    setMessages([]);
    try {
      const d = await api.get<{ items: TicketMessage[] }>(
        `/admin/tickets/${ticket.id}/messages`,
      );
      if (gen !== threadGen.current) return;
      setMessages(d.items ?? []);
    } catch (e) {
      if (gen !== threadGen.current) return;
      setMessages([]);
      setError(e instanceof Error ? e.message : t(locale, "failedToLoadThread"));
    }
  }

  useEffect(() => {
    void loadTickets();
  }, []);

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

  async function setStatus(status: "open" | "resolved") {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await api.patch<SupportTicket>(
        `/admin/tickets/${selected.id}`,
        { status },
      );
      setSelected(updated);
      setItems((list) =>
        list.map((row) =>
          row.id === updated.id ? { ...row, ...updated } : row,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "statusUpdateFailed"));
    } finally {
      setBusy(false);
    }
  }

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

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {(["open", "resolved", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === key
                ? "bg-primary text-on-primary"
                : "bg-input text-muted"
            }`}
          >
            {key === "all" ? t(locale, "all") : ticketStatusLabel(key)}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-2">
          {items.filter((ticket) => {
            const status = ticket.status || "open";
            if (filter === "all") return true;
            return status === filter;
          }).length === 0 ? (
            <div className="rounded-[var(--radius-card)] bg-card p-6 text-center ring-1 ring-outline">
              <p className="font-semibold">{t(locale, "ticketsEmptyTitle")}</p>
              <p className="mt-1 text-sm text-muted">
                {t(locale, "ticketsEmptyHint")}
              </p>
            </div>
          ) : (
            items
              .filter((ticket) => {
                const status = ticket.status || "open";
                if (filter === "all") return true;
                return status === filter;
              })
              .map((ticket) => {
              const active = selected?.id === ticket.id;
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => void openTicket(ticket)}
                  className={`w-full rounded-[var(--radius-card)] p-3 text-left ring-1 transition ${
                    active
                      ? "bg-primary/10 ring-primary"
                      : "bg-card ring-outline hover:ring-primary/40"
                  }`}
                >
                  <p className="truncate text-sm font-semibold">
                    {ticket.subject ||
                      ticket.userDisplayName ||
                      t(locale, "ticketFallback")}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {ticket.lastMessage || ticketStatusLabel(ticket.status) || "—"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {ticketStatusLabel(ticket.status)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
          {!selected ? (
            <p className="text-sm text-muted">{t(locale, "selectTicketHint")}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-outline pb-3">
                <div>
                  <p className="font-semibold">
                    {selected.subject || t(locale, "supportTicketFallback")}
                  </p>
                  <p className="text-xs text-muted">
                    {selected.userDisplayName || selected.userId} ·{" "}
                    {ticketStatusLabel(selected.status)}
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

              <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto">
                {messages.length === 0 ? (
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
                        <p>{m.text}</p>
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
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={t(locale, "replyPlaceholder")}
                  className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy || !reply.trim()}
                  className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
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
