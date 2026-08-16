import data from "./iraq-locations-data.json";
import type { Locale } from "@/lib/i18n";
import { localizeCity } from "@/lib/listing-labels";

export const IRAQ_PROVINCE_ORDER: string[] = data.provinceOrder;
export const IRAQ_CITIES_BY_PROVINCE: Record<string, string[]> =
  data.locations;
export const IRAQ_CITY_EN: Record<string, string> = data.cityEn;
export const IRAQ_CITY_AR: Record<string, string> = data.cityAr;

const PROVINCE_TO_LOCATION_KEY: Record<string, string> = {
  بەغداد: "baghdad",
  هەولێر: "erbil",
  سلێمانی: "sulaymaniyah",
  دهۆک: "dohuk",
  هەڵەبجە: "halabja",
  موسڵ: "mosul",
  نەینەوا: "mosul",
  کەرکووک: "kirkuk",
  کەرکوک: "kirkuk",
  بەسڕە: "basra",
  بەسرە: "basra",
  نەجەف: "najaf",
  کەربەلا: "karbala",
  ئەنبار: "anbar",
  بابل: "babylon",
  دیالە: "diyala",
  واست: "wasit",
  میسان: "maysan",
  موسەنا: "muthanna",
  "قادسیە (دیوانیە)": "qadisiyyah",
  قادسیە: "qadisiyyah",
  زیقار: "dhi_qar",
  سەلاحەدین: "salahuddin",
  سەڵاحەدین: "salahuddin",
};

export function citiesForProvince(province: string): string[] {
  return IRAQ_CITIES_BY_PROVINCE[province] ?? [];
}

export function localizeProvince(locale: Locale, province: string): string {
  const locationKey = PROVINCE_TO_LOCATION_KEY[province];
  if (locationKey) {
    const labeled = localizeCity(locale, locationKey);
    if (labeled) return labeled;
  }
  return localizeIraqPlace(locale, province);
}

export function localizeIraqPlace(locale: Locale, key: string): string {
  if (!key) return "";
  if (locale === "en") return IRAQ_CITY_EN[key] || localizeCity(locale, key) || key;
  if (locale === "ar") return IRAQ_CITY_AR[key] || key;
  return key;
}
