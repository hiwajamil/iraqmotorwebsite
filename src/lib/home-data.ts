import type { Locale } from "@/lib/i18n";

/** Popular brands shown on the home strip — mirrors Flutter `homeStripBrands`. */
export const HOME_STRIP_BRANDS = [
  { id: "toyota", name: "Toyota", logo: "/brands/27_Toyota.png" },
  { id: "mercedes_benz", name: "Mercedes-Benz", logo: "/brands/8_Mercedes-Benz.png" },
  { id: "bmw", name: "BMW", logo: "/brands/60_BMW.png" },
  { id: "hyundai", name: "Hyundai", logo: "/brands/77_Hyundai.png" },
  { id: "kia", name: "Kia", logo: "/brands/47_Kia.png" },
  { id: "nissan", name: "Nissan", logo: "/brands/2_Nissan.png" },
  { id: "land_rover", name: "Land Rover", logo: "/brands/19_Land_Rover.png" },
  { id: "lexus", name: "Lexus", logo: "/brands/18_Lexus.png" },
  { id: "chevrolet", name: "Chevrolet", logo: "/brands/51_Chevrolet.png" },
  { id: "ford", name: "Ford", logo: "/brands/87_Ford.png" },
  { id: "honda", name: "Honda", logo: "/brands/79_Honda.png" },
  { id: "audi", name: "Audi", logo: "/brands/63_Audi.png" },
] as const;

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
