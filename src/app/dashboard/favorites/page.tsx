"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CarCard } from "@/components/car-card";
import { useAuth } from "@/components/auth-provider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchFavorites } from "@/store/slices/favoritesSlice";
import { t } from "@/lib/i18n";

export default function DashboardFavoritesPage() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.preferences.locale);
  const favorites = useAppSelector((s) => s.favorites.items);
  const loading = useAppSelector((s) => s.favorites.loading);
  const error = useAppSelector((s) => s.favorites.error);

  useEffect(() => {
    if (!user) return;
    void dispatch(fetchFavorites());
  }, [user, dispatch]);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">
        {t(locale, "dashFavorites")}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {t(locale, "dashEmptyFavoritesHint")}
      </p>

      {error ? (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-xl bg-input"
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
            className="mt-5 inline-block rounded-[12px] bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
          >
            {t(locale, "dashBrowseCars")}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}
