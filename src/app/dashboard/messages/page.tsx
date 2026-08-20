"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api, type InboxMessage } from "@/lib/api";
import {
  type SupportTicket,
  type TicketMessage,
  formatAdminWhen,
} from "@/lib/admin";
import { formatDashboardWhen } from "@/lib/dashboard";
import { formatMoney } from "@/lib/car-pricing-trust";
import { formatCarTitle } from "@/lib/listing-display";
import { useAppSelector } from "@/store/hooks";
import { t, type Locale } from "@/lib/i18n";

type Tab = "offers" | "support";

function isBidOffer(message: InboxMessage): boolean {
  if (String(message.type ?? "").toLowerCase() === "bid") return true;
  const amount = Number(message.bidAmount ?? message.amount ?? 0);
  return Boolean(message.carId) || amount > 0;
}

function offerCarTitle(message: InboxMessage, locale: Locale): string {
  const fromFields = formatCarTitle(
    {
      brandId:
        typeof message.brandId === "string" ? message.brandId : undefined,
      modelKey:
        typeof message.modelKey === "string" ? message.modelKey : undefined,
      year: message.year as string | number | undefined,
    },
    locale,
  );
  if (fromFields) return fromFields;
  if (typeof message.carName === "string" && message.carName.trim()) {
    return message.carName.trim();
  }
  return t(locale, "carListing");
}

function telHref(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return `tel:${digits.startsWith("+") ? digits : `+${digits}`}`;
}

function whatsappHref(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `964${digits.slice(1)}`;
  if (digits.length === 10) digits = `964${digits}`;
  return `https://wa.me/${digits}`;
}

function DashboardMessagesInner() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "support" ? "support" : "offers";
  const ticketId = searchParams.get("ticket") || "";

  function writeNav(next: { tab?: Tab; ticket?: string | null }) {
    const params = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    const nextTicket =
      next.ticket !== undefined ? next.ticket || "" : ticketId;
    if (nextTab === "support") params.set("tab", "support");
    if (nextTab === "support" && nextTicket) params.set("ticket", nextTicket);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/messages?${qs}` : "/dashboard/messages", {
      scroll: false,
    });
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        {t(locale, "dashMessages")}
      </h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => writeNav({ tab: "offers", ticket: null })}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            tab === "offers"
              ? "bg-primary text-on-primary"
              : "bg-input text-muted"
          }`}
        >
          {t(locale, "dashOffersTab")}
        </button>
        <button
          type="button"
          onClick={() => writeNav({ tab: "support" })}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            tab === "support"
              ? "bg-primary text-on-primary"
              : "bg-input text-muted"
          }`}
        >
          {t(locale, "dashSupportTab")}
        </button>
      </div>

      {tab === "offers" ? (
        <OffersInbox />
      ) : (
        <SupportInbox
          ticketId={ticketId}
          onSelectTicket={(id) => writeNav({ tab: "support", ticket: id })}
        />
      )}
    </div>
  );
}

export default function DashboardMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded bg-input" />
          <div className="h-20 animate-pulse rounded-[16px] bg-input" />
        </div>
      }
    >
      <DashboardMessagesInner />
    </Suspense>
  );
}

function OffersInbox() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const { user } = useAuth();
  const [items, setItems] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidderPhoneByMessage, setBidderPhoneByMessage] = useState<
    Record<string, string>
  >({});
  const [contactLoadingId, setContactLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      setLoading(true);
      try {
        const data = await api.get<{ items: InboxMessage[] }>("/messages/inbox");
        setItems(data.items ?? []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : t(locale, "dashFailed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [user, locale]);

  async function markRead(message: InboxMessage) {
    const unread = message.isRead !== true && message.read !== true;
    if (!unread) return;
    try {
      await api.patch(`/messages/${message.id}/read`);
      setItems((list) =>
        list.map((item) =>
          item.id === message.id ? { ...item, isRead: true, read: true } : item,
        ),
      );
    } catch {
      // Mark-read is best-effort.
    }
  }

  async function loadBidderPhone(message: InboxMessage) {
    if (!message.carId || bidderPhoneByMessage[message.id]) return;
    setContactLoadingId(message.id);
    try {
      const data = await api.get<{
        items: Array<{
          id?: string;
          amount?: number;
          bidderId?: string;
          bidderPhone?: string;
        }>;
      }>(`/cars/${encodeURIComponent(message.carId)}/bids`);
      const amount = Number(message.bidAmount ?? message.amount ?? 0);
      const bidId = typeof message.bidId === "string" ? message.bidId : "";
      const fromUserId =
        typeof message.fromUserId === "string" ? message.fromUserId : "";
      const match =
        (bidId
          ? data.items?.find((bid) => String(bid.id ?? "") === bidId)
          : undefined) ??
        data.items?.find((bid) => {
          const sameBidder =
            fromUserId && String(bid.bidderId ?? "") === fromUserId;
          const sameAmount = amount > 0 && Number(bid.amount ?? 0) === amount;
          return Boolean(sameBidder && sameAmount);
        });
      const phone = String(match?.bidderPhone ?? "").trim();
      if (phone) {
        setBidderPhoneByMessage((prev) => ({ ...prev, [message.id]: phone }));
      }
    } catch {
      // Owner-only phone lookup is best-effort.
    } finally {
      setContactLoadingId((cur) => (cur === message.id ? null : cur));
    }
  }

  return (
    <div>
      {error ? (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-[16px] bg-input" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
          <p className="font-semibold">{t(locale, "dashEmptyMessages")}</p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "dashEmptyMessagesHint")}
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((message) => {
            const unread = message.isRead !== true && message.read !== true;
            const amount = Number(message.bidAmount ?? message.amount ?? 0);
            const phone = bidderPhoneByMessage[message.id];
            const showSellerActions = Boolean(message.carId) && isBidOffer(message);
            return (
              <li key={message.id}>
                <div className="rounded-[16px] bg-card p-4 ring-1 ring-outline transition hover:ring-primary/40">
                  {message.carId ? (
                    <Link
                      href={`/cars/${message.carId}`}
                      onClick={() => void markRead(message)}
                      className="block"
                    >
                      <MessageBody
                        message={message}
                        unread={unread}
                        amount={amount}
                        locale={locale}
                      />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void markRead(message)}
                      className="block w-full text-start"
                    >
                      <MessageBody
                        message={message}
                        unread={unread}
                        amount={amount}
                        locale={locale}
                      />
                    </button>
                  )}
                  {showSellerActions ? (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-outline pt-3">
                      {phone ? (
                        <>
                          <a
                            href={telHref(phone)}
                            className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold"
                          >
                            {t(locale, "phoneCall")}
                          </a>
                          <a
                            href={whatsappHref(phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold"
                          >
                            {t(locale, "whatsapp")}
                          </a>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={contactLoadingId === message.id}
                          onClick={() => void loadBidderPhone(message)}
                          className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-60"
                        >
                          {contactLoadingId === message.id
                            ? t(locale, "loading")
                            : t(locale, "dashOfferContact")}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SupportInbox({
  ticketId,
  onSelectTicket,
}: {
  ticketId: string;
  onSelectTicket: (id: string | null) => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compose, setCompose] = useState(false);
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const threadGen = useRef(0);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ items: SupportTicket[] }>("/tickets/mine");
      setTickets(d.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "dashFailed"));
    } finally {
      setLoading(false);
    }
  }, [locale]);

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
        setCompose(false);
        setThreadLoading(true);
      }
      try {
        const d = await api.get<{ items: TicketMessage[] }>(
          `/tickets/${ticket.id}/messages`,
        );
        if (gen !== threadGen.current) return;
        setMessages(d.items ?? []);
      } catch (e) {
        if (gen !== threadGen.current) return;
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
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId || compose) {
      if (!ticketId) {
        setSelected(null);
        setMessages([]);
      }
      return;
    }
    const fromList = tickets.find((row) => row.id === ticketId);
    void openTicket(fromList ?? { id: ticketId, status: "open" });
  }, [ticketId, compose, openTicket]);

  useEffect(() => {
    if (!ticketId) return;
    setSelected((cur) => {
      const fromList = tickets.find((row) => row.id === ticketId);
      return fromList ?? cur;
    });
  }, [tickets, ticketId]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!ticketId || compose) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void openTicket({ id: ticketId }, { silent: true });
    };
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [ticketId, compose, openTicket]);

  async function createTicket() {
    const subj = subject.trim();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      const created = await api.post<{ id: string }>("/tickets", {
        subject: subj || undefined,
        text: body,
      });
      setSubject("");
      setText("");
      setCompose(false);
      await loadTickets();
      if (created.id) onSelectTicket(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "replyFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/tickets/${selected.id}/messages`, {
        text: reply.trim(),
      });
      setReply("");
      await openTicket(selected, { silent: true });
      await loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "replyFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted">{t(locale, "dashSupportSubtitle")}</p>
        <button
          type="button"
          onClick={() => {
            setCompose(true);
            onSelectTicket(null);
          }}
          className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary"
        >
          {t(locale, "dashNewTicket")}
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {compose ? (
        <form
          className="mt-6 space-y-3 rounded-[16px] bg-card p-4 ring-1 ring-outline"
          onSubmit={(e) => {
            e.preventDefault();
            void createTicket();
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">
              {t(locale, "dashTicketSubject")}
            </span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t(locale, "dashTicketSubjectPlaceholder")}
              className="w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">
              {t(locale, "dashTicketMessage")}
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 4000))}
              placeholder={t(locale, "dashTicketMessagePlaceholder")}
              rows={5}
              required
              className="w-full resize-none rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
            >
              {t(locale, "send")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCompose(false);
                onSelectTicket(null);
              }}
              className="rounded-[var(--radius-control)] bg-input px-4 py-2 text-xs font-semibold"
            >
              {t(locale, "dashCancel")}
            </button>
          </div>
        </form>
      ) : null}

      {selected && !compose ? (
        <div className="mt-6 rounded-[16px] bg-card p-4 ring-1 ring-outline">
          <button
            type="button"
            className="text-xs font-semibold text-primary"
            onClick={() => onSelectTicket(null)}
          >
            {t(locale, "dashBackToTickets")}
          </button>
          <p className="mt-2 font-semibold">
            {selected.subject || t(locale, "supportTicketFallback")}
          </p>
          <p className="text-xs text-muted">
            {selected.status === "resolved"
              ? t(locale, "ticketStatusResolved")
              : t(locale, "ticketStatusOpen")}
          </p>
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
            ) : (
              messages.map((m) => {
                const fromUser = !m.isAdmin;
                return (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      fromUser
                        ? "ml-auto bg-primary text-on-primary"
                        : "bg-input"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        fromUser ? "text-on-primary/80" : "text-muted"
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
        </div>
      ) : !compose ? (
        loading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-[16px] bg-input"
              />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="mt-10 rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
            <p className="font-semibold">{t(locale, "dashSupportEmpty")}</p>
            <p className="mt-1 text-sm text-muted">
              {t(locale, "dashSupportEmptyHint")}
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => onSelectTicket(ticket.id)}
                  className="block w-full rounded-[16px] bg-card p-4 text-start ring-1 ring-outline hover:ring-primary/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {ticket.subject || t(locale, "supportTicketFallback")}
                    </p>
                    {ticket.lastMessageIsAdmin && ticket.status !== "resolved" ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        {t(locale, "dashUnread")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">
                    {ticket.lastMessage || "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatAdminWhen(ticket.lastMessageAt || ticket.updatedAt) ||
                      "—"}
                    {" · "}
                    {ticket.status === "resolved"
                      ? t(locale, "ticketStatusResolved")
                      : t(locale, "ticketStatusOpen")}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function MessageBody({
  message,
  unread,
  amount,
  locale,
}: {
  message: InboxMessage;
  unread: boolean;
  amount: number;
  locale: Locale;
}) {
  const bid = isBidOffer(message);
  const sender =
    (typeof message.senderName === "string" && message.senderName.trim()) ||
    t(locale, "dashBidder");
  const carTitle = offerCarTitle(message, locale);
  const money =
    amount > 0 ? formatMoney(amount, message.currencyKey) : "";

  return (
    <div className="flex items-start gap-3">
      {unread ? (
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
      ) : (
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-outline" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{sender}</p>
          {unread ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              {t(locale, "dashUnread")}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted" dir="auto">
          {t(locale, "dashOfferOn", { car: carTitle })}
          {money ? ` · ${money}` : ""}
        </p>
        {!bid && message.messageBody ? (
          <p className="mt-1 line-clamp-2 text-sm">
            {String(message.messageBody)}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted">
          {formatDashboardWhen(message.timestamp ?? message.createdAt, locale)}
        </p>
      </div>
    </div>
  );
}
