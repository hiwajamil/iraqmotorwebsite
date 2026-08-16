"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import {
  MAX_COMPARE,
  useCompareHydrated,
  useCompareStore,
} from "@/store/compare-store";
import {
  carCoverImage,
  compareCity,
  compareTitle,
} from "@/lib/compare";
import { t } from "@/lib/i18n";

export function CompareDock() {
  const pathname = usePathname();
  const locale = useAppSelector((s) => s.preferences.locale);
  const hydrated = useCompareHydrated();
  const compareList = useCompareStore((s) => s.compareList);
  const remove = useCompareStore((s) => s.remove);

  if (!hydrated) return null;
  if (pathname.startsWith("/admin") || pathname.startsWith("/compare")) {
    return null;
  }
  if (compareList.length === 0) return null;

  const ids = compareList.map((car) => car.id).join(",");
  const canCompare = compareList.length >= 2;

  return (
    <aside
      className="fixed bottom-0 right-4 z-50 w-72 overflow-hidden rounded-t-xl bg-white shadow-2xl transform transition-transform duration-300 sm:right-10 sm:w-80"
      aria-label={t(locale, "compare")}
    >
      <div className="rounded-t-xl bg-primary px-4 py-2 text-center text-sm font-bold tracking-wide text-on-primary">
        {t(locale, "compareDockTitle", { count: compareList.length })}
      </div>
      <div className="bg-white p-3">
        <div className="flex gap-2">
          {compareList.map((car) => {
            const title = compareTitle(car, locale);
            return (
              <div
                key={car.id}
                className="flex min-w-0 flex-1 flex-col items-center"
              >
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={carCoverImage(car)}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => remove(car.id)}
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-white shadow-sm hover:bg-slate-900"
                    aria-label={t(locale, "removeFromCompare")}
                  >
                    <X className="h-2.5 w-2.5" strokeWidth={3} />
                  </button>
                </div>
                <p
                  className="mt-1.5 w-full truncate text-center text-xs font-medium text-gray-700"
                  title={title}
                  dir="auto"
                >
                  {title}
                </p>
                <p className="w-full truncate text-center text-[10px] text-gray-400">
                  {compareCity(car, locale)}
                </p>
              </div>
            );
          })}
          {Array.from({ length: MAX_COMPARE - compareList.length }).map((_, i) => (
            <div
              key={`slot-${i}`}
              className="flex min-w-0 flex-1 flex-col items-center"
              aria-hidden
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-[10px] font-medium text-gray-300">
                {compareList.length + i + 1}
              </div>
            </div>
          ))}
        </div>
        <Link
          href={canCompare ? `/compare?ids=${encodeURIComponent(ids)}` : "#"}
          aria-disabled={!canCompare}
          onClick={(e) => {
            if (!canCompare) e.preventDefault();
          }}
          className={`mt-3 block rounded-md bg-primary py-2 text-center text-sm font-semibold text-on-primary transition hover:brightness-110 ${
            canCompare ? "" : "pointer-events-none opacity-40"
          }`}
        >
          {t(locale, "compareCta")}
        </Link>
        {!canCompare ? (
          <p className="mt-1.5 text-center text-[11px] text-gray-400">
            {t(locale, "compareNeedTwo")}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
