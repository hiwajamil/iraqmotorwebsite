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

export type AdvertiseAdmin = {
  id: string;
  advertiseTypeId: AdvertiseTypeId;
  locationIds: string[];
  title?: Partial<Record<"en" | "ar" | "ku", string>>;
  phone?: string | null;
  url?: string | null;
  carId?: string | null;
  showroomId?: string | null;
  showroomSellerId?: string | null;
  creatives: {
    webLandscape?: string;
    landscape?: string;
    webSquare?: string;
    portrait?: string;
  };
  priority?: number;
  active?: boolean;
  source?: "store" | "seed";
};
