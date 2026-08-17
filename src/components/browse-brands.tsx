"use client";

import Link from "next/link";
import { HOME_STRIP_BRANDS } from "@/lib/home-data";
import { t } from "@/lib/i18n";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setBrandId } from "@/store/slices/filtersSlice";

export function BrowseBrands({
  onBrandChange,
}: {
  onBrandChange?: (brandId: string | null) => void;
}) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.preferences.locale);
  const brandId = useAppSelector((s) => s.filters.brandId);

  return (
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
              onClick={() => {
                const next = selected ? null : b.id;
                dispatch(setBrandId(next));
                onBrandChange?.(next);
              }}
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
  );
}
