import type { Car } from "@/lib/api";
import { humanizeSlug } from "@/lib/listing-display";
import { t, type Locale } from "@/lib/i18n";

type Tri = Record<Locale, string>;

function tri(en: string, ar: string, ku: string): Tri {
  return { en, ar, ku };
}

/** Canonical storage keys → localized marketplace labels. */
const OPTION_LABELS: Record<string, Tri> = {
  engine_petrol: tri("Petrol", "بنزين", "بەنزین"),
  engine_diesel: tri("Diesel", "ديزل", "دیزڵ"),
  engine_hybrid: tri("Hybrid", "هجين", "هایبرید"),
  engine_ev: tri("Electric", "كهربائي", "کارەبایی"),
  fuel_plug_in_hybrid: tri("Plug-in Hybrid", "هجين قابل للشحن", "هایبریدی پڵەگین"),
  fuel_lpg: tri("LPG", "غاز", "غاز"),
  fuel_cng: tri("CNG", "غاز طبيعي", "گاز"),
  transmission_automatic: tri("Automatic", "أوتوماتيك", "ئۆتۆماتیک"),
  transmission_manual: tri("Manual", "يدوي", "دەستی"),
  transmission_cvt: tri("CVT", "CVT", "CVT"),
  transmission_dual_clutch: tri("DCT", "DCT", "DCT"),
  color_black: tri("Black", "أسود", "ڕەش"),
  color_white: tri("White", "أبيض", "سپی"),
  color_silver: tri("Silver", "فضي", "زیو"),
  color_gray: tri("Gray", "رمادي", "خۆڵەمێشی"),
  color_red: tri("Red", "أحمر", "سور"),
  color_blue: tri("Blue", "أزرق", "شین"),
  color_green: tri("Green", "أخضر", "سەوز"),
  condition_new: tri("New", "جديد", "نوێ"),
  condition_used: tri("Used", "مستعمل", "بەکارهاتوو"),
  condition_clean_title: tri("Clean Title", "عنوان نظيف", "کلین تایتل"),
  condition_no_paint: tri("No Paint", "بدون طلاء", "بێ بۆیاغ"),
  condition_damage_1: tri("1 Panel", "قطعة واحدة", "1 پارچە"),
  condition_damage_2: tri("2 Panels", "قطعتان", "2 پارچە"),
  condition_damage_3: tri("3 Panels", "3 قطع", "3 پارچە"),
  condition_damage_4: tri("4 Panels", "4 قطع", "4 پارچە"),
  condition_damage_5: tri("5 Panels", "5 قطع", "5 پارچە"),
  condition_damage_6: tri("6 Panels", "6 قطع", "6 پارچە"),
  plate_private: tri("Private", "خاص", "تایبەت"),
  plate_temporary: tri("Temporary", "مؤقت", "کاتی"),
  plate_commercial: tri("Commercial", "تجاري", "بازرگانی"),
  plate_cargo: tri("Cargo", "حمولة", "بار هەڵگر"),
  plate_government: tri("Government", "حكومي", "حکومی"),
  plate_diplomatic: tri("Diplomatic", "دبلوماسي", "دیپلۆمات"),
  plate_taxi: tri("Taxi", "أجرة", "تاکسی"),
  body_suv: tri("SUV", "دفع رباعي / SUV", "SUV"),
  body_sedan: tri("Sedan", "سيدان", "سیدان"),
  body_hatchback: tri("Hatchback", "هاشباك", "هاچباک"),
  body_pickup: tri("Pickup", "بيك آب", "پیک ئاپ"),
  body_coupe: tri("Coupe", "كوبيه", "کۆپێ"),
  body_convertible: tri("Convertible", "كابريوليه", "کابریۆلێ"),
  body_minivan: tri("Minivan", "ميني فان", "مینی ڤان"),
  body_crossover: tri("Crossover", "كروس أوفر", "کرۆس ئۆڤەر"),
  body_van: tri("Van", "فان", "ڤان"),
  drivetrain_fwd: tri("FWD", "دفع أمامي", "دەفعی پێشەوە"),
  drivetrain_rwd: tri("RWD", "دفع خلفي", "دەفعی دواوە"),
  drivetrain_awd: tri("AWD", "دفع رباعي مستمر", "AWD"),
  drivetrain_4wd: tri("4WD", "دفع رباعي 4x4", "4x4"),
  import_usa: tri("USA", "أمريكي", "ئەمەریکی"),
  import_gcc: tri("GCC", "خليجي", "خەلیجی"),
  import_local: tri("Iraqi", "عراقي", "عێراقی"),
  import_europe: tri("Europe", "أوروبا", "ئەوروپا"),
  import_uae: tri("UAE", "الإمارات", "ئیمارات"),
  import_canada: tri("Canada", "كندا", "کەنەدا"),
  import_korea: tri("Korea", "كوريا", "کۆریا"),
  import_china: tri("China", "الصين", "چین"),
  import_japan: tri("Japan", "اليابان", "یابان"),
  seat_fabric: tri("Fabric", "قماش", "قوماش"),
  seat_leather: tri("Leather", "جلد", "جلد"),
  seat_semi_leather: tri("Semi-Leather", "نصف جلد", "نیو جلد"),
  seat_alcantara: tri("Alcantara", "ألكانتارا", "شامۆ"),
  seat_alcantara_leather: tri("Alcantara/Leather", "ألكانتارا/جلد", "شامۆ/جلد"),
  feature_rear_camera: tri("Rear Camera", "كاميرا خلفية", "کامێرای دواوە"),
  feature_parking_brake: tri("Parking Brake", "فرامل يد", "ڕاگری نشێوی"),
  feature_sensitive: tri("Rain sensor", "حساس", "حەساس"),
  feature_seat_heater: tri("Seat Heater", "تدفئة المقاعد", "گەرمکەرەوەی کوشن"),
  feature_sunroof: tri("Sunroof", "فتحة سقف", "سلاید"),
  feature_horn: tri("Horn", "بوق", "بەسمە"),
  feature_speed_sign: tri(
    "Speed Sign Detection",
    "كشف إشارات السرعة",
    "دیاریکرنی خێرایی",
  ),
  feature_electric_mirror: tri(
    "Power Side Mirrors",
    "مرايا جانبية كهربائية",
    "ئاوێنەی کارەبایی",
  ),
  feature_screen: tri("Screen", "شاشة", "شاشە"),
  feature_radar_mirror: tri("Radar Mirror", "مرآة رادار", "ئاوێنەی ڕادار"),
  feature_smart_key: tri("Smart Key", "مفتاح ذكي", "کلیلی زیرەک"),
  feature_electric_seat: tri("Power Seats", "مقاعد كهربائية", "کورسی کارەبایی"),
  feature_speaker_8: tri("8 Speakers", "8 مكبرات", "8 پەڕەشووت"),
  feature_xenon_light: tri("Xenon Headlights", "مصابيح زينون", "لایتی زینۆن"),
  feature_cruise_control: tri("Cruise Control", "مثبت سرعة", "کۆنترۆڵی خزان"),
  feature_steering_heater: tri("Heated Steering", "تدفئة المقود", "سوکان هیتەر"),
  feature_apple_carplay: tri("Apple CarPlay", "Apple CarPlay", "ئەپڵ کارپلەی"),
  feature_panoramic_roof: tri("Panoramic Roof", "سقف بانورامي", "شەغال"),
  feature_abs: tri("ABS", "ABS", "ABS"),
  feature_awd: tri("AWD", "AWD", "AWD"),
  feature_radar: tri("Radar", "رادار", "ڕادار"),
  feature_wireless_charger: tri(
    "Wireless Charger",
    "شاحن لاسلكي",
    "بارگاویکەرەوەی بێتەل",
  ),
  feature_anti_theft: tri("Anti-Theft", "مضاد للسرقة", "دژە دزی"),
  feature_auto_headlight: tri(
    "Auto Headlights",
    "إضاءة أمامية تلقائية",
    "لایتی ئۆتۆماتیک",
  ),
  feature_tire_pressure: tri(
    "Tire Pressure Sensor",
    "حساس ضغط الإطارات",
    "هەستەوەری پەستانی تایە",
  ),
  feature_driver_attention: tri(
    "Driver Attention Alert",
    "تنبيه انتباه السائق",
    "ئاگاداری سەرنجی شۆفێر",
  ),
};

const OPTION_ALIASES: Record<string, string> = {
  petrol: "engine_petrol",
  gasoline: "engine_petrol",
  diesel: "engine_diesel",
  hybrid: "engine_hybrid",
  electric: "engine_ev",
  ev: "engine_ev",
  gas: "fuel_lpg",
  lpg: "fuel_lpg",
  cng: "fuel_cng",
  auto: "transmission_automatic",
  automatic: "transmission_automatic",
  transmission_auto: "transmission_automatic",
  manual: "transmission_manual",
  cvt: "transmission_cvt",
  dct: "transmission_dual_clutch",
  dual_clutch: "transmission_dual_clutch",
  black: "color_black",
  white: "color_white",
  silver: "color_silver",
  gray: "color_gray",
  grey: "color_gray",
  red: "color_red",
  blue: "color_blue",
  green: "color_green",
  new: "condition_new",
  used: "condition_used",
  brand_new: "condition_new",
  clean_title: "condition_clean_title",
  no_paint: "condition_no_paint",
  private: "plate_private",
  temporary: "plate_temporary",
  commercial: "plate_commercial",
};

const CITY_LABELS: Record<string, Tri> = {
  sulaymaniyah: tri("Sulaymaniyah", "السليمانية", "سلێمانی"),
  suleimani: tri("Sulaymaniyah", "السليمانية", "سلێمانی"),
  slemani: tri("Sulaymaniyah", "السليمانية", "سلێمانی"),
  "سلێمانی": tri("Sulaymaniyah", "السليمانية", "سلێمانی"),
  "السليمانية": tri("Sulaymaniyah", "السليمانية", "سلێمانی"),
  erbil: tri("Erbil", "أربيل", "هەولێر"),
  hawler: tri("Erbil", "أربيل", "هەولێر"),
  "هەولێر": tri("Erbil", "أربيل", "هەولێر"),
  "أربيل": tri("Erbil", "أربيل", "هەولێر"),
  "اربيل": tri("Erbil", "أربيل", "هەولێر"),
  baghdad: tri("Baghdad", "بغداد", "بەغداد"),
  "بەغداد": tri("Baghdad", "بغداد", "بەغداد"),
  "بغداد": tri("Baghdad", "بغداد", "بەغداد"),
  basra: tri("Basra", "البصرة", "بەسرە"),
  "بەسرە": tri("Basra", "البصرة", "بەسرە"),
  "البصرة": tri("Basra", "البصرة", "بەسرە"),
  kirkuk: tri("Kirkuk", "كركوك", "کەرکووک"),
  "کەرکوک": tri("Kirkuk", "كركوك", "کەرکووک"),
  "کەرکووک": tri("Kirkuk", "كركوك", "کەرکووک"),
  "كركوك": tri("Kirkuk", "كركوك", "کەرکووک"),
  dohuk: tri("Duhok", "دهوك", "دهۆک"),
  duhok: tri("Duhok", "دهوك", "دهۆک"),
  "دهۆک": tri("Duhok", "دهوك", "دهۆک"),
  "دهوك": tri("Duhok", "دهوك", "دهۆک"),
  mosul: tri("Mosul", "الموصل", "مووسڵ"),
  nineveh: tri("Nineveh", "نينوى", "نەینەوا"),
  "نەینەوا": tri("Nineveh", "نينوى", "نەینەوا"),
  "نينوى": tri("Nineveh", "نينوى", "نەینەوا"),
  "الموصل": tri("Mosul", "الموصل", "مووسڵ"),
  najaf: tri("Najaf", "النجف", "نەجەف"),
  "نەجەف": tri("Najaf", "النجف", "نەجەف"),
  "النجف": tri("Najaf", "النجف", "نەجەف"),
  karbala: tri("Karbala", "كربلاء", "کەربەلا"),
  "کەربەلا": tri("Karbala", "كربلاء", "کەربەلا"),
  "كربلاء": tri("Karbala", "كربلاء", "کەربەلا"),
  anbar: tri("Anbar", "الأنبار", "ئەنبار"),
  halabja: tri("Halabja", "حلبجة", "هەڵەبجە"),
  maysan: tri("Maysan", "ميسان", "میسان"),
};

function looksLikeStorageKey(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  return (
    /^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)+$/.test(s) ||
    /^[A-Za-z][A-Za-z0-9]*$/.test(s)
  );
}

export function normalizeOptionKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function localizeOption(
  locale: Locale,
  raw: string | null | undefined,
): string {
  if (raw == null) return "";
  const value = String(raw).trim();
  if (!value) return "";
  const key = normalizeOptionKey(value);
  const resolved = OPTION_ALIASES[key] ?? key;
  const mapped = OPTION_LABELS[resolved];
  if (mapped) return mapped[locale] ?? mapped.en;

  const engineSize = resolved.match(/^engine_(\d+)_(\d+)(_t|_ev|_plus)?$/);
  if (engineSize) {
    const n = `${engineSize[1]}.${engineSize[2]}`;
    if (engineSize[3] === "_ev") return `${n} (EV)`;
    if (engineSize[3] === "_plus") return `${n}+`;
    return n;
  }
  const cylinders = resolved.match(/^cylinders_(\d+)$/);
  if (cylinders) {
    if (locale === "ar") return `${cylinders[1]} أسطوانات`;
    if (locale === "ku") return `${cylinders[1]} پستۆن`;
    return `${cylinders[1]} Cylinders`;
  }
  if (resolved === "cylinders_ev") {
    if (locale === "ar") return "كهربائي (EV)";
    if (locale === "ku") return "کارەبایی (EV)";
    return "Electric (EV)";
  }
  const seats = resolved.match(/^seats_(\d+)$/);
  if (seats) return seats[1]!;
  if (resolved === "seats_10_plus") return "10+";

  if (!looksLikeStorageKey(value)) return value;
  return humanizeSlug(value);
}

export function localizeCity(
  locale: Locale,
  raw: string | null | undefined,
): string {
  if (raw == null) return "";
  const value = String(raw).trim();
  if (!value) return "";
  const direct = CITY_LABELS[value] ?? CITY_LABELS[normalizeOptionKey(value)];
  if (direct) return direct[locale] ?? direct.en;
  if (looksLikeStorageKey(value)) return humanizeSlug(value);
  return value;
}

export function listingDescription(car: Car): string {
  for (const key of ["description", "notes", "details", "extraSpecs", "comment"]) {
    const value = car[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function listingFeatureKeys(car: Car): string[] {
  const raw = car.features ?? car.selectedFeatures;
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Treat as a delimiter-separated list from older listings.
    }
    return raw
      .split(/[,،|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function stringField(car: Car, ...keys: string[]): string {
  for (const key of keys) {
    const value = car[key];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

export function formatMileageLabel(
  locale: Locale,
  mileageValue: unknown,
  unitRaw?: unknown,
): string | null {
  if (mileageValue == null || mileageValue === "") return null;
  const amount = Number(mileageValue);
  if (!Number.isFinite(amount)) return null;
  const unitKey = String(unitRaw ?? "km").toLowerCase();
  const unit = unitKey.includes("mi") ? t(locale, "mi") : t(locale, "km");
  return `${amount.toLocaleString()} ${unit}`;
}
