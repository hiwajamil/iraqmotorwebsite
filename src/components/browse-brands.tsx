"use client";

import { useEffect, useState } from "react";
import { ALL_BROWSE_BRANDS, type BrowseBrand } from "@/lib/home-data";
import { t } from "@/lib/i18n";
import { localizeBrandName } from "@/lib/vehicle-names";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setBrandId } from "@/store/slices/filtersSlice";

const COLLAPSED_COUNT = 11;
const COLLAPSED_BRAND_IDS = new Set(
  ALL_BROWSE_BRANDS.slice(0, COLLAPSED_COUNT).map((b) => b.id),
);

export function BrowseBrands({
  onBrandChange,
}: {
  onBrandChange?: (brandId: string | null) => void;
}) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.preferences.locale);
  const brandId = useAppSelector((s) => s.filters.brandId);
  const [isExpanded, setIsExpanded] = useState(false);

  const collapsedBrands = ALL_BROWSE_BRANDS.slice(0, COLLAPSED_COUNT);
  const extraBrands = ALL_BROWSE_BRANDS.slice(COLLAPSED_COUNT);
  const canExpand = extraBrands.length > 0;

  useEffect(() => {
    if (brandId && !COLLAPSED_BRAND_IDS.has(brandId)) {
      setIsExpanded(true);
    }
  }, [brandId]);

  function selectBrand(id: string, selected: boolean) {
    const next = selected ? null : id;
    dispatch(setBrandId(next));
    onBrandChange?.(next);
  }

  return (
    <div className="pb-4">
      <h2 className="mb-4 text-lg font-bold text-foreground md:text-center md:text-xl">
        {t(locale, "browseBrands")}
      </h2>
      <div
        className={
          isExpanded
            ? "flex flex-wrap justify-start gap-4 md:justify-center"
            : "flex gap-4 overflow-x-auto pb-3 scrollbar-none md:flex-wrap md:justify-center md:overflow-visible md:pb-0"
        }
      >
        {collapsedBrands.map((b) => (
          <BrandItem
            key={b.id}
            brand={b}
            selected={brandId === b.id}
            name={localizeBrandName(b.id, locale)}
            onSelect={selectBrand}
          />
        ))}
        {canExpand && !isExpanded ? (
          <ToggleMoreButton
            expanded={false}
            label={t(locale, "more")}
            onToggle={() => setIsExpanded(true)}
          />
        ) : null}
      </div>
      {canExpand ? (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            isExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex flex-wrap justify-start gap-4 pt-4 md:justify-center">
              {extraBrands.map((b) => (
                <BrandItem
                  key={b.id}
                  brand={b}
                  selected={brandId === b.id}
                  name={localizeBrandName(b.id, locale)}
                  onSelect={selectBrand}
                />
              ))}
              {isExpanded ? (
                <ToggleMoreButton
                  expanded
                  label={t(locale, "showLess")}
                  onToggle={() => setIsExpanded(false)}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BrandItem({
  brand,
  selected,
  name,
  onSelect,
}: {
  brand: BrowseBrand;
  selected: boolean;
  name: string;
  onSelect: (id: string, selected: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(brand.id, selected)}
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
          src={brand.logo}
          alt={name}
          className="h-[55%] w-[55%] object-contain"
        />
      </span>
      <span
        className={`max-w-full truncate text-[11px] font-semibold md:text-xs ${
          selected ? "text-primary-strong" : "text-muted"
        }`}
      >
        {name}
      </span>
    </button>
  );
}

function ToggleMoreButton({
  expanded,
  label,
  onToggle,
}: {
  expanded: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className="flex w-[70px] shrink-0 flex-col items-center gap-2 md:w-[104px]"
    >
      <span className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-input text-lg font-bold leading-none text-primary-strong ring-2 ring-outline/60 transition hover:ring-primary/40 md:h-[88px] md:w-[88px] md:text-xl">
        {expanded ? "−" : "+"}
      </span>
      <span className="text-[11px] font-semibold text-muted md:text-xs">
        {label}
      </span>
    </button>
  );
}
