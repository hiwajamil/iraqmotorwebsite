"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdGridTile, AdHomeBanner } from "@/components/ad-placements";
import { AdvancedSearchFilter } from "@/components/advanced-search-filter";
import { CarCard } from "@/components/car-card";
import { ApiStatus } from "@/components/api-status";
import { useAdViewport } from "@/hooks/use-ad-viewport";
import { useAdvertise } from "@/hooks/use-advertise";
import {
  interleaveAdsInGrid,
  pickHomeBannerAd,
} from "@/lib/ads";
import { api, type Car } from "@/lib/api";
import { HOME_STRIP_BRANDS } from "@/lib/home-data";
import { t } from "@/lib/i18n";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setBrandId } from "@/store/slices/filtersSlice";

export function HomeMarketplace({
  initialCars,
  recommended,
}: {
  initialCars: Car[];
  recommended: Car[];
}) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.preferences.locale);
  const brandId = useAppSelector((s) => s.filters.brandId);
  const city = useAppSelector((s) => s.filters.city);
  const [cars, setCars] = useState<Car[]>(initialCars);
  const [loading, setLoading] = useState(false);
  const viewport = useAdViewport();
  const { ads } = useAdvertise({
    langCode: locale,
    locationId: city,
    listSize: 12,
  });
  const bannerAd = useMemo(() => pickHomeBannerAd(ads), [ads]);
  const gridItems = useMemo(
    () => interleaveAdsInGrid(cars, ads),
    [cars, ads],
  );

  const hasFilters = Boolean(brandId);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        if (!hasFilters) {
          if (!cancelled) {
            setCars(initialCars);
            setLoading(false);
          }
          return;
        }
        if (!cancelled) setLoading(true);
        try {
          const data = await api.get<{ items: Car[] }>("/cars", {
            limit: "48",
            ...(brandId ? { brandId } : {}),
          });
          if (!cancelled) setCars(data.items ?? []);
        } catch {
          if (!cancelled) setCars(initialCars);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [brandId, hasFilters, initialCars]);

  const browseHref =
    brandId || city
      ? `/cars?${new URLSearchParams({
          ...(brandId ? { brandId } : {}),
          ...(city ? { city } : {}),
        }).toString()}`
      : "/cars";

  return (
    <div>
      <section className="relative isolate min-h-[42vh] w-full overflow-hidden md:min-h-[600px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero_bg.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-[var(--surface)]"
          aria-hidden
        />
        <div className="relative mx-auto flex min-h-[42vh] max-w-[1400px] flex-col items-center justify-center px-[4%] pb-16 pt-28 text-center md:min-h-[600px] md:pb-24 md:pt-32">
          <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.4)] md:text-6xl md:leading-[1.1] md:tracking-[-0.04em]">
            {t(locale, "heroTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/70 md:mt-5 md:text-xl">
            {t(locale, "heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/cars"
              className="rounded-[12px] bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary/25 transition hover:brightness-110"
            >
              {t(locale, "browseCars")}
            </Link>
            <Link
              href="/sell"
              className="rounded-[12px] bg-white/90 px-6 py-3 text-sm font-semibold text-on-surface backdrop-blur transition hover:bg-white"
            >
              {t(locale, "sellYourCar")}
            </Link>
          </div>
          <div className="mt-6">
            <ApiStatus />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-[4%]">
        <div className="mb-12 pt-4 md:-mt-2 md:mb-16 md:pt-2">
          <AdHomeBanner ad={bannerAd} viewport={viewport} locale={locale} />
        </div>

        <div className="pb-4">
          <h2 className="mb-4 text-lg font-bold text-foreground md:text-center md:text-xl">
            {t(locale, "browseBrands")}
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none md:flex-wrap md:justify-center md:overflow-visible md:pb-0">
            {HOME_STRIP_BRANDS.map((b) => {
              const selected = brandId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    dispatch(setBrandId(selected ? null : b.id))
                  }
                  className="flex w-[70px] shrink-0 flex-col items-center gap-2 md:w-[104px]"
                >
                  <span
                    className={`flex h-[70px] w-[70px] items-center justify-center rounded-full bg-white ring-2 transition md:h-[88px] md:w-[88px] ${
                      selected
                        ? "ring-primary shadow-[0_0_0_4px_rgba(234,88,12,0.2)]"
                        : "ring-outline/60 hover:ring-primary/40"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.logo}
                      alt={b.name}
                      className="h-[55%] w-[55%] object-contain"
                    />
                  </span>
                  <span
                    className={`text-[11px] font-semibold md:text-xs ${
                      selected ? "text-primary" : "text-muted"
                    }`}
                  >
                    {b.name}
                  </span>
                </button>
              );
            })}
            <Link
              href="/cars"
              className="flex w-[70px] shrink-0 flex-col items-center gap-2 md:w-[104px]"
            >
              <span className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-input text-sm font-bold text-primary ring-2 ring-outline/60 md:h-[88px] md:w-[88px]">
                +
              </span>
              <span className="text-[11px] font-semibold text-muted md:text-xs">
                {t(locale, "more")}
              </span>
            </Link>
          </div>
        </div>

        <div className="py-6">
          <AdvancedSearchFilter variant="home" />
        </div>

        {recommended.length > 0 && !hasFilters ? (
          <section className="py-8">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-xl font-bold md:text-2xl">
                {t(locale, "recommended")}
              </h2>
              <Link href="/cars" className="text-sm font-semibold text-primary">
                {t(locale, "viewAll")}
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {recommended.map((car) => (
                <CarCard key={car.id} car={car} compact />
              ))}
            </div>
          </section>
        ) : null}

        <section className="pb-16 pt-4">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold md:text-2xl">
              {t(locale, "availableListings")}
            </h2>
            <Link href={browseHref} className="text-sm font-semibold text-primary">
              {t(locale, "viewAll")}
            </Link>
          </div>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] animate-pulse rounded-[16px] bg-input"
                />
              ))}
            </div>
          ) : cars.length === 0 ? (
            <div className="rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
              <p className="text-muted">{t(locale, "homeEmptyFilters")}</p>
              <Link
                href="/cars"
                className="mt-4 inline-block text-sm font-semibold text-primary"
              >
                {t(locale, "viewAll")}
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {gridItems.map((item) =>
                item.kind === "car" ? (
                  <CarCard key={item.key} car={item.car} />
                ) : (
                  <div
                    key={item.key}
                    className={
                      viewport === "mobile" ? "col-span-full sm:col-span-2" : ""
                    }
                  >
                    <AdGridTile
                      ad={item.ad}
                      viewport={viewport}
                      locale={locale}
                    />
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
