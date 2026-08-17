"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CarCard } from "@/components/car-card";
import { useAuth } from "@/components/auth-provider";
import { api, type Car } from "@/lib/api";
import { listingStatusClass } from "@/lib/dashboard";
import { useAppSelector } from "@/store/hooks";
import { t, listingStatusLabel } from "@/lib/i18n";

export default function DashboardListingsPage() {
  const { user } = useAuth();
  const locale = useAppSelector((s) => s.preferences.locale);
  const [ads, setAds] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const mine = await api.get<{ items: Car[] }>("/cars/mine");
      setAds(mine.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "dashFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function markSold(id: string) {
    if (!window.confirm(t(locale, "dashMarkSoldConfirm"))) return;
    setBusyId(id);
    try {
      await api.patch(`/cars/${id}/status`, { status: "sold" });
      setAds((list) =>
        list.map((car) => (car.id === id ? { ...car, status: "sold" } : car)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "dashFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t(locale, "dashDeleteConfirm"))) return;
    setBusyId(id);
    try {
      await api.delete(`/cars/${id}`);
      setAds((list) => list.filter((car) => car.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "dashFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t(locale, "dashListings")}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "dashEmptyListingsHint")}
          </p>
        </div>
        <Link
          href="/sell"
          className="rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
        >
          {t(locale, "dashNewListing")}
        </Link>
      </div>

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
              className="aspect-[4/5] animate-pulse rounded-[16px] bg-input"
            />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="mt-10 rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
          <p className="font-semibold">{t(locale, "dashEmptyListings")}</p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "dashEmptyListingsHint")}
          </p>
          <Link
            href="/sell"
            className="mt-5 inline-block rounded-[12px] bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
          >
            {t(locale, "dashCreateListing")}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {ads.map((car) => {
            const status = (car.status || "draft").toLowerCase();
            const canSell = status === "active" || status === "pending";
            return (
              <div key={car.id} className="relative">
                <span
                  className={`absolute start-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur ${listingStatusClass(car.status)}`}
                >
                  {listingStatusLabel(locale, car.status)}
                </span>
                <CarCard car={car} />
                <div className="mt-2 flex gap-2">
                  {canSell ? (
                    <button
                      type="button"
                      disabled={busyId === car.id}
                      onClick={() => void markSold(car.id)}
                      className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-60"
                    >
                      {t(locale, "dashMarkSold")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === car.id}
                    onClick={() => void remove(car.id)}
                    className="rounded-[12px] px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-60"
                  >
                    {t(locale, "dashDelete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
