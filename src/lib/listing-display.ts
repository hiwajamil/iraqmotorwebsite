import type { Car } from "@/lib/api";

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

export function formatCarTitle(car: ListingTitleInput): string {
  const brandRaw = String(car.make || car.brandId || "").trim();
  const modelRaw = String(car.model || car.modelKey || "").trim();
  const brand = humanizeSlug(brandRaw);
  let model = humanizeSlug(modelRaw);
  if (brand && model) {
    const stripped = stripBrandPrefix(modelRaw || model, brandRaw || brand);
    if (stripped && slugKey(stripped) !== slugKey(brandRaw || brand)) {
      model = looksLikeSlug(stripped) ? humanizeSlug(stripped) : stripped;
    }
    if (slugKey(model) === slugKey(brandRaw || brand) || slugKey(model) === slugKey(brand)) {
      model = "";
    }
  }
  const year = car.year != null && String(car.year).trim() ? String(car.year).trim() : "";
  const trimRaw = car.trim != null ? String(car.trim).trim() : "";
  const trim =
    trimRaw &&
    slugKey(trimRaw) !== slugKey(modelRaw) &&
    !slugKey(model).includes(slugKey(trimRaw))
      ? humanizeSlug(trimRaw)
      : "";
  return [brand, model, year, trim].filter(Boolean).join(" ");
}

export function carTitle(car: Pick<Car, "year" | "brandId" | "modelKey"> & ListingTitleInput) {
  return formatCarTitle(car);
}
