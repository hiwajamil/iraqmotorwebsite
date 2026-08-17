"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Minus, X } from "lucide-react";
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
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ${
          checked ? "bg-primary" : "bg-[#e5e5ea]"
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
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-[4%] py-28 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          {title}
        </h1>
        <p className="mt-3 text-sm text-gray-500">{hint}</p>
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

  const colCount = Math.max(cars.length, 1);
  const gridStyle = {
    gridTemplateColumns: `250px repeat(${colCount}, minmax(0, 1fr))`,
    minWidth: 250 + colCount * 220,
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
      <div className="bg-white">
        <div className="mx-auto max-w-6xl px-[4%] py-28">
          <div className="h-9 w-56 animate-pulse rounded-lg bg-gray-100" />
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="overflow-hidden rounded-lg">
                <div className="aspect-[16/9] animate-pulse bg-gray-100" />
                <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="mt-2 h-6 w-1/2 animate-pulse rounded bg-gray-100" />
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

  const stickyHeader =
    "sticky top-16 z-20 border-b border-gray-200 bg-white/90 px-4 py-5 shadow-sm backdrop-blur-md";

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-[4%] pb-24 pt-24">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
              {t(locale, "compareDockTitle", { count: cars.length })}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900">
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
          <p className="mb-5 text-xs font-medium text-gray-500">
            {t(locale, "compareMissing")}
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <div
            className="grid grid-cols-[250px_repeat(auto-fit,minmax(0,1fr))]"
            style={gridStyle}
          >
            <div className={stickyHeader} />
            {cars.map((car) => {
              const title = compareTitle(car, locale);
              const meta = [
                car.year != null ? String(car.year) : "",
                compareMileage(car, locale),
                compareCity(car, locale),
              ]
                .filter((part) => part && part !== "—")
                .join(" · ");
              return (
                <div key={car.id} className={`${stickyHeader} min-w-0`}>
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={carCoverImage(car)}
                      alt={title}
                      className="aspect-[16/9] w-full rounded-lg object-cover shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeCar(car.id)}
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm backdrop-blur transition hover:bg-white hover:text-red-500"
                      aria-label={t(locale, "removeFromCompare")}
                    >
                      <X size={14} strokeWidth={2.4} />
                    </button>
                  </div>
                  <h2
                    className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-gray-900"
                    dir="auto"
                  >
                    {title}
                  </h2>
                  <p className="mt-1.5 text-xl font-bold text-primary" dir="ltr">
                    {comparePrice(car)}
                  </p>
                  {meta ? (
                    <p className="mt-1 truncate text-xs text-gray-400" dir="auto">
                      {meta}
                    </p>
                  ) : null}
                  <Link
                    href={`/cars/${car.id}`}
                    className="mt-3 inline-flex rounded-full border border-gray-300 px-4 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    {t(locale, "viewDetails")}
                  </Link>
                </div>
              );
            })}

            {sections.map((section) => {
              const rows = hideCommon
                ? section.rows.filter((row) => rowDiffers(row))
                : section.rows;
              if (!rows.length) return null;
              return (
                <div key={section.id} className="contents">
                  <div className="col-span-full bg-gray-100/80 px-4 py-2 text-xs font-bold tracking-wider text-gray-800 uppercase">
                    {section.title}
                  </div>
                  {rows.map((row) => {
                    const differs = rowDiffers(row);
                    const common = rowIsCommon(row);
                    return (
                      <div key={row.id} className="contents">
                        <div className="flex items-center border-b border-gray-100 bg-gray-50/50 px-4 py-4 text-sm font-medium text-gray-500">
                          {row.label}
                        </div>
                        {row.cells.map((cell, i) => (
                          <div
                            key={`${row.id}-${cars[i]?.id ?? i}`}
                            className={`flex items-center justify-center border-b border-gray-100 px-3 py-4 text-center text-sm font-semibold text-gray-900 ${
                              highlightDiffs && differs
                                ? "bg-primary/[0.04]"
                                : "bg-white"
                            } ${
                              highlightDiffs && common ? "font-medium text-gray-400" : ""
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
