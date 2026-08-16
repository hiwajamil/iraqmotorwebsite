"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Car } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleFavorite } from "@/store/slices/favoritesSlice";
import {
  formatAskPrice,
  formatMoney,
  isPriceDropped,
  soldDisplayPrice,
} from "@/lib/car-pricing-trust";
import { formatCarTitle } from "@/lib/listing-display";
import { formatMileageLabel, localizeCity } from "@/lib/listing-labels";
import { t } from "@/lib/i18n";

export function carTitle(car: Car) {
  return formatCarTitle(car);
}

export function CarCard({
  car,
  compact = false,
}: {
  car: Car;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.preferences.locale);
  const isFavorite = useAppSelector((s) => s.favorites.ids.includes(car.id));
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
    bidAmount != null
      ? formatMoney(bidAmount, car.currencyKey)
      : null;
  const displayPrice = sold ? soldDisplayPrice(car) : formatAskPrice(car);
  const city =
    localizeCity(locale, String(car.city || car.province || "")) ||
    t(locale, "iraq");
  const mileage = formatMileageLabel(locale, car.mileageValue, car.mileageUnit);
  const title = carTitle(car) || t(locale, "carListing");

  async function onFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/auth?next=${encodeURIComponent(`/cars/${car.id}`)}`);
      return;
    }
    try {
      await dispatch(toggleFavorite(car.id)).unwrap();
    } catch {
      // Favorite toggle is best-effort on cards.
    }
  }

  return (
    <Link
      href={`/cars/${car.id}`}
      className={`group flex h-full flex-col overflow-hidden rounded-[16px] bg-[var(--color-card-low,#f8fafc)] ring-1 ring-outline/40 transition duration-300 hover:-translate-y-0.5 hover:ring-primary/30 dark:bg-card ${
        compact ? "min-w-[272px] max-w-[272px]" : ""
      }`}
    >
      <div
        className={`relative overflow-hidden bg-input ${
          compact ? "aspect-[4/3]" : "aspect-[16/10]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={String(image)}
          alt={title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        {sold ? (
          <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
            {t(locale, "sold")}
          </span>
        ) : priceDropped ? (
          <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-teal-700/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur">
            <span aria-hidden>↓</span> {t(locale, "priceDropped")}
          </span>
        ) : null}
        <button
          type="button"
          onClick={(e) => void onFavorite(e)}
          aria-label={
            isFavorite
              ? t(locale, "removeFromFavorites")
              : t(locale, "addToFavorites")
          }
          className={`absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface/85 text-sm backdrop-blur transition hover:scale-105 ${
            isFavorite ? "text-primary" : "text-foreground"
          }`}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "gap-1 p-2" : "gap-1.5 p-3"}`}>
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
        {!sold ? (
          <p
            className={`text-[11px] ${
              bidLabel
                ? "font-medium text-red-600 dark:text-red-400"
                : "text-muted"
            }`}
            dir="auto"
          >
            {bidLabel
              ? t(locale, "latestBid", { amount: bidLabel })
              : t(locale, "noBids")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
