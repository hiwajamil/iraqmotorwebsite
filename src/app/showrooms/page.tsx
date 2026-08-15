"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { HOME_CITIES } from "@/lib/home-data";

type Showroom = {
  uid?: string;
  id?: string;
  showroomName?: string;
  displayName?: string;
  phone?: string;
  city?: string;
};

export default function ShowroomsPage() {
  const [items, setItems] = useState<Showroom[]>([]);
  const [city, setCity] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const d = await api.get<{ items: Showroom[] }>(
            "/showrooms",
            city ? { city } : undefined,
          );
          if (!cancelled) {
            setItems(d.items ?? []);
            setError(null);
          }
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Failed to load showrooms");
            setItems([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, city ? 300 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [city]);

  return (
    <div className="mx-auto max-w-[1400px] px-[4%] pb-16 pt-24">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        Showrooms
      </h1>
      <p className="mt-1 text-sm text-muted">Dealers across Iraq</p>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {HOME_CITIES.map((c) => {
          // Match against English city names commonly stored on profiles.
          const value = c.key ? c.en : "";
          const active = (!city && !c.key) || city === value;
          return (
            <button
              key={c.key ?? "all"}
              type="button"
              onClick={() => {
                setCity(value);
                setCityInput(value);
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-primary text-on-primary"
                  : "bg-card ring-1 ring-outline"
              }`}
            >
              {c.en}
            </button>
          );
        })}
      </div>

      <input
        value={cityInput}
        onChange={(e) => {
          setCityInput(e.target.value);
          setCity(e.target.value.trim());
        }}
        placeholder="Filter by city"
        className="mt-4 w-full max-w-sm rounded-[12px] bg-input px-4 py-3.5 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
      />

      {error ? (
        <p className="mt-4 text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-[16px] bg-input"
            />
          ))}
        </div>
      ) : !error && items.length === 0 ? (
        <div className="mt-10 rounded-[16px] bg-card p-8 text-center ring-1 ring-outline">
          <p className="font-semibold">No dealers found</p>
          <p className="mt-1 text-sm text-muted">
            {city
              ? "Try another city or clear the filter."
              : "Showrooms will appear here when dealers join IQ Motors."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => {
            const id = s.uid || s.id || "";
            return (
              <div
                key={id}
                className="rounded-[16px] bg-card p-5 ring-1 ring-outline transition hover:ring-primary/30"
              >
                <h2 className="font-semibold">
                  {s.showroomName || s.displayName || "Showroom"}
                </h2>
                <p className="mt-1 text-sm text-muted">{s.city || "—"}</p>
                <p className="mt-1 text-sm">{s.phone || ""}</p>
                {id ? (
                  <Link
                    href={`/cars?sellerId=${id}`}
                    className="mt-3 inline-block text-sm font-semibold text-primary"
                  >
                    View listings
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
