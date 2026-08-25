import { api, type Car } from "@/lib/api";
import { t, type Locale } from "@/lib/i18n";

/** Matches backend / iQ Cars AdType. */
export const AdvertiseType = {
  UrlAndPhone: 1,
  Car: 2,
  Showroom: 3,
} as const;

export type AdvertiseTypeId =
  (typeof AdvertiseType)[keyof typeof AdvertiseType];

export type Advertise = {
  id: string;
  advertiseTypeId?: AdvertiseTypeId;
  locationIds?: string[];
  title?: string;
  description?: string;
  phone?: string;
  url?: string;
  actionLink?: string | { en?: string; ar?: string; ku?: string } | null;
  targetLink?: string | null;
  slotPosition?: string;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  carId?: string;
  showroomId?: string;
  showroomSellerId?: string;
  showroomUserName?: string;
  forceExternalUrl?: boolean;
  impressionLimit?: number | null;
  impressionCount?: number;
  clickCount?: number;
  webLandscapeImageUrl?: string;
  landscapeImageUrl?: string;
  webImageUrl?: string;
  imageUrl?: string;
  detailImageUrl?: string;
  WebLandscapeImageUrlEn?: string;
  LandscapeImageUrlEn?: string;
  WebImageUrlEn?: string;
  ImageUrlEn?: string;
};

/**
 * Display fields the homepage banner consumes.
 * Super Admin ads will supply these from the database; the house banner is the fallback.
 */
export type AdBannerContent = {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  targetLink?: string | null;
};

export const DEFAULT_HOME_BANNER: Required<AdBannerContent> = {
  title: "iraqMotors",
  description: "Iraq marketplace for verified cars",
  imageUrl: null,
  targetLink: "/",
};

export type AdSurface = "homeBanner" | "gridTile";
export type AdViewport = "mobile" | "desktop";

/** How often to insert a grid creative among cars (iQ Cars uses every 11). */
export const AD_GRID_EVERY = 11;

export type GridItem =
  | { kind: "car"; car: Car; key: string }
  | { kind: "ad"; ad: Advertise; key: string };

function firstNonEmpty(...values: Array<string | undefined | null>): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Seed creatives live in website/public/ads so the banner is same-origin. */
export function localizeAdAsset(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/media\/ads\/([^/?#]+)$/i);
  if (match) return `/ads/${match[1]}`;
  return url;
}

/**
 * Placement is chosen by surface + viewport (not a separate slot ID).
 * Creative field names encode intended size — same strategy as iQ Cars.
 */
export function resolveAdImage(
  ad: Advertise,
  surface: AdSurface,
  viewport: AdViewport,
): string | null {
  let src: string | null = null;
  if (surface === "homeBanner") {
    src =
      viewport === "desktop"
        ? firstNonEmpty(
            ad.webLandscapeImageUrl,
            ad.WebLandscapeImageUrlEn,
            ad.landscapeImageUrl,
            ad.LandscapeImageUrlEn,
            ad.webImageUrl,
            ad.imageUrl,
          )
        : firstNonEmpty(
            ad.landscapeImageUrl,
            ad.LandscapeImageUrlEn,
            ad.webLandscapeImageUrl,
            ad.WebLandscapeImageUrlEn,
            ad.imageUrl,
          );
  } else if (viewport === "desktop") {
    src = firstNonEmpty(
      ad.webImageUrl,
      ad.WebImageUrlEn,
      ad.imageUrl,
      ad.ImageUrlEn,
      ad.landscapeImageUrl,
    );
  } else {
    src = firstNonEmpty(
      ad.landscapeImageUrl,
      ad.LandscapeImageUrlEn,
      ad.webImageUrl,
      ad.imageUrl,
    );
  }
  return localizeAdAsset(src);
}

/** House/seed creatives are placeholders, not Super Admin placements. */
export function isExternalAd(ad: Advertise): boolean {
  return !ad.id.startsWith("seed-");
}

/**
 * Pick an active external homepage banner.
 * Returns null when none is active so the UI can fall back to DEFAULT_HOME_BANNER.
 */
export function pickHomeBannerAd(ads: Advertise[]): Advertise | null {
  const banners = ads.filter((ad) => {
    if (!isExternalAd(ad)) return false;
    return normalizeAdSlot(ad.slotPosition) === "home_banner";
  });
  return banners[0] ?? null;
}

export function interleaveAdsInGrid(
  cars: Car[],
  ads: Advertise[],
  every = AD_GRID_EVERY,
): GridItem[] {
  if (!cars.length) return [];
  const pool = ads.filter(
    (ad) => Boolean(ad) && normalizeAdSlot(ad.slotPosition) === "grid_tile",
  );
  const out: GridItem[] = [];
  let adCursor = 0;

  cars.forEach((car, index) => {
    out.push({ kind: "car", car, key: `car-${car.id}` });
    const position = index + 1;
    if (pool.length > 0 && position % every === 0) {
      const ad = pool[adCursor % pool.length]!;
      adCursor += 1;
      out.push({ kind: "ad", ad, key: `ad-${ad.id}-${position}` });
    }
  });

  return out;
}

export async function fetchAds(opts?: {
  langCode?: string;
  locationId?: string | null;
  listSize?: number;
  slot?: string;
  advertiseTypeIds?: AdvertiseTypeId[];
}): Promise<Advertise[]> {
  const query = {
    langCode: opts?.langCode || "en",
    listSize: String(opts?.listSize ?? 12),
    ...(opts?.slot ? { slot: opts.slot } : {}),
    ...(opts?.locationId ? { locationId: opts.locationId } : {}),
  };
  const body = {
    LocationIds: opts?.locationId ? [opts.locationId] : [],
    AdvertiseTypeIds: opts?.advertiseTypeIds ?? [1, 2, 3],
    langCode: opts?.langCode || "en",
    ...(opts?.slot ? { slot: opts.slot } : {}),
  };
  try {
    const data = await api.post<{ items: Advertise[] }>(
      `/ads?${new URLSearchParams(query).toString()}`,
      body,
    );
    return data.items ?? [];
  } catch {
    try {
      const data = await api.get<{ items: Advertise[] }>("/ads", query);
      return data.items ?? [];
    } catch {
      return [];
    }
  }
}

export async function trackAdEvent(
  id: string,
  kind: "click" | "call",
  extra?: { locationId?: string | null; userUniqueId?: string | null },
): Promise<void> {
  if (!id) return;
  try {
    await Promise.race([
      api.post(`/ads/${id}/${kind}`, extra ?? {}),
      new Promise<void>((resolve) => {
        setTimeout(resolve, 400);
      }),
    ]);
  } catch {
    // Missing destination / network must never break navigation.
  }
}

function localizedText(
  value: string | { en?: string; ar?: string; ku?: string } | null | undefined,
  locale: Locale = "en",
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  return (
    firstNonEmpty(value[locale], value.en, value.ar, value.ku)
  );
}

export function adHref(ad: Advertise, locale: Locale = "en"): string | null {
  const type = ad.advertiseTypeId ?? AdvertiseType.UrlAndPhone;
  if (type === AdvertiseType.Car && ad.carId) {
    return `/cars/${ad.carId}`;
  }
  if (type === AdvertiseType.Showroom) {
    const rawName = ad.showroomUserName?.trim();
    if (rawName && (/^https?:\/\//i.test(rawName) || rawName.startsWith("/"))) {
      return rawName;
    }
    const seller = ad.showroomSellerId || ad.showroomId;
    if (seller) return `/cars?sellerId=${encodeURIComponent(seller)}`;
    if (rawName) return `/${rawName.replace(/^\/+/, "")}`;
    const showroomUrl = localizedText(
      typeof ad.url === "string" ? ad.url : undefined,
      locale,
    );
    if (showroomUrl) return showroomUrl;
  }
  const action = localizedText(ad.actionLink, locale);
  if (action) return action;
  if (ad.phone) return `tel:${ad.phone.replace(/\s+/g, "")}`;
  if (ad.url) return localizedText(ad.url, locale);
  if (ad.targetLink) return ad.targetLink;
  return null;
}

export function resolveHomeBannerContent(
  ad: Advertise | null | undefined,
  viewport: AdViewport,
  overrides: AdBannerContent = {},
  locale: Locale = "en",
): Required<AdBannerContent> {
  const imageUrl =
    overrides.imageUrl !== undefined
      ? overrides.imageUrl
      : ad
        ? resolveAdImage(ad, "homeBanner", viewport)
        : DEFAULT_HOME_BANNER.imageUrl;
  const targetLink =
    overrides.targetLink !== undefined
      ? overrides.targetLink
      : ad
        ? adHref(ad, locale)
        : DEFAULT_HOME_BANNER.targetLink;

  return {
    title: overrides.title || ad?.title || DEFAULT_HOME_BANNER.title,
    description:
      overrides.description ||
      ad?.description ||
      t(locale, "adDefaultDescription"),
    imageUrl,
    targetLink,
  };
}

export const AD_TYPE_LABELS: Record<AdvertiseTypeId, string> = {
  1: "URL / phone",
  2: "Car listing",
  3: "Showroom",
};

export const AD_TARGET_CITIES = [
  { key: "*", label: "Nationwide" },
  { key: "baghdad", label: "Baghdad" },
  { key: "erbil", label: "Erbil" },
  { key: "sulaymaniyah", label: "Sulaymaniyah" },
  { key: "dohuk", label: "Duhok" },
  { key: "kirkuk", label: "Kirkuk" },
  { key: "mosul", label: "Mosul" },
  { key: "basra", label: "Basra" },
  { key: "najaf", label: "Najaf" },
  { key: "karbala", label: "Karbala" },
  { key: "anbar", label: "Anbar" },
  { key: "salahuddin", label: "Salahuddin" },
  { key: "babylon", label: "Babylon" },
  { key: "diyala", label: "Diyala" },
  { key: "wasit", label: "Wasit" },
  { key: "muthanna", label: "Muthanna" },
  { key: "qadisiyyah", label: "Qadisiyyah" },
  { key: "halabja", label: "Halabja" },
  { key: "dhi_qar", label: "Dhi Qar" },
  { key: "maysan", label: "Maysan" },
] as const;

export const AD_CREATIVE_SLOTS = [
  {
    key: "webLandscape" as const,
    label: "Desktop home banner",
    size: "1440×180",
  },
  {
    key: "landscape" as const,
    label: "Mobile banner / in-feed",
    size: "1200×390",
  },
  {
    key: "webSquare" as const,
    label: "Desktop grid tile",
    size: "750×750",
  },
  {
    key: "portrait" as const,
    label: "App / portrait tile",
    size: "1020×1200",
  },
];

export const AD_SLOTS = [
  { key: "home_banner", labelKey: "adSlotHomeBanner" as const },
  { key: "grid_tile", labelKey: "adSlotGridTile" as const },
] as const;

export type AdSlotKey = (typeof AD_SLOTS)[number]["key"];

/** Per-slot creative target (one image_url is still copied to all sizes). */
export const AD_CREATIVE_SIZES: Record<
  AdSlotKey,
  { size: string; aspect: string }
> = {
  home_banner: { size: "1440×180", aspect: "8 / 1" },
  grid_tile: { size: "750×750", aspect: "1 / 1" },
};

export type AdDeliveryState = "live" | "scheduled" | "expired" | "disabled";

export function normalizeAdSlot(raw?: string | null): string {
  const value = (raw || "home_banner").trim();
  if (!value) return "home_banner";
  if (value === "homeBanner" || value === "home-banner") return "home_banner";
  if (value === "gridTile" || value === "grid-tile") return "grid_tile";
  return value.replace(/\s+/g, "_");
}

export function adImageUrl(ad: AdvertiseAdmin): string | null {
  return (
    ad.imageUrl ||
    ad.creatives?.webLandscape ||
    ad.creatives?.landscape ||
    ad.creatives?.webSquare ||
    ad.creatives?.portrait ||
    null
  );
}

export function adHasCreative(ad: AdvertiseAdmin): boolean {
  return Boolean(adImageUrl(ad));
}

/** `is_active` flag only — not the public date window. */
export function adIsEnabled(ad: AdvertiseAdmin): boolean {
  return ad.isActive ?? ad.active !== false;
}

/** @deprecated Use adIsEnabled for the flag, adDeliveryState for serving. */
export function adIsActive(ad: AdvertiseAdmin): boolean {
  return adIsEnabled(ad);
}

function parseAdTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Same window as backend listActiveAds:
 * start IS NULL OR start <= now(UTC), end IS NULL OR end >= now(UTC).
 */
export function adInServeWindow(
  ad: Pick<AdvertiseAdmin, "startDate" | "endDate">,
  now = new Date(),
): "open" | "scheduled" | "expired" {
  const t = now.getTime();
  const start = parseAdTime(ad.startDate);
  const end = parseAdTime(ad.endDate);
  if (start != null && start > t) return "scheduled";
  if (end != null && end < t) return "expired";
  return "open";
}

export function adDeliveryState(
  ad: AdvertiseAdmin,
  now = new Date(),
): AdDeliveryState {
  if (!adIsEnabled(ad)) return "disabled";
  const window = adInServeWindow(ad, now);
  if (window === "scheduled") return "scheduled";
  if (window === "expired") return "expired";
  return "live";
}

export function adDeliveryBadgeClass(state: AdDeliveryState): string {
  switch (state) {
    case "live":
      return "bg-emerald-500/15 text-emerald-700";
    case "scheduled":
      return "bg-amber-500/15 text-amber-700";
    case "expired":
      return "bg-slate-500/15 text-slate-600";
    default:
      return "bg-input text-muted";
  }
}

/** Winner for a slot: live ads, newest updated_at first (matches listActiveAds). */
export function pickLiveAdForSlot(
  ads: AdvertiseAdmin[],
  slot: AdSlotKey,
): AdvertiseAdmin | null {
  const live = ads
    .filter(
      (ad) =>
        normalizeAdSlot(ad.slotPosition) === slot &&
        adDeliveryState(ad) === "live",
    )
    .sort((a, b) => {
      const au = parseAdTime(a.updatedAt) ?? 0;
      const bu = parseAdTime(b.updatedAt) ?? 0;
      return bu - au;
    });
  return live[0] ?? null;
}

export function liveAdsInSlot(
  ads: AdvertiseAdmin[],
  slot: string,
  excludeId?: string,
): AdvertiseAdmin[] {
  const key = normalizeAdSlot(slot);
  return ads.filter((ad) => {
    if (excludeId && ad.id === excludeId) return false;
    return (
      normalizeAdSlot(ad.slotPosition) === key &&
      adDeliveryState(ad) === "live"
    );
  });
}

export function adSlotLabel(locale: Locale, slot?: string | null): string {
  const key = normalizeAdSlot(slot);
  const found = AD_SLOTS.find((s) => s.key === key);
  return found ? t(locale, found.labelKey) : slot || t(locale, "adSlotBanner");
}

function formatInZone(
  iso: string | null | undefined,
  timeZone: string,
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  });
}

export function formatAdDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatAdDateUtc(iso: string | null | undefined): string {
  const formatted = formatInZone(iso, "UTC");
  return formatted === "—" ? "—" : `${formatted} UTC`;
}

export function formatAdDateIraq(iso: string | null | undefined): string {
  return formatInZone(iso, "Asia/Baghdad");
}

export type AdvertiseAdmin = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  targetLink?: string | null;
  slotPosition?: string;
  isActive?: boolean;
  active?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  source?: "store" | "seed";
  url?: string | null;
  advertiseTypeId?: AdvertiseTypeId;
  locationIds?: string[];
  phone?: string | null;
  carId?: string | null;
  showroomId?: string | null;
  showroomSellerId?: string | null;
  showroomUserName?: string | null;
  forceExternalUrl?: boolean;
  impressionLimit?: number | null;
  impressionCount?: number;
  clickCount?: number;
  titleLocalized?: { en?: string | null; ar?: string | null; ku?: string | null };
  actionLink?: string | { en?: string | null; ar?: string | null; ku?: string | null } | null;
  urls?: { en?: string | null; ar?: string | null; ku?: string | null };
  creatives?: {
    webLandscape?: string | null;
    landscape?: string | null;
    webSquare?: string | null;
    portrait?: string | null;
    detail?: string | null;
  };
  creativesLocalized?: {
    en?: AdvertiseAdmin["creatives"];
    ar?: AdvertiseAdmin["creatives"];
    ku?: AdvertiseAdmin["creatives"];
  };
};
