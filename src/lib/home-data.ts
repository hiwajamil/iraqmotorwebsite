import { BRAND_LOGO_FILES, brandLogoSrc } from "@/lib/brand-logos";
import type { Locale } from "@/lib/i18n";
import { VEHICLE_BRANDS } from "@/lib/vehicle-names";

/** Popular brands shown first in Browse Brands — mirrors Flutter `homeStripBrands`. */
export const HOME_STRIP_BRAND_IDS = [
  "toyota",
  "mercedes_benz",
  "bmw",
  "hyundai",
  "kia",
  "nissan",
  "land_rover",
  "lexus",
  "chevrolet",
  "ford",
  "honda",
  "audi",
] as const;

export type BrowseBrand = {
  id: string;
  name: string;
  logo: string;
};

function toBrowseBrand(id: string): BrowseBrand | null {
  const logo = brandLogoSrc(id);
  if (!logo) return null;
  return {
    id,
    name: VEHICLE_BRANDS[id]?.en ?? id,
    logo,
  };
}

export const HOME_STRIP_BRANDS = HOME_STRIP_BRAND_IDS.map(
  (id) => toBrowseBrand(id)!,
);

/** Popular strip first, then remaining logo brands A–Z. */
export const ALL_BROWSE_BRANDS: BrowseBrand[] = (() => {
  const strip = new Set<string>(HOME_STRIP_BRAND_IDS);
  const rest = Object.keys(BRAND_LOGO_FILES)
    .filter((id) => !strip.has(id))
    .sort((a, b) => {
      const an = VEHICLE_BRANDS[a]?.en ?? a;
      const bn = VEHICLE_BRANDS[b]?.en ?? b;
      return an.localeCompare(bn);
    })
    .map(toBrowseBrand)
    .filter((b): b is BrowseBrand => b !== null);
  return [...HOME_STRIP_BRANDS, ...rest];
})();

export const HOME_CITIES = [
  { key: null, en: "All Cities", ar: "كل المدن", ku: "هەموو شارەکان" },
  { key: "baghdad", en: "Baghdad", ar: "بغداد", ku: "بەغدا" },
  { key: "erbil", en: "Erbil", ar: "أربيل", ku: "هەولێر" },
  { key: "sulaymaniyah", en: "Sulaymaniyah", ar: "السليمانية", ku: "سلێمانی" },
  { key: "basra", en: "Basra", ar: "البصرة", ku: "بەسرا" },
  { key: "kirkuk", en: "Kirkuk", ar: "كركوك", ku: "کەرکووک" },
  { key: "duhok", en: "Duhok", ar: "دهوك", ku: "دهۆک" },
  { key: "mosul", en: "Mosul", ar: "الموصل", ku: "مووسڵ" },
  { key: "najaf", en: "Najaf", ar: "النجف", ku: "نەجەف" },
] as const;

export type ConditionFilter = "all" | "new" | "used" | "electric";

export function homeCityLabel(
  city: (typeof HOME_CITIES)[number],
  locale: Locale,
): string {
  if (locale === "ar") return city.ar;
  if (locale === "ku") return city.ku;
  return city.en;
}
