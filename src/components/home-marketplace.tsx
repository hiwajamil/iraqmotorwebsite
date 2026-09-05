"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdGridTile, AdHomeBanner } from "@/components/ad-placements";
import { AdvancedSearchFilter } from "@/components/advanced-search-filter";
import { BrowseBrands } from "@/components/browse-brands";
import { CarCard } from "@/components/car-card";
import { ApiStatus } from "@/components/api-status";
import { useAdViewport } from "@/hooks/use-ad-viewport";
import { useAdvertise } from "@/hooks/use-advertise";
import { interleaveAdsInGrid, pickHomeBannerAd } from "@/lib/ads";
import { api, type Car } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const HOME_CARS_QUERY = { status: "active", limit: "24" } as const;

export function HomeMarketplace({
  initialCars,
  loadError = false,
}: {
  initialCars: Car[];
  loadError?: boolean;
}) {
  const router = useRouter();
  const locale = useAppSelector((s) => s.preferences.locale);
  const [cars, setCars] = useState<Car[]>(initialCars);
  const [failed, setFailed] = useState(loadError);
  const [loading, setLoading] = useState(false);
  const viewport = useAdViewport();
  const { ads: bannerAds } = useAdvertise({
    langCode: locale,
    slot: "home_banner",
    listSize: 4,
  });
  const { ads: gridAds } = useAdvertise({
    langCode: locale,
    slot: "grid_tile",
    listSize: 12,
  });
  const bannerAd = useMemo(() => pickHomeBannerAd(bannerAds), [bannerAds]);
  const gridItems = useMemo(
    () => interleaveAdsInGrid(cars, gridAds),
    [cars, gridAds],
  );

  async function retryCars() {
    setLoading(true);
    try {
      const data = await api.get<{ items: Car[] }>("/cars", {
        ...HOME_CARS_QUERY,
      });
      setCars(data.items ?? []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section className="relative isolate min-h-[32vh] w-full overflow-hidden md:min-h-[600px]">
        <Image
          src="/hero_bg.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[var(--surface)]"
          aria-hidden
        />
        <div className="relative mx-auto flex min-h-[32vh] max-w-[1400px] flex-col items-center justify-center px-[4%] pb-16 pt-28 text-center md:min-h-[600px] md:pb-24 md:pt-32">
          <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.4)] md:text-6xl md:leading-[1.1] md:tracking-[-0.04em]">
            {t(locale, "heroTitle")}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/70 md:mt-5 md:text-xl">
            {t(locale, "heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/cars"
              className="rounded-[12px] bg-primary-fill px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary/25 transition hover:brightness-110"
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
        <div className="mb-8 pt-4 md:-mt-2 md:mb-10 md:pt-2">
          <AdHomeBanner ad={bannerAd} viewport={viewport} locale={locale} />
        </div>

        <BrowseBrands
          onBrandChange={(next) => {
            router.push(next ? `/cars?brandId=${encodeURIComponent(next)}` : "/cars");
          }}
        />

        <div className="py-6">
          <AdvancedSearchFilter variant="home" />
        </div>

        <section className="pb-16 pt-4">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold md:text-2xl">
              {t(locale, "latestListings")}
            </h2>
            <Link href="/cars" className="text-sm font-semibold text-primary-strong">
              {t(locale, "viewAll")}
            </Link>
          </div>
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] animate-pulse rounded-xl bg-input"
                />
              ))}
            </div>
          ) : failed ? (
            <div className="rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
              <p className="text-muted">{t(locale, "carsLoadFailed")}</p>
              <button
                type="button"
                onClick={() => void retryCars()}
                className="mt-4 inline-block text-sm font-semibold text-primary-strong"
              >
                {t(locale, "retry")}
              </button>
            </div>
          ) : cars.length === 0 ? (
            <div className="rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
              <p className="text-muted">{t(locale, "carsEmptyHint")}</p>
              <Link
                href="/cars"
                className="mt-4 inline-block text-sm font-semibold text-primary-strong"
              >
                {t(locale, "viewAll")}
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
