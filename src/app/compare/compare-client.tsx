"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Minus } from "lucide-react";
import { api, type Car } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { useCompareStore } from "@/store/compare-store";
import {
  buildCompareSections,
  carCoverImage,
  compareCity,
  compareMileage,
  comparePrice,
  compareTitle,
  parseCompareIds,
  rowDiffers,
  rowIsCommon,
} from "@/lib/compare";
import { t } from "@/lib/i18n";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 select-none">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-gray-200 transition peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:start-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:start-[1.375rem]" />
      <span className="text-sm font-medium text-gray-700 dark:text-foreground">{label}</span>
    </label>
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
  const [hideCommon, setHideCommon] = useState(false);
  const [highlightDiffs, setHighlightDiffs] = useState(true);

  const idsKey = ids.join(",");

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
        const data = await api.get<{ items: Car[] }>("/cars/compare", {
          ids: idsKey,
        });
        if (cancelled) return;
        setCars(data.items ?? []);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t(locale, "compareLoadFailed"));
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
  const gridStyle = {
    gridTemplateColumns: `minmax(8.5rem, 11rem) repeat(${Math.max(cars.length, 1)}, minmax(11rem, 1fr))`,
  } as const;

  function removeCar(id: string) {
    remove(id);
    const next = cars.filter((car) => car.id !== id);
    setCars(next);
    const nextIds = next.map((car) => car.id).join(",");
    router.replace(nextIds ? `/compare?ids=${encodeURIComponent(nextIds)}` : "/compare");
  }

  if (!ids.length) {
    return (
      <div className="mx-auto max-w-3xl px-[4%] py-28 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t(locale, "compareEmptyTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t(locale, "compareEmptyHint")}</p>
        <Link
          href="/cars"
          className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-110"
        >
          {t(locale, "browseToCompare")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-[4%] py-28">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-[4%] py-28 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <Link href="/cars" className="mt-4 inline-block text-sm font-semibold text-primary">
          {t(locale, "browseToCompare")}
        </Link>
      </div>
    );
  }

  if (!cars.length) {
    return (
      <div className="mx-auto max-w-3xl px-[4%] py-28 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          {t(locale, "compareEmptyTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t(locale, "compareMissing")}</p>
        <Link
          href="/cars"
          className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:brightness-110"
        >
          {t(locale, "browseToCompare")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-[4%] pb-24 pt-24">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">
            {t(locale, "compareDockTitle", { count: cars.length })}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-foreground">
            {t(locale, "compare")}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-5 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100 dark:bg-card dark:ring-outline">
          <Toggle
            checked={hideCommon}
            onChange={setHideCommon}
            label={t(locale, "hideCommonFeatures")}
          />
          <Toggle
            checked={highlightDiffs}
            onChange={setHighlightDiffs}
            label={t(locale, "highlightDifferences")}
          />
        </div>
      </div>

      {cars.length < ids.length ? (
        <p className="mb-4 text-xs font-medium text-amber-700">
          {t(locale, "compareMissing")}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <div className="min-w-[40rem]">
          <div
            className="sticky top-16 z-20 grid gap-4 border-b border-gray-100 bg-white/95 py-4 backdrop-blur dark:border-outline dark:bg-card/95 md:top-20"
            style={gridStyle}
          >
            <div className="hidden sm:block" />
            {cars.map((car) => {
              const title = compareTitle(car, locale);
              return (
                <div key={car.id} className="min-w-0">
                  <div className="overflow-hidden rounded-lg bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={carCoverImage(car)}
                      alt={title}
                      className="h-32 w-full rounded-lg object-cover"
                    />
                  </div>
                  <h2
                    className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-gray-900"
                    dir="auto"
                  >
                    {title}
                  </h2>
                  <p className="mt-1 text-lg font-bold text-gray-900" dir="ltr">
                    {comparePrice(car)}
                  </p>
                  <Link
                    href={`/cars/${car.id}`}
                    className="mt-2 inline-flex rounded-md bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
                  >
                    {t(locale, "viewDetails")}
                  </Link>
                  <dl className="mt-3 space-y-1.5 rounded-lg bg-gray-50 p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">{t(locale, "sellPrice")}</dt>
                      <dd className="font-medium text-gray-800" dir="ltr">
                        {comparePrice(car)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">{t(locale, "specMileage")}</dt>
                      <dd className="font-medium text-gray-800" dir="ltr">
                        {compareMileage(car, locale)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">{t(locale, "specCity")}</dt>
                      <dd className="font-medium text-gray-800" dir="auto">
                        {compareCity(car, locale)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-gray-500">{t(locale, "specYear")}</dt>
                      <dd className="font-medium text-gray-800">
                        {car.year != null ? String(car.year) : "—"}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => removeCar(car.id)}
                    className="mt-2 text-[11px] font-medium text-gray-400 hover:text-red-500"
                  >
                    {t(locale, "removeFromCompare")}
                  </button>
                </div>
              );
            })}
          </div>

          {sections.map((section) => {
            const rows = hideCommon
              ? section.rows.filter((row) => rowDiffers(row))
              : section.rows;
            if (!rows.length) return null;
            return (
              <section key={section.id} className="mt-8">
                <h3 className="mb-2 text-sm font-bold tracking-wide text-gray-900">
                  {section.title}
                </h3>
                <div className="overflow-hidden rounded-xl ring-1 ring-gray-100">
                  {rows.map((row) => {
                    const differs = rowDiffers(row);
                    const common = rowIsCommon(row);
                    return (
                      <div
                        key={row.id}
                        className={`grid items-center gap-4 border-b border-gray-100 last:border-b-0 even:bg-gray-50 ${
                          highlightDiffs && differs ? "bg-amber-50/80 even:bg-amber-50/90" : ""
                        }`}
                        style={gridStyle}
                      >
                        <div className="px-3 py-3 text-sm font-semibold text-gray-600">
                          {row.label}
                        </div>
                        {row.cells.map((cell, i) => (
                          <div
                            key={`${row.id}-${cars[i]?.id ?? i}`}
                            className={`px-3 py-3 text-center text-sm ${
                              highlightDiffs && differs
                                ? "font-medium text-gray-900"
                                : "text-gray-800"
                            } ${highlightDiffs && common ? "text-gray-400" : ""}`}
                          >
                            {cell.kind === "bool" ? (
                              cell.value ? (
                                <Check
                                  className="mx-auto h-5 w-5 text-emerald-500"
                                  strokeWidth={2.4}
                                  aria-label="yes"
                                />
                              ) : (
                                <Minus
                                  className="mx-auto h-5 w-5 text-red-400"
                                  strokeWidth={2.4}
                                  aria-label="no"
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
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
