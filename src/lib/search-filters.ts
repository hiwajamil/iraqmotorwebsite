import { SEARCH_CITY_KEYS } from "@/lib/listing-form-options";
import type { DictKey } from "@/lib/i18n";

export const FILTER_YEAR_MIN = 1990;
export const FILTER_YEAR_MAX = 2026;

export const SEARCH_CITIES = SEARCH_CITY_KEYS;

export const SEAT_FILTER_OPTIONS = [2, 4, 5, 6, 7, 8, 9, 10] as const;

export const BODY_TYPE_FILTERS = [
  {
    id: "SUV",
    labelKey: "filterBodySuv",
    image: "/images/body-types/suv.png",
  },
  {
    id: "Sedan",
    labelKey: "filterBodySedan",
    image: "/images/body-types/sedan.png",
  },
  {
    id: "Coupe",
    labelKey: "filterBodyCoupe",
    image: "/images/body-types/coupe.png",
  },
  {
    id: "Hatchback",
    labelKey: "filterBodyHatchback",
    image: "/images/body-types/hatchback.png",
  },
  {
    id: "Pickup",
    labelKey: "filterBodyPickup",
    image: "/images/body-types/pickup.png",
  },
  {
    id: "Minivan",
    labelKey: "filterBodyMinivan",
    image: "/images/body-types/minivan.png",
  },
  {
    id: "Convertible",
    labelKey: "filterBodyConvertible",
    image: "/images/body-types/convertible.png",
  },
] as const;

export type BodyTypeFilterId = (typeof BODY_TYPE_FILTERS)[number]["id"];

export const FUEL_TYPE_FILTERS = [
  { id: "Petrol", optionKey: "engine_petrol" },
  { id: "Diesel", optionKey: "engine_diesel" },
  { id: "Hybrid", optionKey: "engine_hybrid" },
  { id: "Electric", optionKey: "engine_ev" },
] as const;

export type FuelTypeFilterId = (typeof FUEL_TYPE_FILTERS)[number]["id"];

export const COLOR_FILTERS = [
  { id: "White", optionKey: "color_white" },
  { id: "Black", optionKey: "color_black" },
  { id: "Silver", optionKey: "color_silver" },
  { id: "Gray", optionKey: "color_gray" },
  { id: "Red", optionKey: "color_red" },
  { id: "Blue", optionKey: "color_blue" },
  { id: "Green", optionKey: "color_green" },
] as const;

export type ColorFilterId = (typeof COLOR_FILTERS)[number]["id"];

export type SearchCurrency = "USD" | "IQD";
export type SearchCondition = "" | "used" | "new" | "certified";
export type SearchSellerType = "" | "individual" | "dealer";

export type SearchFilterState = {
  city: string | null;
  minYear: number | null;
  maxYear: number | null;
  q: string;
  minPrice: number | null;
  maxPrice: number | null;
  currency: SearchCurrency;
  minMileage: number | null;
  maxMileage: number | null;
  seats: number[];
  bodyTypes: BodyTypeFilterId[];
  fuelTypes: FuelTypeFilterId[];
  colors: ColorFilterId[];
  condition: SearchCondition;
  sellerType: SearchSellerType;
};

export const emptySearchFilters = (): SearchFilterState => ({
  city: null,
  minYear: null,
  maxYear: null,
  q: "",
  minPrice: null,
  maxPrice: null,
  currency: "USD",
  minMileage: null,
  maxMileage: null,
  seats: [],
  bodyTypes: [],
  fuelTypes: [],
  colors: [],
  condition: "",
  sellerType: "",
});

export const CARS_PAGE_SIZE = 20;

export type SearchFilterExtras = {
  brandId?: string | null;
  sort?: string | null;
  sellerId?: string | null;
  status?: string | null;
  page?: number | null;
};

function optionalInt(raw: string | null, min: number, max: number): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function isBodyTypeId(value: string): value is BodyTypeFilterId {
  return BODY_TYPE_FILTERS.some((item) => item.id === value);
}

function isFuelTypeId(value: string): value is FuelTypeFilterId {
  return FUEL_TYPE_FILTERS.some((item) => item.id === value);
}

function isColorId(value: string): value is ColorFilterId {
  return COLOR_FILTERS.some((item) => item.id === value);
}

export function parseSearchFilters(
  params: URLSearchParams | { get(name: string): string | null },
): SearchFilterState {
  const seatsRaw = params.get("seats") ?? "";
  const bodyRaw = params.get("bodyType") ?? "";
  const fuelRaw = params.get("fuelType") ?? "";
  const colorRaw = params.get("color") ?? "";
  const currencyRaw = (params.get("currency") ?? "").toUpperCase();
  const conditionRaw = (params.get("condition") ?? "").toLowerCase();
  const sellerRaw = (params.get("sellerType") ?? "").toLowerCase();

  const seats = seatsRaw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => SEAT_FILTER_OPTIONS.includes(n as (typeof SEAT_FILTER_OPTIONS)[number]));

  const bodyTypes = bodyRaw
    .split(",")
    .map((part) => part.trim())
    .filter(isBodyTypeId);

  const fuelTypes = fuelRaw
    .split(",")
    .map((part) => part.trim())
    .filter(isFuelTypeId);

  const colors = colorRaw
    .split(",")
    .map((part) => part.trim())
    .filter(isColorId);

  const condition: SearchCondition =
    conditionRaw === "used" ||
    conditionRaw === "new" ||
    conditionRaw === "certified"
      ? conditionRaw
      : "";

  const sellerType: SearchSellerType =
    sellerRaw === "individual" || sellerRaw === "dealer"
      ? sellerRaw
      : sellerRaw === "showroom"
        ? "dealer"
        : "";

  return {
    city: params.get("city")?.trim() || null,
    minYear: optionalInt(params.get("minYear"), FILTER_YEAR_MIN, FILTER_YEAR_MAX),
    maxYear: optionalInt(params.get("maxYear"), FILTER_YEAR_MIN, FILTER_YEAR_MAX),
    q: params.get("q") ?? params.get("search") ?? "",
    minPrice: optionalInt(params.get("minPrice"), 0, 1_000_000_000),
    maxPrice: optionalInt(params.get("maxPrice"), 0, 1_000_000_000),
    currency: currencyRaw === "IQD" ? "IQD" : "USD",
    minMileage: optionalInt(params.get("minMileage"), 0, 10_000_000),
    maxMileage: optionalInt(params.get("maxMileage"), 0, 10_000_000),
    seats,
    bodyTypes,
    fuelTypes,
    colors,
    condition,
    sellerType,
  };
}

export function serializeSearchFilters(
  filters: SearchFilterState,
  extras: SearchFilterExtras = {},
): string {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.minYear != null) params.set("minYear", String(filters.minYear));
  if (filters.maxYear != null) params.set("maxYear", String(filters.maxYear));
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minPrice != null || filters.maxPrice != null) {
    params.set("currency", filters.currency);
  }
  if (filters.minMileage != null) {
    params.set("minMileage", String(filters.minMileage));
  }
  if (filters.maxMileage != null) {
    params.set("maxMileage", String(filters.maxMileage));
  }
  if (filters.seats.length) params.set("seats", filters.seats.join(","));
  if (filters.bodyTypes.length) {
    params.set("bodyType", filters.bodyTypes.join(","));
  }
  if (filters.fuelTypes.length) {
    params.set("fuelType", filters.fuelTypes.join(","));
  }
  if (filters.colors.length) params.set("color", filters.colors.join(","));
  if (filters.condition) params.set("condition", filters.condition);
  if (filters.sellerType) params.set("sellerType", filters.sellerType);
  if (extras.brandId) params.set("brandId", extras.brandId);
  if (extras.sort && extras.sort !== "newest") params.set("sort", extras.sort);
  if (extras.sellerId) params.set("sellerId", extras.sellerId);
  if (extras.status) params.set("status", extras.status);
  if (extras.page != null && extras.page > 1) {
    params.set("page", String(Math.trunc(extras.page)));
  }
  return params.toString();
}

export function searchFiltersActive(filters: SearchFilterState): boolean {
  return Boolean(
    filters.city ||
      filters.minYear != null ||
      filters.maxYear != null ||
      filters.q.trim() ||
      filters.minPrice != null ||
      filters.maxPrice != null ||
      filters.minMileage != null ||
      filters.maxMileage != null ||
      filters.seats.length ||
      filters.bodyTypes.length ||
      filters.fuelTypes.length ||
      filters.colors.length ||
      filters.condition ||
      filters.sellerType,
  );
}

export function toCarsApiParams(
  filters: SearchFilterState,
  extras: SearchFilterExtras = {},
): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.city) params.city = filters.city;
  if (filters.minYear != null) params.minYear = String(filters.minYear);
  if (filters.maxYear != null) params.maxYear = String(filters.maxYear);
  if (filters.q.trim()) params.q = filters.q.trim();
  if (filters.minPrice != null) params.minPrice = String(filters.minPrice);
  if (filters.maxPrice != null) params.maxPrice = String(filters.maxPrice);
  if (filters.minPrice != null || filters.maxPrice != null) {
    params.currency = filters.currency;
  }
  if (filters.minMileage != null) params.minMileage = String(filters.minMileage);
  if (filters.maxMileage != null) params.maxMileage = String(filters.maxMileage);
  if (filters.seats.length) params.seats = filters.seats.join(",");
  if (filters.bodyTypes.length) params.bodyType = filters.bodyTypes.join(",");
  if (filters.fuelTypes.length) params.fuelType = filters.fuelTypes.join(",");
  if (filters.colors.length) params.color = filters.colors.join(",");
  if (filters.condition) params.condition = filters.condition;
  if (filters.sellerType) params.sellerType = filters.sellerType;
  if (extras.brandId) params.brandId = extras.brandId;
  if (extras.sort) params.sort = extras.sort;
  if (extras.sellerId) params.sellerId = extras.sellerId;
  if (extras.status) params.status = extras.status;
  if (extras.page != null && extras.page >= 1) {
    params.page = String(Math.trunc(extras.page));
  }
  return params;
}

export const CONDITION_FILTER_OPTIONS: {
  id: Exclude<SearchCondition, "">;
  labelKey: DictKey;
}[] = [
  { id: "used", labelKey: "filterConditionUsed" },
  { id: "new", labelKey: "filterConditionNew" },
  { id: "certified", labelKey: "filterConditionCertified" },
];

export const SELLER_TYPE_OPTIONS: {
  id: Exclude<SearchSellerType, "">;
  labelKey: DictKey;
}[] = [
  { id: "individual", labelKey: "filterSellerIndividual" },
  { id: "dealer", labelKey: "filterSellerDealer" },
];
