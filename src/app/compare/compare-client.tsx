"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Minus, Plus, X } from "lucide-react";
import { api, type Car } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { MAX_COMPARE, useCompareStore } from "@/store/compare-store";
import {
  buildCompareSections,
  carCoverImage,
  compareCity,
  compareMileage,
  comparePrice,
  compareTitle,
  filterCompareRows,
  parseCompareIds,
  rowDiffers,
  rowIsCommon,
  rowIsEmpty,
} from "@/lib/compare";
import { t } from "@/lib/i18n";

const LABEL_COL = 180;
const CAR_COL = 220;

function IosSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 select-none">
      <span className="text-sm font-medium text-muted">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
          checked ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`absolute top-[2px] start-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-transform duration-200 ease-out ${
            checked ? "translate-x-[20px] rtl:-translate-x-[20px]" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

function EmptyState({
  title,
  hint,
  locale,
}: {
  title: string;
  hint: string;
  locale: "en" | "ar" | "ku";
}) {
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-3xl px-[4%] py-28 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted">{hint}</p>
        <Link
          href="/cars"
          className="mt-8 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-110"
        >
          {t(locale, "browseToCompare")}
        </Link>
      </div>
    </div>
  );
}

function SoldBadge({ locale }: { locale: "en" | "ar" | "ku" }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur">
      {t(locale, "sold")}
    </span>
  );
}

function AddCarSlot({ locale }: { locale: "en" | "ar" | "ku" }) {
  return (
    <Link
      href="/cars"
      className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-lg border border-dashed border-outline px-4 text-muted transition hover:border-primary hover:text-primary"
    >
      <Plus size={22} strokeWidth={2.2} />
      <span className="mt-1 text-sm font-semibold">{t(locale, "compareAddCar")}</span>
    </Link>
  );
}

export default function CompareClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useAppSelector((s) => s.preferences.locale);
  const stored = useCompareStore((s) => s.compareList);
  const remove = useCompareStore((s) => s.remove);

  const urlIds = useMemo(
    () => parseCompareIds(searchParams.get("ids")),
    [searchParams],
  );
  const ids = urlIds.length ? urlIds : stored.map((car) => car.id);

  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(ids.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [hideCommon, setHideCommon] = useState(true);
  const [highlightDiffs, setHighlightDiffs] = useState(true);
  const [compactPinned, setCompactPinned] = useState(false);

  const idsKey = ids.join(",");
  const heroRef = useRef<HTMLDivElement>(null);
  const stickyScroll = useRef<HTMLDivElement>(null);
  const bodyScroll = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  function syncScroll(from: HTMLDivElement) {
    if (syncing.current) return;
    syncing.current = true;
    const left = from.scrollLeft;
    for (const el of [stickyScroll.current, bodyScroll.current]) {
      if (el && el !== from && el.scrollLeft !== left) el.scrollLeft = left;
    }
    syncing.current = false;
  }

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setCompactPinned(!entry.isIntersecting),
      { root: null, rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [idsKey, loading]);

  useEffect(() => {
    if (!idsKey) {
      setCars([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await api.get<{ items: Car[]; missingIds?: string[] }>(
          "/cars/compare",
          { ids: idsKey },
        );
        if (cancelled) return;
        setCars(data.items ?? []);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : t(locale, "compareLoadFailed"),
        );
        setCars([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey, locale]);

  const sections = useMemo(
    () => (cars.length ? buildCompareSections(cars, locale) : []),
    [cars, locale],
  );

  const showAdd = cars.length < MAX_COMPARE;
  const heroSlots = cars.length + (showAdd ? 1 : 0);
  const heroGridStyle = {
    gridTemplateColumns: `repeat(${heroSlots}, minmax(${CAR_COL}px, 1fr))`,
    minWidth: heroSlots * CAR_COL,
  } as const;
  const tableGridStyle = {
    gridTemplateColumns: `${LABEL_COL}px repeat(${cars.length}, minmax(${CAR_COL}px, 1fr))`,
    minWidth: LABEL_COL + cars.length * CAR_COL,
  } as const;

  function removeCar(id: string) {
    remove(id);
    const next = cars.filter((car) => car.id !== id);
    setCars(next);
    const nextIds = next.map((car) => car.id).join(",");
    router.replace(
      nextIds ? `/compare?ids=${encodeURIComponent(nextIds)}` : "/compare",
    );
  }

  if (!ids.length) {
    return (
      <EmptyState
        title={t(locale, "compareEmptyTitle")}
        hint={t(locale, "compareEmptyHint")}
        locale={locale}
      />
    );
  }

  if (loading) {
    return (
      <div className="bg-surface">
        <div className="mx-auto max-w-6xl px-[4%] py-28">
          <div className="h-9 w-56 animate-pulse rounded-lg bg-input" />
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-lg">
                <div className="aspect-[16/9] animate-pulse bg-input" />
                <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-input" />
                <div className="mt-2 h-6 w-1/2 animate-pulse rounded bg-input" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={t(locale, "compareLoadFailed")}
        hint={error}
        locale={locale}
      />
    );
  }

  if (!cars.length) {
    return (
      <EmptyState
        title={t(locale, "compareEmptyTitle")}
        hint={t(locale, "compareMissing")}
        locale={locale}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-[1400px] px-[4%] pb-24 pt-24">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
              {t(locale, "compareDockTitle", { count: cars.length })}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
              {t(locale, "compare")}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <IosSwitch
              checked={hideCommon}
              onChange={setHideCommon}
              label={t(locale, "hideCommonFeatures")}
            />
            <IosSwitch
              checked={highlightDiffs}
              onChange={setHighlightDiffs}
              label={t(locale, "highlightDifferences")}
            />
          </div>
        </header>

        {cars.length < ids.length ? (
          <p className="mb-5 text-xs font-medium text-muted">
            {t(locale, "compareMissing")}
          </p>
        ) : null}

        {/* Full 16:9 photos — not sticky. Add-car lives here only, not in the spec grid. */}
        <div ref={heroRef} className="overflow-x-auto">
          <div className="grid items-stretch gap-4" style={heroGridStyle}>
            {cars.map((car) => {
              const title = compareTitle(car, locale);
              const meta = [
                car.year != null ? String(car.year) : "",
                compareMileage(car, locale),
                compareCity(car, locale),
              ]
                .filter((part) => part && part !== "—")
                .join(" · ");
              const sold = car.status === "sold";
              return (
                <div key={car.id} className="min-w-0 pb-2">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={carCoverImage(car)}
                      alt={title}
                      className="aspect-[16/9] w-full rounded-lg object-cover shadow-sm"
                    />
                    {sold ? (
                      <span className="absolute start-2 top-2 z-[1]">
                        <SoldBadge locale={locale} />
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => removeCar(car.id)}
                      className="absolute top-2 end-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-muted shadow-sm backdrop-blur transition hover:bg-card hover:text-red-500"
                      aria-label={t(locale, "removeFromCompare")}
                    >
                      <X size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                  <h2
                    className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-foreground"
                    dir="auto"
                  >
                    {title}
                  </h2>
                  <p className="mt-1.5 text-xl font-bold text-primary" dir="ltr">
                    {comparePrice(car)}
                  </p>
                  {meta ? (
                    <p className="mt-1 truncate text-xs text-muted" dir="auto">
                      {meta}
                    </p>
                  ) : null}
                  <Link
                    href={`/cars/${car.id}`}
                    className="mt-3 inline-flex rounded-full border border-outline px-4 py-1.5 text-sm text-foreground transition hover:bg-input"
                  >
                    {t(locale, "viewDetails")}
                  </Link>
                </div>
              );
            })}
            {showAdd ? <AddCarSlot locale={locale} /> : null}
          </div>
        </div>

        {/* Compact headers: only while photos are off-screen, overlay so they don't duplicate at rest. */}
        {compactPinned ? (
          <div className="pointer-events-none fixed inset-x-0 top-16 z-20">
            <div className="mx-auto max-w-[1400px] px-[4%]">
              <div className="pointer-events-auto border-b border-outline bg-surface/95 shadow-sm backdrop-blur-md">
                <div
                  ref={stickyScroll}
                  onScroll={(e) => syncScroll(e.currentTarget)}
                  className="overflow-x-auto scrollbar-none"
                >
                  <div className="grid" style={tableGridStyle}>
                    <div className="bg-surface/95" />
                    {cars.map((car) => {
                      const title = compareTitle(car, locale);
                      const sold = car.status === "sold";
                      return (
                        <div key={car.id} className="relative min-w-0 px-3 py-2.5">
                          <div className="flex min-w-0 items-center gap-2.5 pe-7">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={carCoverImage(car)}
                              alt=""
                              className="h-10 w-14 shrink-0 rounded-md object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h2
                                  className="truncate text-xs font-bold text-foreground"
                                  dir="auto"
                                >
                                  {title}
                                </h2>
                                {sold ? <SoldBadge locale={locale} /> : null}
                              </div>
                              <p
                                className="truncate text-sm font-bold text-primary"
                                dir="ltr"
                              >
                                {comparePrice(car)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCar(car.id)}
                            className="absolute top-2 end-2 flex h-6 w-6 items-center justify-center rounded-full bg-card text-muted shadow-sm ring-1 ring-outline transition hover:text-red-500"
                            aria-label={t(locale, "removeFromCompare")}
                          >
                            <X size={12} strokeWidth={2.4} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div
          ref={bodyScroll}
          onScroll={(e) => syncScroll(e.currentTarget)}
          className="overflow-x-auto"
        >
          <div className="mt-6 grid" style={tableGridStyle}>
            {sections.map((section) => {
              const rows = filterCompareRows(section.rows, { hideCommon });
              const featuresAllMatch =
                section.id === "features" &&
                !rows.length &&
                hideCommon &&
                section.rows.some((row) => !rowIsEmpty(row));
              if (!rows.length && !featuresAllMatch) return null;
              return (
                <div key={section.id} className="contents">
                  <div className="col-span-full border-b border-outline px-4 py-2 text-xs font-bold tracking-wider text-muted uppercase">
                    {section.title}
                  </div>
                  {featuresAllMatch ? (
                    <div className="col-span-full px-4 py-4 text-sm text-muted">
                      {t(locale, "compareFeaturesMatch")}
                    </div>
                  ) : null}
                  {rows.map((row) => {
                    const differs = rowDiffers(row);
                    const common = rowIsCommon(row);
                    return (
                      <div key={row.id} className="contents">
                        <div className="flex items-center border-b border-outline px-4 py-4 text-sm font-medium text-muted">
                          {row.label}
                        </div>
                        {row.cells.map((cell, i) => (
                          <div
                            key={`${row.id}-${cars[i]?.id ?? i}`}
                            className={`flex items-center justify-center border-b border-outline bg-surface px-3 py-4 text-center text-sm font-semibold text-foreground ${
                              highlightDiffs && common ? "font-medium text-muted" : ""
                            } ${
                              highlightDiffs && differs && !hideCommon
                                ? "font-bold"
                                : ""
                            }`}
                          >
                            {cell.kind === "bool" ? (
                              cell.value ? (
                                <Check
                                  className="h-5 w-5 text-emerald-500"
                                  strokeWidth={2.4}
                                  aria-label={t(locale, "compareYes")}
                                />
                              ) : (
                                <Minus
                                  className="h-5 w-5 text-red-400"
                                  strokeWidth={2.4}
                                  aria-label={t(locale, "compareNo")}
                                />
                              )
                            ) : (
                              <span dir="auto">{cell.text}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
