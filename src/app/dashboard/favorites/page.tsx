"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CarCard, carTitle } from "@/components/car-card";
import { useAuth } from "@/components/auth-provider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchFavorites } from "@/store/slices/favoritesSlice";
import type { Car } from "@/lib/api";
import { t } from "@/lib/i18n";

function isWishlistLive(status?: string) {
  const s = (status || "").toLowerCase();
  return s === "active" || s === "sold";
}

export default function DashboardFavoritesPage() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.preferences.locale);
  const favorites = useAppSelector((s) => s.favorites.items);
  const total = useAppSelector((s) => s.favorites.total);
  const loading = useAppSelector((s) => s.favorites.loading);
  const error = useAppSelector((s) => s.favorites.error);

  useEffect(() => {
    if (!user) return;
    void dispatch(fetchFavorites());
  }, [user, dispatch]);

  const count = total || favorites.length;
  const showingCapped = !loading && favorites.length > 0 && count > favorites.length;

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        {t(locale, "dashFavorites")}
      </h1>
      {!loading && favorites.length > 0 ? (
        <p className="mt-1 text-sm text-muted">
          {showingCapped
            ? t(locale, "dashFavoritesShowing", {
                shown: favorites.length,
                total: count,
              })
            : t(locale, "dashFavoritesCount", { count })}
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.5rem),1fr))] gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] max-w-sm animate-pulse rounded-xl bg-input"
            />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="mt-10 rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
          <p className="font-semibold">{t(locale, "dashEmptyFavorites")}</p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "dashEmptyFavoritesHint")}
          </p>
          <Link
            href="/cars"
            className="mt-5 inline-block rounded-[12px] bg-primary-fill px-5 py-2.5 text-sm font-semibold text-on-primary"
          >
            {t(locale, "dashBrowseCars")}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.5rem),1fr))] gap-5">
          {favorites.map((car) => (
            <div key={car.id} className="min-w-0 max-w-sm">
              {isWishlistLive(car.status) ? (
                <CarCard car={car} />
              ) : (
                <UnavailableFavorite car={car} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnavailableFavorite({ car }: { car: Car }) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const title = carTitle(car, locale) || t(locale, "carListing");
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl bg-card p-4 ring-1 ring-outline">
      <p className="line-clamp-2 text-sm font-semibold text-foreground" dir="auto">
        {title}
      </p>
      <p className="mt-2 text-xs text-muted">
        {t(locale, "dashFavoriteUnavailable")}
      </p>
    </article>
  );
}
