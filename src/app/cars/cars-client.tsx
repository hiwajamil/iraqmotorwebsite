"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdGridTile, AdHomeBanner } from "@/components/ad-placements";
import { AdvancedSearchFilter } from "@/components/advanced-search-filter";
import { BrowseBrands } from "@/components/browse-brands";
import { CarCard } from "@/components/car-card";
import { Pagination, hrefWithPage } from "@/components/pagination";
import { useAdViewport } from "@/hooks/use-ad-viewport";
import { useAdvertise } from "@/hooks/use-advertise";
import {
  interleaveAdsInGrid,
  pickHomeBannerAd,
} from "@/lib/ads";
import { api, type Car, type CarsListResponse, type CarsPagination } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { t } from "@/lib/i18n";
import {
  CARS_PAGE_SIZE,
  parseSearchFilters,
  searchFiltersActive,
  serializeSearchFilters,
  toCarsApiParams,
} from "@/lib/search-filters";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setBrandId, setQuery } from "@/store/slices/filtersSlice";

type SortKey = "newest" | "price_asc" | "price_desc";

export default function CarsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sellerIdParam = searchParams.get("sellerId") || "";
  const brandParam = searchParams.get("brandId");
  const statusParam = searchParams.get("status") || "";
  const sortParam = (searchParams.get("sort") as SortKey) || "newest";
  const pageParam = Math.max(
    1,
    Math.trunc(Number(searchParams.get("page") || "1")) || 1,
  );
  const queryKey = searchParams.toString();
  const filters = useMemo(
    () => parseSearchFilters(new URLSearchParams(queryKey)),
    [queryKey],
  );
  const dispatch = useAppDispatch();
  const brandId = useAppSelector((s) => s.filters.brandId) ?? "";
  const locale = useAppSelector((s) => s.preferences.locale);
  const viewport = useAdViewport();
  const { ads } = useAdvertise({
    langCode: locale,
    locationId: filters.city,
    listSize: CARS_PAGE_SIZE,
  });
  const bannerAd = useMemo(() => pickHomeBannerAd(ads), [ads]);
  const [sort, setSort] = useState<SortKey>(
    ["newest", "price_asc", "price_desc"].includes(sortParam)
      ? sortParam
      : "newest",
  );
  const [cars, setCars] = useState<Car[]>([]);
  const [pagination, setPagination] = useState<CarsPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gridItems = useMemo(
    () => interleaveAdsInGrid(cars, ads),
    [cars, ads],
  );

  // Sync URL → Redux on mount / URL change
  useEffect(() => {
    dispatch(setBrandId(brandParam || null));
    dispatch(setQuery(filters.q));
    if (["newest", "price_asc", "price_desc"].includes(sortParam)) {
      setSort(sortParam as SortKey);
    }
  }, [brandParam, filters.q, sortParam, dispatch]);

  function extras() {
    return {
      brandId: brandId || null,
      sort,
      sellerId: sellerIdParam || null,
      status: statusParam || null,
    };
  }

  function writeUrl(next: { brandId?: string | null; sort?: SortKey }) {
    const qs = serializeSearchFilters(filters, {
      ...extras(),
      brandId: next.brandId !== undefined ? next.brandId : brandId || null,
      sort: next.sort ?? sort,
    });
    router.replace(qs ? `/cars?${qs}` : "/cars", { scroll: false });
  }

  const buildPageHref = useCallback(
    (page: number) => hrefWithPage("/cars", queryKey, page),
    [queryKey],
  );

  const loadSeq = useRef(0);
  const lastSearchQ = useRef(filters.q);

  const loadPage = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<CarsListResponse>("/cars", {
        limit: String(CARS_PAGE_SIZE),
        ...toCarsApiParams(filters, { ...extras(), page: pageParam }),
      });
      if (seq !== loadSeq.current) return;
      const items = data.data ?? data.items ?? [];
      const nextPagination: CarsPagination = data.pagination ?? {
        totalItems: items.length,
        totalPages: items.length ? 1 : 0,
        currentPage: pageParam,
        limit: CARS_PAGE_SIZE,
      };
      setCars(items);
      setPagination(nextPagination);
      if (
        nextPagination.totalPages > 0 &&
        pageParam > nextPagination.totalPages
      ) {
        router.replace(hrefWithPage("/cars", queryKey, nextPagination.totalPages), {
          scroll: false,
        });
      }
      if (filters.q.trim()) {
        trackEvent("search", {
          search_term: filters.q.trim(),
          item_brand: brandId || undefined,
          item_category: filters.city || undefined,
        });
      }
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setError(e instanceof Error ? e.message : t(locale, "carsLoadFailed"));
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [filters, brandId, sellerIdParam, statusParam, sort, locale, pageParam, queryKey, router]);

  useEffect(() => {
    const qChanged = lastSearchQ.current !== filters.q;
    lastSearchQ.current = filters.q;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (!cancelled) void loadPage();
    }, qChanged && filters.q ? 280 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [loadPage, filters.q]);

  const hasFilters = Boolean(
    brandId || sellerIdParam || searchFiltersActive(filters),
  );

  function clearFilters() {
    dispatch(setBrandId(null));
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
          {t(locale, "browse")}
        </h1>
        <p className="mt-1 text-muted">
          {t(locale, "carsPageSubtitle")}
          {sellerIdParam ? ` · ${t(locale, "carsFilteredBySeller")}` : ""}
        </p>
      </div>

      <div className="mb-6">
        <BrowseBrands
          onBrandChange={(next) => writeUrl({ brandId: next })}
        />
      </div>

      <div className="mb-6">
        <AdvancedSearchFilter
          variant="results"
          initial={filters}
          extras={{
            brandId: brandId || null,
            sort,
            sellerId: sellerIdParam || null,
            status: statusParam || null,
          }}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={sort}
          onChange={(e) => {
            const next = e.target.value as SortKey;
            setSort(next);
            writeUrl({ sort: next });
          }}
          className="rounded-[12px] bg-input px-4 py-3.5 text-sm font-semibold outline-none ring-1 ring-outline/60 focus:ring-primary"
          aria-label={t(locale, "sort")}
        >
          <option value="newest">{t(locale, "sortNewest")}</option>
          <option value="price_asc">{t(locale, "sortPriceAsc")}</option>
          <option value="price_desc">{t(locale, "sortPriceDesc")}</option>
        </select>
        <Link
          href="/sell"
          className="inline-flex items-center justify-center rounded-[12px] bg-primary-fill px-5 py-3.5 text-sm font-semibold text-on-primary"
        >
          {t(locale, "sellYourCar")}
        </Link>
      </div>

      {hasFilters ? (
        <button
          type="button"
          onClick={clearFilters}
          className="mt-3 text-sm font-semibold text-primary-strong"
        >
          {t(locale, "clearFilters")}
        </button>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/5] animate-pulse rounded-xl bg-input"
            />
          ))}
        </div>
      ) : error ? (
        <p className="mt-12 text-center text-red-600" role="alert">
          {error}
        </p>
      ) : cars.length === 0 ? (
        <div className="mt-12 rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
          <p className="font-semibold">{t(locale, "carsEmptyTitle")}</p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "carsEmptyHint")}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-semibold text-primary-strong"
            >
              {t(locale, "clearFilters")}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-6">
            <AdHomeBanner ad={bannerAd} viewport={viewport} locale={locale} />
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <Pagination
            currentPage={pagination?.currentPage ?? pageParam}
            totalPages={pagination?.totalPages ?? 0}
            buildHref={buildPageHref}
            previousLabel={t(locale, "paginationPrevious")}
            nextLabel={t(locale, "paginationNext")}
            navLabel={t(locale, "paginationNav")}
            pageLabel={(page) => t(locale, "paginationPage", { page })}
          />
        </>
      )}
    </div>
  );
}
