"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { api, type InboxMessage } from "@/lib/api";
import { formatDashboardWhen } from "@/lib/dashboard";
import { formatMoney } from "@/lib/car-pricing-trust";
import { useAppSelector } from "@/store/hooks";
import { t } from "@/lib/i18n";

export default function DashboardMessagesPage() {
  const { user } = useAuth();
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function openMessage(message: InboxMessage) {
    const unread = message.isRead !== true && message.read !== true;
    if (unread) {
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
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        {t(locale, "dashMessages")}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {t(locale, "dashEmptyMessagesHint")}
      </p>

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
            const carName = message.carName || t(locale, "carListing");
            const body = message.carId ? (
              <Link
                href={`/cars/${message.carId}`}
                onClick={() => void openMessage(message)}
                className="block rounded-[16px] bg-card p-4 ring-1 ring-outline transition hover:ring-primary/40"
              >
                <MessageBody
                  message={message}
                  unread={unread}
                  amount={amount}
                  carName={carName}
                  locale={locale}
                />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void openMessage(message)}
                className="block w-full rounded-[16px] bg-card p-4 text-start ring-1 ring-outline"
              >
                <MessageBody
                  message={message}
                  unread={unread}
                  amount={amount}
                  carName={carName}
                  locale={locale}
                />
              </button>
            );
            return <li key={message.id}>{body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}

function MessageBody({
  message,
  unread,
  amount,
  carName,
  locale,
}: {
  message: InboxMessage;
  unread: boolean;
  amount: number;
  carName: string;
  locale: "en" | "ar" | "ku";
}) {
  return (
    <div className="flex items-start gap-3">
      {unread ? (
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
      ) : (
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-outline" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">
            {message.senderName || t(locale, "sellerDefault")}
          </p>
          {unread ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              {t(locale, "dashUnread")}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {t(locale, "dashOfferOn", { car: carName })}
          {amount > 0 ? ` · ${formatMoney(amount, message.currencyKey)}` : ""}
        </p>
        {message.messageBody ? (
          <p className="mt-1 line-clamp-2 text-sm">{String(message.messageBody)}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted">
          {formatDashboardWhen(message.timestamp ?? message.createdAt)}
        </p>
      </div>
    </div>
  );
}
