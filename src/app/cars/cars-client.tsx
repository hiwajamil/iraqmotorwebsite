"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdGridTile, AdHomeBanner } from "@/components/ad-placements";
import { CarCard } from "@/components/car-card";
import { useAdViewport } from "@/hooks/use-ad-viewport";
import { useAdvertise } from "@/hooks/use-advertise";
import {
  interleaveAdsInGrid,
  pickHomeBannerAd,
} from "@/lib/ads";
import { api, type Car } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { HOME_CITIES, HOME_STRIP_BRANDS } from "@/lib/home-data";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setBrandId, setCity, setQuery } from "@/store/slices/filtersSlice";

type SortKey = "newest" | "price_asc" | "price_desc";

export default function CarsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sellerIdParam = searchParams.get("sellerId") || "";
  const brandParam = searchParams.get("brandId");
  const cityParam = searchParams.get("city");
  const qParam = searchParams.get("q");
  const statusParam = searchParams.get("status") || "";
  const sortParam = (searchParams.get("sort") as SortKey) || "newest";
  const dispatch = useAppDispatch();
  const brandId = useAppSelector((s) => s.filters.brandId) ?? "";
  const city = useAppSelector((s) => s.filters.city) ?? "";
  const q = useAppSelector((s) => s.filters.q);
  const locale = useAppSelector((s) => s.preferences.locale);
  const viewport = useAdViewport();
  const { ads } = useAdvertise({
    langCode: locale,
    locationId: city || null,
    listSize: 12,
  });
  const bannerAd = useMemo(() => pickHomeBannerAd(ads), [ads]);
  const [sort, setSort] = useState<SortKey>(
    ["newest", "price_asc", "price_desc"].includes(sortParam)
      ? sortParam
      : "newest",
  );
  const [cars, setCars] = useState<Car[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const gridItems = useMemo(
    () => interleaveAdsInGrid(cars, ads),
    [cars, ads],
  );

  // Sync URL → Redux on mount / URL change
  useEffect(() => {
    dispatch(setBrandId(brandParam || null));
    dispatch(setCity(cityParam || null));
    if (qParam != null) dispatch(setQuery(qParam));
    if (["newest", "price_asc", "price_desc"].includes(sortParam)) {
      setSort(sortParam as SortKey);
    }
  }, [brandParam, cityParam, qParam, sortParam, dispatch]);

  function writeUrl(next: {
    brandId?: string | null;
    city?: string | null;
    q?: string;
    sort?: SortKey;
  }) {
    const params = new URLSearchParams();
    const b = next.brandId !== undefined ? next.brandId : brandId || null;
    const c = next.city !== undefined ? next.city : city || null;
    const query = next.q !== undefined ? next.q : q;
    const s = next.sort ?? sort;
    if (b) params.set("brandId", b);
    if (c) params.set("city", c);
    if (query.trim()) params.set("q", query.trim());
    if (s && s !== "newest") params.set("sort", s);
    if (sellerIdParam) params.set("sellerId", sellerIdParam);
    if (statusParam) params.set("status", statusParam);
    const qs = params.toString();
    router.replace(qs ? `/cars?${qs}` : "/cars", { scroll: false });
  }

  const loadPage = useCallback(
    async (opts?: { append?: boolean; cursor?: string | null }) => {
      const append = Boolean(opts?.append);
      if (append) {
        setLoadingMore(true);
        setLoadMoreError(null);
      } else {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await api.get<{
          items: Car[];
          nextCursor?: string | null;
        }>("/cars", {
          limit: "24",
          sort,
          ...(q ? { q } : {}),
          ...(brandId ? { brandId } : {}),
          ...(city ? { plateCityKey: city } : {}),
          ...(sellerIdParam ? { sellerId: sellerIdParam } : {}),
          ...(statusParam ? { status: statusParam } : {}),
          ...(opts?.cursor ? { cursor: opts.cursor } : {}),
        });
        const items = data.items ?? [];
        setCars((prev) => (append ? [...prev, ...items] : items));
        setNextCursor(data.nextCursor ?? null);
        if (!append && q.trim()) {
          trackEvent("search", {
            search_term: q.trim(),
            item_brand: brandId || undefined,
            item_category: city || undefined,
          });
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to load cars from API";
        if (append) setLoadMoreError(msg);
        else setError(msg);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [q, brandId, city, sellerIdParam, statusParam, sort],
  );

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (!cancelled) void loadPage();
    }, q ? 280 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [loadPage, q]);

  const hasFilters = Boolean(brandId || city || q.trim() || sellerIdParam);

  function clearFilters() {
    dispatch(setBrandId(null));
    dispatch(setCity(null));
    dispatch(setQuery(""));
    setSort("newest");
    const params = new URLSearchParams();
    if (statusParam) params.set("status", statusParam);
    const qs = params.toString();
    router.replace(qs ? `/cars?${qs}` : "/cars", { scroll: false });
  }

  return (
    <div className="mx-auto max-w-[1400px] px-[4%] pb-16 pt-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          All Models
        </h1>
        <p className="mt-1 text-muted">
          Browse the full marketplace
          {sellerIdParam ? " · filtered by seller" : ""}
        </p>
      </div>

      <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            dispatch(setBrandId(null));
            writeUrl({ brandId: null });
          }}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
            !brandId
              ? "bg-primary text-on-primary"
              : "bg-card ring-1 ring-outline"
          }`}
        >
          All
        </button>
        {HOME_STRIP_BRANDS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              const next = brandId === b.id ? null : b.id;
              dispatch(setBrandId(next));
              writeUrl({ brandId: next });
            }}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${
              brandId === b.id
                ? "bg-primary text-on-primary"
                : "bg-card ring-1 ring-outline"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.logo}
              alt=""
              className="h-5 w-5 rounded-full bg-white object-contain p-0.5"
            />
            {b.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {HOME_CITIES.map((c) => {
          const selected = (city || null) === c.key;
          return (
            <button
              key={c.key ?? "all"}
              type="button"
              onClick={() => {
                dispatch(setCity(c.key));
                writeUrl({ city: c.key });
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                selected
                  ? "bg-primary text-on-primary"
                  : "bg-card ring-1 ring-outline"
              }`}
            >
              {c.en}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => {
            dispatch(setQuery(e.target.value));
            writeUrl({ q: e.target.value });
          }}
          placeholder="Search brand, model, city…"
          className="flex-1 rounded-[12px] bg-input px-4 py-3.5 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
        />
        <select
          value={sort}
          onChange={(e) => {
            const next = e.target.value as SortKey;
            setSort(next);
            writeUrl({ sort: next });
          }}
          className="rounded-[12px] bg-input px-4 py-3.5 text-sm font-semibold outline-none"
          aria-label="Sort"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
        <Link
          href="/sell"
          className="inline-flex items-center justify-center rounded-[12px] bg-primary px-5 py-3.5 text-sm font-semibold text-on-primary"
        >
          Sell your car
        </Link>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="mt-3 text-sm font-semibold text-primary"
        >
          Clear filters
        </button>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-[16px] bg-input"
            />
          ))}
        </div>
      ) : error ? (
        <p className="mt-12 text-center text-red-600" role="alert">
          {error}
        </p>
      ) : cars.length === 0 ? (
        <div className="mt-12 rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
          <p className="font-semibold">No cars match your filters</p>
          <p className="mt-1 text-sm text-muted">
            Try clearing filters or searching a different city.
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-semibold text-primary"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {bannerAd ? (
            <div className="mt-6">
              <AdHomeBanner ad={bannerAd} viewport={viewport} locale={locale} />
            </div>
          ) : null}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          {loadMoreError ? (
            <p className="mt-4 text-center text-sm text-red-600">{loadMoreError}</p>
          ) : null}
          {nextCursor ? (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() =>
                  void loadPage({ append: true, cursor: nextCursor })
                }
                className="rounded-[12px] bg-card px-5 py-3 text-sm font-semibold ring-1 ring-outline disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
