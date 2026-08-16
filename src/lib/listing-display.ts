import type { Car } from "@/lib/api";
import type { Locale } from "@/lib/i18n";
import {
  localizeBrandName,
  localizeModelName,
  localizeTrimName,
  vehicleNameKey,
} from "@/lib/vehicle-names";

const BRAND_LABELS: Record<string, string> = {
  bmw: "BMW",
  byd: "BYD",
  gmc: "GMC",
  mg: "MG",
  mini: "MINI",
  ram: "RAM",
  vw: "Volkswagen",
  volkswagen: "Volkswagen",
  mercedes_benz: "Mercedes-Benz",
  mercedes: "Mercedes-Benz",
  land_rover: "Land Rover",
  range_rover: "Range Rover",
  alfa_romeo: "Alfa Romeo",
  rolls_royce: "Rolls-Royce",
  gac_motor: "GAC Motor",
  ds: "DS",
  kia: "Kia",
};

const TOKEN_LABELS: Record<string, string> = {
  esv: "ESV",
  se: "SE",
  xle: "XLE",
  gx: "GX",
  gxr: "GX.R",
  lx: "LX",
  rx: "RX",
  glc: "GLC",
  gle: "GLE",
  gls: "GLS",
  amg: "AMG",
  vip: "VIP",
  ltd: "Limited",
  limited: "Limited",
  sportage: "Sportage",
  corolla: "Corolla",
  raptor: "Raptor",
  mb: "Mercedes",
};

function slugKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function looksLikeSlug(value: string): boolean {
  const s = value.trim();
  if (!s) return false;
  if (s.includes(" ")) return /_/.test(s);
  return /^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i.test(s) || /^[a-z][a-z0-9]*$/i.test(s);
}

function titleToken(token: string): string {
  const lower = token.toLowerCase();
  if (TOKEN_LABELS[lower]) return TOKEN_LABELS[lower];
  if (/^\d+$/.test(token)) return token;
  if (/^[a-z]\d/i.test(token) && token.length <= 4) return token.toUpperCase();
  if (token.length <= 3 && /^[a-z]+$/i.test(token)) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

export function humanizeSlug(value: string | null | undefined): string {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (!looksLikeSlug(raw)) return raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const key = slugKey(raw);
  if (BRAND_LABELS[key]) return BRAND_LABELS[key];
  return key
    .split(/[_-]+/)
    .filter(Boolean)
    .map(titleToken)
    .join(" ")
    .replace(/\bF (\d+)/gi, "F-$1")
    .replace(/\bC Class\b/gi, "C-Class")
    .replace(/\bS Class\b/gi, "S-Class")
    .replace(/\bE Class\b/gi, "E-Class");
}

function stripBrandPrefix(model: string, brand: string): string {
  if (!model || !brand) return model;
  const brandKey = slugKey(brand).replace(/^mercedes_benz$/, "mercedes");
  const modelTokens = slugKey(model)
    .replace(/^mb_/, "mercedes_")
    .split("_")
    .filter(Boolean);
  const brandTokens = new Set(brandKey.split("_").filter(Boolean));
  while (modelTokens.length > 1 && brandTokens.has(modelTokens[0]!)) {
    modelTokens.shift();
  }
  return humanizeSlug(modelTokens.join("_"));
}

export type ListingTitleInput = {
  make?: unknown;
  model?: unknown;
  brandId?: string;
  modelKey?: string;
  year?: number | string;
  trim?: unknown;
};

function localizedLabel(
  raw: string,
  locale: Locale,
  kind: "brand" | "model" | "trim",
): string {
  if (!raw) return "";
  const localize =
    kind === "brand"
      ? localizeBrandName
      : kind === "model"
        ? localizeModelName
        : localizeTrimName;
  const lookedUp = localize(raw, locale);
  if (lookedUp !== raw) return lookedUp;
  const human = humanizeSlug(raw);
  if (human !== raw) {
    const fromHuman = localize(human, locale);
    if (fromHuman !== human) return fromHuman;
  }
  return human;
}

function isolateLtr(value: string, locale: Locale): string {
  if (!value || locale === "en") return value;
  if (/^[\u0600-\u06FF]/.test(value)) return value;
  return `\u2066${value}\u2069`;
}

function stripYearAndTrim(model: string, year: string, trim: string): string {
  let text = model;
  if (year) {
    text = text.replace(new RegExp(`\\b${year.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), "");
  }
  if (trim) {
    text = text.replace(
      new RegExp(`\\b${trim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"),
      "",
    );
  }
  return text.replace(/\s+/g, " ").trim();
}

export function formatCarTitle(
  car: ListingTitleInput,
  locale: Locale = "en",
): string {
  const brandRaw = String(car.brandId || car.make || "").trim();
  const modelRaw = String(car.modelKey || car.model || "").trim();
  const year = car.year != null && String(car.year).trim() ? String(car.year).trim() : "";
  const trimRaw = car.trim != null ? String(car.trim).trim() : "";

  const brand = localizedLabel(brandRaw, locale, "brand");
  let modelClean = modelRaw;
  if (brandRaw && modelClean) {
    const stripped = stripBrandPrefix(modelRaw, brandRaw);
    if (stripped && vehicleNameKey(stripped) !== vehicleNameKey(brandRaw)) {
      modelClean = stripped;
    }
  }
  modelClean = stripYearAndTrim(modelClean, year, trimRaw);
  if (
    vehicleNameKey(modelClean) === vehicleNameKey(brandRaw) ||
    vehicleNameKey(modelClean) === vehicleNameKey(brand)
  ) {
    modelClean = "";
  }

  const model = modelClean ? localizedLabel(modelClean, locale, "model") : "";
  const trim =
    trimRaw &&
    vehicleNameKey(trimRaw) !== vehicleNameKey(modelRaw) &&
    vehicleNameKey(trimRaw) !== vehicleNameKey(modelClean)
      ? isolateLtr(localizedLabel(trimRaw, locale, "trim"), locale)
      : "";

  return [brand, model, isolateLtr(year, locale), trim].filter(Boolean).join(" ");
}

export function carTitle(
  car: Pick<Car, "year" | "brandId" | "modelKey"> & ListingTitleInput,
  locale: Locale = "en",
) {
  return formatCarTitle(car, locale);
}
