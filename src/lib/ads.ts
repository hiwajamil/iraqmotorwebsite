import { api, type Car } from "@/lib/api";

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
  advertiseTypeId: AdvertiseTypeId;
  locationIds?: string[];
  title?: string;
  phone?: string;
  url?: string;
  carId?: string;
  showroomId?: string;
  showroomSellerId?: string;
  webLandscapeImageUrl?: string;
  landscapeImageUrl?: string;
  webImageUrl?: string;
  imageUrl?: string;
  WebLandscapeImageUrlEn?: string;
  LandscapeImageUrlEn?: string;
  WebImageUrlEn?: string;
  ImageUrlEn?: string;
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

/**
 * Placement is chosen by surface + viewport (not a separate slot ID).
 * Creative field names encode intended size — same strategy as iQ Cars.
 */
export function resolveAdImage(
  ad: Advertise,
  surface: AdSurface,
  viewport: AdViewport,
): string | null {
  if (surface === "homeBanner") {
    if (viewport === "desktop") {
      return firstNonEmpty(
        ad.webLandscapeImageUrl,
        ad.WebLandscapeImageUrlEn,
        ad.landscapeImageUrl,
        ad.LandscapeImageUrlEn,
        ad.webImageUrl,
        ad.imageUrl,
      );
    }
    return firstNonEmpty(
      ad.landscapeImageUrl,
      ad.LandscapeImageUrlEn,
      ad.webLandscapeImageUrl,
      ad.WebLandscapeImageUrlEn,
      ad.imageUrl,
    );
  }

  // gridTile
  if (viewport === "desktop") {
    return firstNonEmpty(
      ad.webImageUrl,
      ad.WebImageUrlEn,
      ad.imageUrl,
      ad.ImageUrlEn,
      ad.landscapeImageUrl,
    );
  }
  return firstNonEmpty(
    ad.landscapeImageUrl,
    ad.LandscapeImageUrlEn,
    ad.webImageUrl,
    ad.imageUrl,
  );
}

/** Prefer index [1] then [0] for homepage banner (iQ Cars behavior). */
export function pickHomeBannerAd(ads: Advertise[]): Advertise | null {
  if (!ads.length) return null;
  return ads[1] ?? ads[0] ?? null;
}

export function interleaveAdsInGrid(
  cars: Car[],
  ads: Advertise[],
  every = AD_GRID_EVERY,
): GridItem[] {
  if (!cars.length) return [];
  const pool = ads.filter(Boolean);
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
  advertiseTypeIds?: AdvertiseTypeId[];
}): Promise<Advertise[]> {
  const locationId = opts?.locationId || undefined;
  try {
    const data = await api.post<{ items: Advertise[] }>(
      `/ads?${new URLSearchParams({
        langCode: opts?.langCode || "en",
        listSize: String(opts?.listSize ?? 12),
        ...(locationId ? { locationId } : {}),
      }).toString()}`,
      {
        LocationIds: locationId ? [locationId] : [],
        AdvertiseTypeIds: opts?.advertiseTypeIds ?? [1, 2, 3],
      },
    );
    return data.items ?? [];
  } catch {
    try {
      const data = await api.get<{ items: Advertise[] }>("/ads", {
        langCode: opts?.langCode || "en",
        listSize: String(opts?.listSize ?? 12),
        ...(locationId ? { locationId } : {}),
      });
      return data.items ?? [];
    } catch {
      return [];
    }
  }
}

export function adHref(ad: Advertise): string | null {
  if (ad.advertiseTypeId === AdvertiseType.Car && ad.carId) {
    return `/cars/${ad.carId}`;
  }
  if (ad.advertiseTypeId === AdvertiseType.Showroom) {
    if (ad.showroomSellerId) return `/cars?sellerId=${encodeURIComponent(ad.showroomSellerId)}`;
    if (ad.url) return ad.url;
  }
  if (ad.url) return ad.url;
  if (ad.phone) return `tel:${ad.phone.replace(/\s+/g, "")}`;
  return null;
}
