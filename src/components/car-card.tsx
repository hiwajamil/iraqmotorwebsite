"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Car } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { ListingQuickActions } from "@/components/listing-quick-actions";
import {
  formatAskPrice,
  formatMoney,
  isPriceDropped,
  soldDisplayPrice,
} from "@/lib/car-pricing-trust";
import { formatCarTitle } from "@/lib/listing-display";
import {
  formatMileageLabel,
  listingFeatureKeys,
  localizeCity,
  localizeOption,
  normalizeOptionKey,
  stringField,
} from "@/lib/listing-labels";
import { t, type Locale } from "@/lib/i18n";

const HIGHLIGHT_MAX = 4;
const HIGHLIGHT_MIN = 3;
const HIGHLIGHT_INTERVAL_MS = 3000;
const FULL_OPTION_MIN_FEATURES = 8;
const FEATURE_LABEL_MAX_LEN = 22;
const FEATURE_HIGHLIGHT_PRIORITY = [
  "feature_sunroof",
  "feature_panoramic_roof",
  "feature_apple_carplay",
  "feature_rear_camera",
  "feature_smart_key",
  "feature_cruise_control",
  "feature_radar",
  "feature_awd",
  "feature_xenon_light",
  "feature_wireless_charger",
  "feature_seat_heater",
  "feature_abs",
];

export function carTitle(car: Car, locale: Locale = "en") {
  return formatCarTitle(car, locale);
}

function conditionKeyOf(car: Car): string {
  return normalizeOptionKey(stringField(car, "conditionKey", "condition"));
}

function isNewCondition(key: string): boolean {
  return key === "condition_new" || key === "new" || key === "brand_new";
}

function isCleanTitleCondition(key: string): boolean {
  return key === "condition_clean_title" || key === "clean_title";
}

function isLowMileage(car: Car): boolean {
  const amount = Number(car.mileageValue);
  if (!Number.isFinite(amount) || amount < 0) return false;
  const unit = String(car.mileageUnit ?? "km").toLowerCase();
  return amount <= (unit.includes("mi") ? 10000 : 15000);
}

function featureHighlightLabels(car: Car, locale: Locale): string[] {
  const keys = listingFeatureKeys(car).map(normalizeOptionKey);
  if (!keys.length) return [];
  const set = new Set(keys);
  const ordered = [
    ...FEATURE_HIGHLIGHT_PRIORITY.filter((key) => set.has(key)),
    ...keys.filter((key) => !FEATURE_HIGHLIGHT_PRIORITY.includes(key)),
  ];
  const labels: string[] = [];
  for (const key of ordered) {
    const label = localizeOption(locale, key).trim();
    if (!label || label.length > FEATURE_LABEL_MAX_LEN) continue;
    if (labels.includes(label)) continue;
    labels.push(label);
    if (labels.length >= 2) break;
  }
  return labels;
}

export function carHighlightStrings(car: Car, locale: Locale): string[] {
  const items: string[] = [];
  const add = (value: string) => {
    const next = value.trim();
    if (!next || items.includes(next) || items.length >= HIGHLIGHT_MAX) return;
    items.push(next);
  };

  const sold = car.status === "sold";
  const condition = conditionKeyOf(car);
  const features = listingFeatureKeys(car);

  if (!sold && isPriceDropped(car.priceMeta)) add(t(locale, "priceDropped"));
  if (isNewCondition(condition)) add(t(locale, "newCars"));
  else if (isLowMileage(car)) add(t(locale, "lowMileage"));
  for (const label of featureHighlightLabels(car, locale)) add(label);
  if (isCleanTitleCondition(condition)) add(t(locale, "cleanTitle"));
  if (features.length >= FULL_OPTION_MIN_FEATURES) add(t(locale, "fullOption"));
  if (String(car.sellerShowroom ?? "").trim()) add(t(locale, "trustedSeller"));
  if (car.vin?.verifiedStatus === "admin_verified") {
    add(t(locale, "verifiedListing"));
  }

  const fallbacks = [
    "cleanTitle",
    "fullOption",
    "trustedSeller",
    "greatDeal",
  ] as const;
  for (const key of fallbacks) {
    if (items.length >= HIGHLIGHT_MIN) break;
    add(t(locale, key));
  }

  return items.slice(0, HIGHLIGHT_MAX);
}

function HighlightCarousel({
  items,
  compact = false,
}: {
  items: string[];
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const height = compact ? 22 : 24;

  useEffect(() => {
    setIndex(0);
    if (items.length < 2) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const tick = () => {
      if (mq.matches) return;
      setIndex((current) => (current + 1) % items.length);
    };
    const id = window.setInterval(tick, HIGHLIGHT_INTERVAL_MS);
    const onChange = () => {
      if (mq.matches) {
        window.clearInterval(id);
        setIndex(0);
      }
    };
    mq.addEventListener("change", onChange);
    return () => {
      window.clearInterval(id);
      mq.removeEventListener("change", onChange);
    };
  }, [items]);

  if (!items.length) {
    return <div className="mt-1 w-full shrink-0" style={{ height }} />;
  }

  return (
    <div
      className="relative mt-1 w-full shrink-0 overflow-hidden rounded-full bg-primary/10"
      style={{ height }}
    >
      {items.map((text, i) => (
        <span
          key={text}
          className={`absolute inset-0 flex min-w-0 items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap font-medium text-primary transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
            compact ? "px-2 text-[10px]" : "px-2.5 text-[11px]"
          } ${
            i === index
              ? "translate-y-0 opacity-100"
              : "translate-y-1.5 opacity-0"
          }`}
          aria-hidden={i !== index}
          dir="auto"
        >
          {text}
        </span>
      ))}
    </div>
  );
}

export function CarCard({
  car,
  compact = false,
}: {
  car: Car;
  compact?: boolean;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const image =
    car.imageUrl ||
    (Array.isArray(car.imageUrls) && car.imageUrls[0]) ||
    "/placeholder-car.svg";
  const sold = car.status === "sold";
  const priceDropped = !sold && isPriceDropped(car.priceMeta);
  const bidAmount =
    car.highestBid != null && Number(car.highestBid) > 0
      ? Number(car.highestBid)
      : null;
  const bidLabel =
    bidAmount != null ? formatMoney(bidAmount, car.currencyKey) : null;
  const displayPrice = sold ? soldDisplayPrice(car) : formatAskPrice(car);
  const city =
    localizeCity(locale, String(car.city || car.province || "")) ||
    t(locale, "iraq");
  const mileage = formatMileageLabel(locale, car.mileageValue, car.mileageUnit);
  const title = carTitle(car, locale) || t(locale, "carListing");
  const highlights = useMemo(
    () => carHighlightStrings(car, locale),
    [car, locale],
  );

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-xl bg-[var(--color-card-low,#f8fafc)] ring-1 ring-outline/40 transition duration-300 hover:-translate-y-0.5 hover:ring-primary/30 dark:bg-card ${
        compact ? "min-w-[272px] max-w-[272px]" : ""
      }`}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-t-xl bg-input">
        <Link href={`/cars/${car.id}`} className="absolute inset-0 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={String(image)}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.04]"
          />
        </Link>
        {sold ? (
          <span className="absolute start-2 top-2 z-[1] inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
            {t(locale, "sold")}
          </span>
        ) : priceDropped ? (
          <span className="absolute start-2 top-2 z-[1] inline-flex items-center gap-1 rounded-full bg-teal-700/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur">
            <span aria-hidden>↓</span> {t(locale, "priceDropped")}
          </span>
        ) : null}
        <ListingQuickActions car={car} title={title} />
      </div>
      <Link
        href={`/cars/${car.id}`}
        className={`flex flex-1 flex-col ${compact ? "gap-1 p-2" : "gap-1.5 p-3"}`}
      >
        <h3
          className={`font-bold leading-snug text-foreground ${
            compact ? "line-clamp-1 text-[13px]" : "line-clamp-2 text-sm md:text-base"
          }`}
          dir="auto"
        >
          {title}
        </h3>
        <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted md:text-xs">
          <span dir="auto">{city}</span>
          {mileage ? (
            <span dir="ltr" className="[unicode-bidi:isolate]">
              {mileage}
            </span>
          ) : null}
        </p>
        <p
          className={`mt-auto text-sm font-bold md:text-lg ${
            sold ? "text-foreground" : "text-primary"
          }`}
          dir="auto"
        >
          {sold ? t(locale, "soldFor", { price: displayPrice }) : displayPrice}
        </p>
        {!sold && bidLabel ? (
          <p
            className="text-[11px] font-medium text-red-600 dark:text-red-400"
            dir="auto"
          >
            {t(locale, "latestBid", { amount: bidLabel })}
          </p>
        ) : null}
        <HighlightCarousel items={highlights} compact={compact} />
      </Link>
    </article>
  );
}
