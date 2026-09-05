"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { colorSwatch } from "@/lib/listing-form-options";
import { localizeCity, localizeOption } from "@/lib/listing-labels";
import { t, type Locale } from "@/lib/i18n";
import {
  BODY_TYPE_FILTERS,
  COLOR_FILTERS,
  CONDITION_FILTER_OPTIONS,
  FILTER_YEAR_MAX,
  FILTER_YEAR_MIN,
  FUEL_TYPE_FILTERS,
  SEARCH_CITIES,
  SEAT_FILTER_OPTIONS,
  SELLER_TYPE_OPTIONS,
  emptySearchFilters,
  searchFiltersActive,
  serializeSearchFilters,
  type SearchFilterExtras,
  type SearchFilterState,
} from "@/lib/search-filters";
import { useAppSelector } from "@/store/hooks";

const CONTROL =
  "h-12 w-full min-w-0 rounded-lg text-sm font-medium outline-none";

function triggerClass(active: boolean) {
  return `inline-flex ${CONTROL} items-center justify-between gap-2 px-3 text-start ring-1 transition ${
    active
      ? "bg-primary/10 text-primary-strong ring-primary"
      : "bg-input text-foreground ring-outline/70 hover:ring-primary/40"
  }`;
}

function FilterMenu({
  label,
  summary,
  active,
  panelClassName,
  onReset,
  children,
}: {
  label: string;
  summary?: string;
  active: boolean;
  panelClassName?: string;
  onReset: () => void;
  children: ReactNode;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  return (
    <Popover className="relative h-12 w-full min-w-0">
      <PopoverButton type="button" className={triggerClass(active)}>
        <span className="truncate">{summary || label}</span>
        <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        transition
        className={`z-[70] origin-top rounded-xl bg-white p-3 shadow-lg ring-1 ring-outline/80 transition data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-card ${
          panelClassName ?? "w-72"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-semibold text-muted hover:text-primary-strong"
          >
            {t(locale, "filterReset")}
          </button>
        </div>
        {children}
        <PopoverButton
          type="button"
          className="mt-3 w-full rounded-lg bg-primary-fill py-2 text-sm font-semibold text-on-primary hover:brightness-110"
        >
          {t(locale, "filterDone")}
        </PopoverButton>
      </PopoverPanel>
    </Popover>
  );
}

function NumberPair({
  from,
  to,
  fromPlaceholder,
  toPlaceholder,
  min,
  max,
  onFrom,
  onTo,
  locale,
}: {
  from: number | null;
  to: number | null;
  fromPlaceholder: string;
  toPlaceholder: string;
  min?: number;
  max?: number;
  onFrom: (value: number | null) => void;
  onTo: (value: number | null) => void;
  locale: Locale;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block">
        <span className="mb-1 block text-xs text-muted">
          {t(locale, "filterFrom")}
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={from ?? ""}
          placeholder={fromPlaceholder}
          onChange={(e) => {
            const raw = e.target.value;
            const n = Number(raw);
            onFrom(raw === "" || !Number.isFinite(n) ? null : n);
          }}
          className="h-12 w-full rounded-lg bg-input px-3 text-sm outline-none ring-1 ring-outline/70 focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted">
          {t(locale, "filterTo")}
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={to ?? ""}
          placeholder={toPlaceholder}
          onChange={(e) => {
            const raw = e.target.value;
            const n = Number(raw);
            onTo(raw === "" || !Number.isFinite(n) ? null : n);
          }}
          className="h-12 w-full rounded-lg bg-input px-3 text-sm outline-none ring-1 ring-outline/70 focus:ring-2 focus:ring-primary"
        />
      </label>
    </div>
  );
}

function pillClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
    active
      ? "bg-primary-fill text-on-primary ring-primary"
      : "bg-input text-foreground ring-outline/70 hover:ring-primary/40"
  }`;
}

export function AdvancedSearchFilter({
  variant = "home",
  initial,
  extras,
}: {
  variant?: "home" | "results";
  initial?: SearchFilterState;
  extras?: SearchFilterExtras;
}) {
  const router = useRouter();
  const locale = useAppSelector((s) => s.preferences.locale);
  const brandId = useAppSelector((s) => s.filters.brandId);
  const [draft, setDraft] = useState<SearchFilterState>(
    () => initial ?? emptySearchFilters(),
  );
  const [cityQuery, setCityQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (initial) setDraft(initial);
  }, [initial]);

  const cities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    return SEARCH_CITIES.filter((key) => {
      const label = localizeCity(locale, key);
      if (!q) return true;
      return (
        key.includes(q) ||
        label.toLowerCase().includes(q) ||
        localizeCity("en", key).toLowerCase().includes(q)
      );
    });
  }, [cityQuery, locale]);

  const yearActive = draft.minYear != null || draft.maxYear != null;
  const priceActive = draft.minPrice != null || draft.maxPrice != null;
  const mileageActive = draft.minMileage != null || draft.maxMileage != null;
  const moreActive = Boolean(draft.condition || draft.sellerType);
  const hasFilters = searchFiltersActive(draft);

  const yearSummary = yearActive
    ? `${draft.minYear ?? FILTER_YEAR_MIN} – ${draft.maxYear ?? FILTER_YEAR_MAX}`
    : t(locale, "filterModelYear");

  const priceSummary = priceActive
    ? `${(draft.minPrice ?? 0).toLocaleString()} – ${(draft.maxPrice ?? "∞").toLocaleString()} ${draft.currency}`
    : t(locale, "filterPriceRange", { currency: draft.currency });

  const mileageSummary = mileageActive
    ? `${(draft.minMileage ?? 0).toLocaleString()} – ${(draft.maxMileage ?? "∞").toLocaleString()} ${
        draft.mileageUnit === "mi"
          ? t(locale, "filterMileageMiles")
          : t(locale, "filterMileageKm")
      }`
    : t(locale, "filterMileageRange");

  const seatsSummary = draft.seats.length
    ? draft.seats
        .map((n) =>
          n >= 10 ? t(locale, "filterSeaterPlus") : t(locale, "filterSeater", { count: n }),
        )
        .join(", ")
    : t(locale, "filterSeats");

  const bodySummary = draft.bodyTypes.length
    ? draft.bodyTypes
        .map((id) => {
          const opt = BODY_TYPE_FILTERS.find((item) => item.id === id);
          return opt ? t(locale, opt.labelKey) : id;
        })
        .join(", ")
    : t(locale, "filterBodyTypes");

  const fuelSummary = draft.fuelTypes.length
    ? draft.fuelTypes
        .map((id) => {
          const opt = FUEL_TYPE_FILTERS.find((item) => item.id === id);
          return opt ? localizeOption(locale, opt.optionKey) : id;
        })
        .join(", ")
    : t(locale, "filterFuelType");

  const colorSummary = draft.colors.length
    ? draft.colors
        .map((id) => {
          const opt = COLOR_FILTERS.find((item) => item.id === id);
          return opt ? localizeOption(locale, opt.optionKey) : id;
        })
        .join(", ")
    : t(locale, "filterColor");

  function patch(partial: Partial<SearchFilterState>) {
    setDraft((prev) => ({ ...prev, ...partial }));
  }

  function resolvedExtras(): SearchFilterExtras {
    return {
      brandId: extras?.brandId ?? (variant === "home" ? brandId : null),
      sort: extras?.sort,
      sellerId: extras?.sellerId,
      status: extras?.status,
    };
  }

  function applySearch(next = draft) {
    const qs = serializeSearchFilters(next, resolvedExtras());
    const href = qs ? `/cars?${qs}` : "/cars";
    if (variant === "home") router.push(href);
    else router.replace(href, { scroll: false });
  }

  function clearAll() {
    const empty = emptySearchFilters();
    setDraft(empty);
    setCityQuery("");
    if (variant === "results") applySearch(empty);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        applySearch();
      }}
      className="overflow-visible rounded-xl bg-white p-4 shadow-md dark:bg-card dark:ring-1 dark:ring-outline/60"
    >
      <div className="grid auto-rows-[3rem] grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <div className="col-span-1 min-w-0 lg:col-span-2">
            <FilterMenu
              label={t(locale, "filterSelectCity")}
              summary={
                draft.city
                  ? localizeCity(locale, draft.city)
                  : t(locale, "filterSelectCity")
              }
              active={Boolean(draft.city)}
              onReset={() => {
                patch({ city: null });
                setCityQuery("");
              }}
            >
              <input
                value={cityQuery}
                onChange={(e) => setCityQuery(e.target.value)}
                placeholder={t(locale, "filterSearchCities")}
                className="mb-2 h-12 w-full rounded-lg bg-input px-3 text-sm outline-none ring-1 ring-outline/70 focus:ring-2 focus:ring-primary"
              />
              <div className="max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => patch({ city: null })}
                  className={`mb-1 w-full rounded-lg px-3 py-2 text-start text-sm ${
                    !draft.city
                      ? "bg-primary/10 font-semibold text-primary-strong"
                      : "hover:bg-input"
                  }`}
                >
                  {t(locale, "filterAllCities")}
                </button>
                {cities.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted">
                    {t(locale, "filterNoCities")}
                  </p>
                ) : (
                  cities.map((key) => {
                    const selected = draft.city === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => patch({ city: key })}
                        className={`w-full rounded-lg px-3 py-2 text-start text-sm ${
                          selected
                            ? "bg-primary/10 font-semibold text-primary-strong"
                            : "hover:bg-input"
                        }`}
                      >
                        {localizeCity(locale, key)}
                      </button>
                    );
                  })
                )}
              </div>
            </FilterMenu>
          </div>

        <div className="col-span-1 min-w-0 lg:col-span-2">
            <FilterMenu
              label={t(locale, "filterModelYear")}
              summary={yearSummary}
              active={yearActive}
              onReset={() => patch({ minYear: null, maxYear: null })}
            >
              <NumberPair
                locale={locale}
                from={draft.minYear}
                to={draft.maxYear}
                fromPlaceholder={String(FILTER_YEAR_MIN)}
                toPlaceholder={String(FILTER_YEAR_MAX)}
                min={FILTER_YEAR_MIN}
                max={FILTER_YEAR_MAX}
                onFrom={(value) => patch({ minYear: value })}
                onTo={(value) => patch({ maxYear: value })}
              />
            </FilterMenu>
          </div>

        <div className="relative col-span-1 min-w-0 lg:col-span-6">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            value={draft.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder={t(locale, "filterSearchMakeModel")}
            className={`${CONTROL} bg-input ps-10 pe-3 ring-1 ring-outline/70 focus:ring-2 focus:ring-primary`}
          />
        </div>

        <div className="col-span-1 min-w-0 lg:col-span-2">
          <button
            type="submit"
            className={`inline-flex ${CONTROL} items-center justify-center gap-2 bg-primary-fill font-semibold text-on-primary shadow-sm hover:brightness-110`}
          >
            <Search className="size-4 shrink-0" aria-hidden />
            {t(locale, "filterSearch")}
          </button>
        </div>
        <div className="col-span-1 min-w-0 lg:col-span-2">
            <FilterMenu
              label={t(locale, "filterPriceRange", { currency: draft.currency })}
              summary={priceSummary}
              active={priceActive}
              onReset={() =>
                patch({ minPrice: null, maxPrice: null, currency: "IQD" })
              }
            >
              <div className="mb-3 flex h-12 rounded-lg bg-input p-1 ring-1 ring-outline/60">
                {(["USD", "IQD"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => patch({ currency: code })}
                    className={`flex-1 rounded-md text-xs font-semibold ${
                      draft.currency === code
                        ? "bg-primary-fill text-on-primary"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {code === "USD"
                      ? t(locale, "filterCurrencyUsd")
                      : t(locale, "filterCurrencyIqd")}
                  </button>
                ))}
              </div>
              <NumberPair
                locale={locale}
                from={draft.minPrice}
                to={draft.maxPrice}
                fromPlaceholder="0"
                toPlaceholder="100000"
                min={0}
                onFrom={(value) => patch({ minPrice: value })}
                onTo={(value) => patch({ maxPrice: value })}
              />
            </FilterMenu>
          </div>

          <div className="col-span-1 min-w-0 lg:col-span-2">
            <FilterMenu
              label={t(locale, "filterMileageRange")}
              summary={mileageSummary}
              active={mileageActive}
              onReset={() =>
                patch({ minMileage: null, maxMileage: null, mileageUnit: "km" })
              }
            >
              <div className="mb-3 flex h-12 rounded-lg bg-input p-1 ring-1 ring-outline/60">
                {(["km", "mi"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => patch({ mileageUnit: unit })}
                    className={`flex-1 rounded-md text-xs font-semibold ${
                      draft.mileageUnit === unit
                        ? "bg-primary-fill text-on-primary"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {unit === "km"
                      ? t(locale, "filterMileageKm")
                      : t(locale, "filterMileageMiles")}
                  </button>
                ))}
              </div>
              <NumberPair
                locale={locale}
                from={draft.minMileage}
                to={draft.maxMileage}
                fromPlaceholder="0"
                toPlaceholder="200000"
                min={0}
                onFrom={(value) => patch({ minMileage: value })}
                onTo={(value) => patch({ maxMileage: value })}
              />
            </FilterMenu>
          </div>

          <div className="col-span-1 min-w-0 lg:col-span-2">
            <FilterMenu
              label={t(locale, "filterFuelType")}
              summary={fuelSummary}
              active={draft.fuelTypes.length > 0}
              onReset={() => patch({ fuelTypes: [] })}
            >
              <div className="grid grid-cols-2 gap-2">
                {FUEL_TYPE_FILTERS.map((item) => {
                  const selected = draft.fuelTypes.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        patch({
                          fuelTypes: selected
                            ? draft.fuelTypes.filter((id) => id !== item.id)
                            : [...draft.fuelTypes, item.id],
                        })
                      }
                      className={pillClass(selected)}
                    >
                      {localizeOption(locale, item.optionKey)}
                    </button>
                  );
                })}
              </div>
            </FilterMenu>
          </div>

          <div className="col-span-1 min-w-0 lg:col-span-2">
            <FilterMenu
              label={t(locale, "filterColor")}
              summary={colorSummary}
              active={draft.colors.length > 0}
              onReset={() => patch({ colors: [] })}
            >
              <div className="grid grid-cols-2 gap-2">
                {COLOR_FILTERS.map((item) => {
                  const selected = draft.colors.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        patch({
                          colors: selected
                            ? draft.colors.filter((id) => id !== item.id)
                            : [...draft.colors, item.id],
                        })
                      }
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-start text-xs font-semibold ring-1 transition ${
                        selected
                          ? "bg-primary/10 text-primary-strong ring-primary"
                          : "bg-input text-foreground ring-outline/70 hover:bg-white hover:ring-primary/30 dark:hover:bg-white/5"
                      }`}
                    >
                      <span
                        className="size-4 shrink-0 rounded-full ring-1 ring-black/15"
                        style={{ backgroundColor: colorSwatch(item.optionKey) }}
                        aria-hidden
                      />
                      {localizeOption(locale, item.optionKey)}
                    </button>
                  );
                })}
              </div>
            </FilterMenu>
          </div>

          <div className="col-span-1 min-w-0 lg:col-span-2">
            <FilterMenu
              label={t(locale, "filterSeats")}
              summary={seatsSummary}
              active={draft.seats.length > 0}
              onReset={() => patch({ seats: [] })}
            >
              <div className="grid grid-cols-2 gap-2">
                {SEAT_FILTER_OPTIONS.map((count) => {
                  const selected = draft.seats.includes(count);
                  const label =
                    count >= 10
                      ? t(locale, "filterSeaterPlus")
                      : t(locale, "filterSeater", { count });
                  return (
                    <button
                      key={count}
                      type="button"
                      onClick={() =>
                        patch({
                          seats: selected
                            ? draft.seats.filter((n) => n !== count)
                            : [...draft.seats, count].sort((a, b) => a - b),
                        })
                      }
                      className={pillClass(selected)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </FilterMenu>
          </div>

          <div className="col-span-1 min-w-0 lg:col-span-2">
            <FilterMenu
              label={t(locale, "filterBodyTypes")}
              summary={bodySummary}
              active={draft.bodyTypes.length > 0}
              panelClassName="w-[24rem] max-w-[calc(100vw-2rem)]"
              onReset={() => patch({ bodyTypes: [] })}
            >
              <div className="grid grid-cols-2 gap-2">
                {BODY_TYPE_FILTERS.map((item) => {
                  const selected = draft.bodyTypes.includes(item.id);
                  const label = t(locale, item.labelKey);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        patch({
                          bodyTypes: selected
                            ? draft.bodyTypes.filter((id) => id !== item.id)
                            : [...draft.bodyTypes, item.id],
                        })
                      }
                      className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition ${
                        selected
                          ? "bg-primary/10 ring-1 ring-primary"
                          : "hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <Image
                        src={item.image}
                        alt={label}
                        width={80}
                        height={40}
                        className="h-10 w-20 object-contain"
                      />
                      <span
                        className={`text-xs font-semibold ${
                          selected ? "text-primary-strong" : "text-foreground"
                        }`}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FilterMenu>
          </div>

        <div className="col-span-1 min-w-0 lg:col-span-2">
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={triggerClass(moreActive)}
          >
            <span className="inline-flex min-w-0 items-center gap-2 truncate">
              <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
              {t(locale, "filterMore")}
            </span>
            <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
          </button>
        </div>

        <div className="col-span-1 min-w-0 lg:col-span-2">
          <button
            type="button"
            onClick={clearAll}
            disabled={!hasFilters}
            className={`inline-flex ${CONTROL} items-center justify-center text-muted ring-1 ring-outline/70 transition hover:text-primary-strong hover:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {t(locale, "filterClearAll")}
          </button>
        </div>
      </div>

      <Dialog open={moreOpen} onClose={setMoreOpen} className="relative z-[60]">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/40 transition data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl ring-1 ring-outline/70 transition data-[closed]:scale-95 data-[closed]:opacity-0 dark:bg-card"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <DialogTitle className="text-lg font-bold">
                {t(locale, "filterMore")}
              </DialogTitle>
              <button
                type="button"
                onClick={() =>
                  patch({ condition: "", sellerType: "" })
                }
                className="text-xs font-semibold text-muted hover:text-primary-strong"
              >
                {t(locale, "filterReset")}
              </button>
            </div>

            <fieldset className="mb-5">
              <legend className="mb-2 text-sm font-semibold">
                {t(locale, "filterCarCondition")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {CONDITION_FILTER_OPTIONS.map((item) => {
                  const selected = draft.condition === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        patch({ condition: selected ? "" : item.id })
                      }
                      className={pillClass(selected)}
                    >
                      {t(locale, item.labelKey)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="mb-6">
              <legend className="mb-2 text-sm font-semibold">
                {t(locale, "filterSellerType")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {SELLER_TYPE_OPTIONS.map((item) => {
                  const selected = draft.sellerType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        patch({ sellerType: selected ? "" : item.id })
                      }
                      className={pillClass(selected)}
                    >
                      {t(locale, item.labelKey)}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="w-full rounded-lg bg-primary-fill py-2.5 text-sm font-semibold text-on-primary hover:brightness-110"
            >
              {t(locale, "filterDone")}
            </button>
          </DialogPanel>
        </div>
      </Dialog>
    </form>
  );
}
