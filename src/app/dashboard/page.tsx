"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CarCard } from "@/components/car-card";
import { useAuth } from "@/components/auth-provider";
import { api, type Car } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchFavorites } from "@/store/slices/favoritesSlice";

function statusBadge(status?: string) {
  const s = (status || "draft").toLowerCase();
  const styles: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    draft: "bg-input text-muted",
    rejected: "bg-red-500/15 text-red-600",
    sold: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    expired: "bg-input text-muted",
  };
  return styles[s] || styles.draft;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const favorites = useAppSelector((s) => s.favorites.items);
  const favLoading = useAppSelector((s) => s.favorites.loading);
  const [tab, setTab] = useState<"ads" | "favorites">("ads");
  const [ads, setAds] = useState<Car[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?next=/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      setAdsLoading(true);
      try {
        const mine = await api.get<{ items: Car[] }>("/cars/mine");
        setAds(mine.items ?? []);
        await dispatch(fetchFavorites()).unwrap();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setAdsLoading(false);
      }
    })();
  }, [user, dispatch]);

  if (loading || !user) {
    return <p className="px-[4%] pt-28 text-center text-muted">Loading…</p>;
  }

  const list = tab === "ads" ? ads : favorites;
  const listLoading = tab === "ads" ? adsLoading : favLoading;

  return (
    <div className="mx-auto max-w-[1400px] px-[4%] pb-16 pt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account</h1>
          <p className="text-sm text-muted">Your listings and saved cars</p>
        </div>
        <Link
          href="/sell"
          className="rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
        >
          New listing
        </Link>
      </div>

      <div className="mt-6 flex gap-2">
        {(
          [
            ["ads", "My ads"],
            ["favorites", "Wishlist"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-[12px] px-4 py-2 text-sm font-semibold ${
              tab === key ? "bg-primary text-on-primary" : "bg-input"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {listLoading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-[16px] bg-input"
            />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-10 rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
          <p className="font-semibold">
            {tab === "ads" ? "No listings yet" : "Wishlist is empty"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {tab === "ads"
              ? "Create a listing to sell your car on Iraq Motors."
              : "Save cars while browsing to find them here later."}
          </p>
          <Link
            href={tab === "ads" ? "/sell" : "/cars"}
            className="mt-5 inline-block rounded-[12px] bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
          >
            {tab === "ads" ? "Create listing" : "Browse cars"}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((car) => (
            <div key={car.id} className="relative">
              {tab === "ads" ? (
                <span
                  className={`absolute start-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur ${statusBadge(car.status)}`}
                >
                  {car.status || "draft"}
                </span>
              ) : null}
              <CarCard car={car} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
