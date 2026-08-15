"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Car } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleFavorite } from "@/store/slices/favoritesSlice";
import {
  formatMoney,
  isPriceDropped,
  soldDisplayPrice,
} from "@/lib/car-pricing-trust";

function formatAskPrice(car: Car) {
  if (car.price && String(car.price).trim()) return String(car.price).trim();
  return formatMoney(car.priceValue, car.currencyKey);
}

export function carTitle(car: Car) {
  const make = (car.make as string) || car.brandId || "";
  const model = (car.model as string) || car.modelKey || "";
  const year = car.year ? String(car.year) : "";
  const trim = car.trim ? String(car.trim) : "";
  return [make, model, year, trim].filter(Boolean).join(" ");
}

function mileage(car: Car) {
  if (car.mileageValue == null) return null;
  return `${Number(car.mileageValue).toLocaleString()} km`;
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
  const isFavorite = useAppSelector((s) => s.favorites.ids.includes(car.id));
  const image =
    car.imageUrl ||
    (Array.isArray(car.imageUrls) && car.imageUrls[0]) ||
    "/placeholder-car.svg";
  const sold = car.status === "sold";
  const priceDropped = !sold && isPriceDropped(car.priceMeta);
  const bid =
    car.highestBid != null && Number(car.highestBid) > 0
      ? Number(car.highestBid).toLocaleString()
      : null;
  const displayPrice = sold ? soldDisplayPrice(car) : formatAskPrice(car);

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
          alt={carTitle(car)}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        {sold ? (
          <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur">
            Sold
          </span>
        ) : priceDropped ? (
          <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-teal-700/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur">
            <span aria-hidden>↓</span> Price dropped
          </span>
        ) : null}
        <button
          type="button"
          onClick={(e) => void onFavorite(e)}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className={`absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface/85 text-sm backdrop-blur transition hover:scale-105 ${
            isFavorite ? "text-primary" : "text-foreground"
          }`}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </div>
      <div className={`flex flex-1 flex-col ${compact ? "gap-1 p-2" : "gap-1.5 p-3"}`}>
        <h3
          className={`font-bold capitalize leading-snug text-foreground ${
            compact ? "line-clamp-1 text-[13px]" : "line-clamp-2 text-sm md:text-base"
          }`}
        >
          {carTitle(car) || "Car listing"}
        </h3>
        <p className="flex flex-wrap gap-x-3 text-[11px] text-muted md:text-xs">
          <span>{car.city || car.province || "Iraq"}</span>
          {mileage(car) ? <span>{mileage(car)}</span> : null}
        </p>
        <p
          className={`mt-auto text-sm font-bold md:text-lg ${
            sold ? "text-foreground" : "text-primary"
          }`}
        >
          {sold ? `Sold for ${displayPrice}` : displayPrice}
        </p>
        {!sold ? (
          <p
            className={`text-[11px] ${
              bid ? "font-medium text-red-600 dark:text-red-400" : "text-muted"
            }`}
          >
            {bid ? `Latest bid ${bid}` : "No bids yet"}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
