"use client";

import { useMemo } from "react";
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

const HIGHLIGHT_MAX = 3;
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

export type CarHighlightKind = "verified" | "showroom" | "feature";

export type CarHighlight = {
  id: string;
  label: string;
  kind: CarHighlightKind;
};

export function carHighlightItems(car: Car, locale: Locale): CarHighlight[] {
  const items: CarHighlight[] = [];
  const add = (id: string, label: string, kind: CarHighlightKind) => {
    const next = label.trim();
    if (!next || items.some((item) => item.label === next) || items.length >= HIGHLIGHT_MAX) {
      return;
    }
    items.push({ id, label: next, kind });
  };

  const condition = conditionKeyOf(car);
  const features = listingFeatureKeys(car);

  if (car.vin?.verifiedStatus === "admin_verified") {
    add("verified", t(locale, "verifiedListing"), "verified");
  }
  if (String(car.sellerShowroom ?? "").trim()) {
    add("showroom", t(locale, "trustedSeller"), "showroom");
  }
  if (isNewCondition(condition)) add("new", t(locale, "newCars"), "feature");
  else if (isLowMileage(car)) add("lowMileage", t(locale, "lowMileage"), "feature");
  if (isCleanTitleCondition(condition)) add("cleanTitle", t(locale, "cleanTitle"), "feature");
  if (features.length >= FULL_OPTION_MIN_FEATURES) {
    add("fullOption", t(locale, "fullOption"), "feature");
  }
  for (const [index, label] of featureHighlightLabels(car, locale).entries()) {
    add(`feature-${index}`, label, "feature");
  }

  return items;
}

export function carHighlightStrings(car: Car, locale: Locale): string[] {
  return carHighlightItems(car, locale).map((item) => item.label);
}

const CHIP_BASE =
  "inline-flex max-w-full shrink-0 items-center truncate rounded-full px-2 py-0.5 text-xs font-medium";

const CHIP_KIND: Record<CarHighlightKind, string> = {
  verified: "bg-sky-600/12 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200",
  showroom: "bg-input text-foreground ring-1 ring-outline",
  feature: "bg-input text-muted-strong",
};

function HighlightChips({ items }: { items: CarHighlight[] }) {
  if (!items.length) {
    return <div className="mt-1 min-h-6 w-full shrink-0" />;
  }

  return (
    <div className="mt-1 flex min-h-6 min-w-0 flex-wrap gap-1">
      {items.map((item) => (
        <span key={item.id} className={`${CHIP_BASE} ${CHIP_KIND[item.kind]}`} dir="auto">
          {item.label}
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
    () => carHighlightItems(car, locale),
    [car, locale],
  );

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-xl bg-card shadow-[0_1px_2px_rgb(15_23_42/0.06)] ring-1 ring-outline transition duration-200 hover:ring-primary/40 dark:shadow-none ${
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
            className="h-full w-full object-cover object-center"
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
        <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-strong">
          <span dir="auto">{city}</span>
          {mileage ? (
            <span dir="ltr" className="[unicode-bidi:isolate]">
              {mileage}
            </span>
          ) : null}
        </p>
        <p
          className="mt-auto text-sm font-bold text-foreground md:text-lg"
          dir="auto"
        >
          {sold ? t(locale, "soldFor", { price: displayPrice }) : displayPrice}
        </p>
        {!sold && bidLabel ? (
          <p className="text-[11px] font-medium text-muted" dir="auto">
            {t(locale, "latestBid", { amount: bidLabel })}
          </p>
        ) : null}
        <HighlightChips items={highlights} />
      </Link>
    </article>
  );
}
