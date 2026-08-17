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
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { localizeCity } from "@/lib/listing-labels";
import { t, type Locale } from "@/lib/i18n";
import {
  BODY_TYPE_FILTERS,
  CONDITION_FILTER_OPTIONS,
  FILTER_YEAR_MAX,
  FILTER_YEAR_MIN,
  SEARCH_CITIES,
  SEAT_FILTER_OPTIONS,
  SELLER_TYPE_OPTIONS,
  emptySearchFilters,
  searchFiltersActive,
  serializeSearchFilters,
  type BodyTypeFilterId,
  type SearchFilterExtras,
  type SearchFilterState,
} from "@/lib/search-filters";
import { useAppSelector } from "@/store/hooks";

function triggerClass(active: boolean) {
  return `inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-start text-sm font-medium ring-1 transition ${
    active
      ? "bg-primary/10 text-primary ring-primary"
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
    <Popover className="relative min-w-0">
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
            className="text-xs font-semibold text-muted hover:text-primary"
          >
            {t(locale, "filterReset")}
          </button>
        </div>
        {children}
        <PopoverButton
          type="button"
          className="mt-3 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-on-primary hover:brightness-110"
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
          className="w-full rounded-lg bg-input px-3 py-2 text-sm outline-none ring-1 ring-outline/70 focus:ring-2 focus:ring-primary"
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
          className="w-full rounded-lg bg-input px-3 py-2 text-sm outline-none ring-1 ring-outline/70 focus:ring-2 focus:ring-primary"
        />
      </label>
    </div>
  );
}

function BodyTypeIcon({ id }: { id: BodyTypeFilterId }) {
  const common = {
    viewBox: "0 0 64 32",
    className: "h-8 w-14 text-current",
    fill: "currentColor",
    "aria-hidden": true as const,
  };
  switch (id) {
    case "SUV":
      return (
        <svg {...common}>
          <path d="M10 24h44l-2-8-8-6H22l-8 6-4 8zm8-8h6v4h-6zm22 0h8v4h-8zM14 24a4 4 0 1 0 0.01 0zm28 0a4 4 0 1 0 0.01 0z" />
        </svg>
      );
    case "Sedan":
      return (
        <svg {...common}>
          <path d="M8 24h48l-3-7-10-5H22L12 17 8 24zm12-8h8v3h-8zm18 0h10v3H38zM14 24a3.5 3.5 0 1 0 .01 0zm32 0a3.5 3.5 0 1 0 .01 0z" />
        </svg>
      );
    case "Coupe":
      return (
        <svg {...common}>
          <path d="M10 24h44l-4-7-14-7H24L12 17l-2 7zm12-9h10v3H22zm16 0h10v3H38zM16 24a3.5 3.5 0 1 0 .01 0zm28 0a3.5 3.5 0 1 0 .01 0z" />
        </svg>
      );
    case "Hatchback":
      return (
        <svg {...common}>
          <path d="M12 24h40l-2-8-6-6H24L14 16l-2 8zm10-8h8v4h-8zm18 0h8v4h-8zM16 24a3.5 3.5 0 1 0 .01 0zm28 0a3.5 3.5 0 1 0 .01 0z" />
        </svg>
      );
    case "Pickup":
      return (
        <svg {...common}>
          <path d="M8 24h48v-8H36l-4-6H16L8 16v8zm8-8h8v4h-8zM14 24a3.5 3.5 0 1 0 .01 0zm32 0a3.5 3.5 0 1 0 .01 0z" />
        </svg>
      );
    case "Minivan":
      return (
        <svg {...common}>
          <path d="M8 24h48V14L46 8H18L8 14v10zm10-10h8v5h-8zm16 0h8v5h-8zM14 24a3.5 3.5 0 1 0 .01 0zm32 0a3.5 3.5 0 1 0 .01 0z" />
        </svg>
      );
    case "Convertible":
      return (
        <svg {...common}>
          <path d="M8 24h48l-4-8H14L8 24zm6-4h10v2H14zm20 0h16v2H34zM16 24a3.5 3.5 0 1 0 .01 0zm28 0a3.5 3.5 0 1 0 .01 0z" />
        </svg>
      );
    default:
      return null;
  }
}

function pillClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
    active
      ? "bg-primary text-on-primary ring-primary"
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
    ? `${(draft.minMileage ?? 0).toLocaleString()} – ${(draft.maxMileage ?? "∞").toLocaleString()} ${t(locale, "km")}`
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
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <div className="lg:w-[220px]">
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
                className="mb-2 w-full rounded-lg bg-input px-3 py-2 text-sm outline-none ring-1 ring-outline/70 focus:ring-2 focus:ring-primary"
              />
              <div className="max-h-56 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => patch({ city: null })}
                  className={`mb-1 w-full rounded-lg px-3 py-2 text-start text-sm ${
                    !draft.city
                      ? "bg-primary/10 font-semibold text-primary"
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
                            ? "bg-primary/10 font-semibold text-primary"
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

          <div className="lg:w-[180px]">
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

          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={draft.q}
              onChange={(e) => patch({ q: e.target.value })}
              placeholder={t(locale, "filterSearchMakeModel")}
              className="w-full rounded-lg bg-input py-2.5 ps-10 pe-3 text-sm outline-none ring-1 ring-outline/70 focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:brightness-110 lg:w-[120px]"
          >
            <Search className="size-4" aria-hidden />
            {t(locale, "filterSearch")}
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-[200px]">
            <FilterMenu
              label={t(locale, "filterPriceRange", { currency: draft.currency })}
              summary={priceSummary}
              active={priceActive}
              onReset={() =>
                patch({ minPrice: null, maxPrice: null, currency: "USD" })
              }
            >
              <div className="mb-3 flex rounded-lg bg-input p-1 ring-1 ring-outline/60">
                {(["USD", "IQD"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => patch({ currency: code })}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold ${
                      draft.currency === code
                        ? "bg-primary text-on-primary"
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

          <div className="sm:w-[180px]">
            <FilterMenu
              label={t(locale, "filterMileageRange")}
              summary={mileageSummary}
              active={mileageActive}
              onReset={() => patch({ minMileage: null, maxMileage: null })}
            >
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

          <div className="sm:w-[160px]">
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

          <div className="sm:w-[190px]">
            <FilterMenu
              label={t(locale, "filterBodyTypes")}
              summary={bodySummary}
              active={draft.bodyTypes.length > 0}
              panelClassName="w-[22rem] max-w-[calc(100vw-2rem)]"
              onReset={() => patch({ bodyTypes: [] })}
            >
              <div className="grid grid-cols-2 gap-2">
                {BODY_TYPE_FILTERS.map((item) => {
                  const selected = draft.bodyTypes.includes(item.id);
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
                      className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-center text-xs font-semibold ring-1 transition ${
                        selected
                          ? "bg-primary/10 text-primary ring-primary"
                          : "bg-input text-foreground ring-outline/70 hover:ring-primary/40"
                      }`}
                    >
                      <BodyTypeIcon id={item.id} />
                      {t(locale, item.labelKey)}
                    </button>
                  );
                })}
              </div>
            </FilterMenu>
          </div>

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`${triggerClass(moreActive)} sm:w-auto sm:min-w-[150px]`}
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="size-4" aria-hidden />
              {t(locale, "filterMore")}
            </span>
            <ChevronDown className="size-4 opacity-60" aria-hidden />
          </button>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="px-2 py-2 text-sm font-semibold text-muted hover:text-primary"
            >
              {t(locale, "filterClearAll")}
            </button>
          ) : null}
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
                className="text-xs font-semibold text-muted hover:text-primary"
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
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-on-primary hover:brightness-110"
            >
              {t(locale, "filterDone")}
            </button>
          </DialogPanel>
        </div>
      </Dialog>
    </form>
  );
}
