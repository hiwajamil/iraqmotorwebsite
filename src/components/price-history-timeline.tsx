"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  formatMoney,
  parseEventTime,
  type PriceHistoryEvent,
} from "@/lib/car-pricing-trust";
import { t, type Locale } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export function PriceHistoryTimeline({
  carId,
  locale: localeProp,
}: {
  carId: string;
  locale?: Locale;
}) {
  const storeLocale = useAppSelector((s) => s.preferences.locale);
  const locale = localeProp ?? storeLocale;
  const [items, setItems] = useState<PriceHistoryEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!carId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.get<{ items: PriceHistoryEvent[] }>(
          `/cars/${carId}/price-history`,
          { limit: "50" },
        );
        if (!cancelled) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          setError(e instanceof Error ? e.message : t(locale, "noPriceHistory"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [carId, locale]);

  return (
    <section className="rounded-[16px] bg-card p-4 ring-1 ring-outline/60">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {t(locale, "priceHistory")}
      </h2>
      {items == null ? (
        <div className="mt-4 space-y-3">
          <div className="h-10 animate-pulse rounded-lg bg-input" />
          <div className="h-10 animate-pulse rounded-lg bg-input" />
        </div>
      ) : error && items.length === 0 ? (
        <p className="mt-3 text-xs text-muted">{t(locale, "noPriceHistory")}</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-xs text-muted">{t(locale, "noPriceHistory")}</p>
      ) : (
        <ol className="relative mt-4 space-y-0">
          {items.map((event, index) => {
            const at = parseEventTime(event.at);
            const currency = event.toCurrencyKey || "iqd";
            const to = formatMoney(event.toPriceValue, currency);
            const from =
              event.fromPriceValue != null
                ? formatMoney(event.fromPriceValue, event.fromCurrencyKey || currency)
                : null;
            const delta = event.deltaValue;
            const down = delta != null && delta < 0;
            const up = delta != null && delta > 0;
            const accent = down
              ? "bg-teal-600 text-white"
              : up
                ? "bg-red-500/90 text-white"
                : "bg-primary-fill text-on-primary";

            return (
              <li key={event.id || `${index}-${to}`} className="flex gap-3">
                <div className="flex w-7 flex-col items-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${accent}`}
                  >
                    {down ? "↓" : up ? "↑" : "•"}
                  </span>
                  {index < items.length - 1 ? (
                    <span className="my-1 w-px flex-1 bg-outline/50" />
                  ) : null}
                </div>
                <div className={`min-w-0 flex-1 ${index < items.length - 1 ? "pb-5" : ""}`}>
                  <p className="text-sm font-semibold text-foreground">
                    {from
                      ? t(locale, "changedTo", { price: to })
                      : t(locale, "listedAt", { price: to })}
                  </p>
                  {from ? (
                    <p className="text-xs text-muted line-through">{from}</p>
                  ) : null}
                  {at ? (
                    <p className="mt-1 text-[11px] text-muted">
                      {at.toLocaleDateString()}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
