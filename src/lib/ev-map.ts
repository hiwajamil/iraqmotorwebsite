import type { Locale } from "@/lib/i18n";

export type Localized = { en: string; ar: string; ku: string };

export type EvLookup = {
  id: number | null;
  key: string;
  text: string;
  nameEn: string;
  nameAr: string;
  nameKu: string;
};

export type EvMapMarker = {
  id: string;
  stationId?: string;
  operatorNameEn: string;
  operatorNameAr: string;
  operatorNameKu: string;
  status: EvLookup;
  accessType: EvLookup;
  locationType: EvLookup;
  city: Localized;
  district?: { en: string; ar: string; ku?: string };
  neighborhood?: { en: string; ar: string; ku?: string };
  latitude: number | null;
  longitude: number | null;
  maxPowerKw: number | null;
  averageRating: number | null;
  ratingCount: number;
  connectorTypes: string[];
  pricingModels: string[];
  plugTypes: string[];
  coverImageMediumUrl: string | null;
  contactCount: number;
  hasAc: boolean;
  hasDc: boolean;
  alwaysOpen: boolean;
  /** Server-computed open-now hint (Asia/Baghdad). null = unknown schedule. */
  openNow?: boolean | null;
};

export type EvOpeningHourSlot = {
  dayOfWeekId: number;
  startTime: string;
  endTime: string;
};

/** Workbook fallback until map API includes ku + openNow. */
export type EvMapEnrichEntry = {
  neighborhood?: { ku?: string };
  district?: { ku?: string };
  openingHours?: EvOpeningHourSlot[];
};

export type EvMapEnrichMap = Record<string, EvMapEnrichEntry>;

export type EvCity = {
  id: string;
  nameEn: string;
  nameAr: string;
  nameKu: string;
  stationsOnMap: number;
};

export type EvConnectorType = {
  id: string;
  nameEn: string;
  nameAr: string;
  nameKu: string;
  chargerType: EvLookup;
  imageUrl: string | null;
};

export type EvCounts = {
  stationsCount: number;
  chargingPortsCount: number;
  connectorsCount: number;
};

export type EvConnector = {
  id: number;
  connectorIndex: number;
  connectorTypeId: string;
  connectorTypeNameEn: string;
  connectorTypeNameAr: string;
  connectorTypeNameKu: string;
  connectorTypeImageUrl: string | null;
  chargerType: EvLookup;
  powerKw: number | null;
  plugType: EvLookup;
  pricingModel: EvLookup;
  currency: EvLookup;
  price: number | null;
  status: EvLookup;
};

export type EvPort = {
  id: number;
  portIndex: number;
  portLabel: string;
  status: EvLookup;
  accessRestriction: EvLookup;
  lastHeartbeatAt: string | null;
  connectors: EvConnector[];
};

export type EvStationDetail = EvMapMarker & {
  operator: Localized;
  accessRestriction: EvLookup;
  address: Localized;
  description: Localized;
  googleMapsLink: string;
  minPowerKw: number | null;
  paymentTypes: Localized;
  coverImageUrl: string | null;
  amenities: Localized[];
  openingHours: {
    dayOfWeekId: number | null;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }[];
  operatorContacts: {
    id: number;
    contactType: EvLookup;
    contactValue: string;
    disableWhatsapp: boolean;
    disablePhoneNumber: boolean;
  }[];
  images: {
    id: string;
    role: string;
    url: string;
    mediumUrl: string;
    smallUrl: string;
  }[];
  ports: EvPort[];
  reviews: {
    id: string;
    publicUserName: string;
    publicUserFullName: string;
    comment: string;
    rate: number | null;
    createdAt: string;
  }[];
  ratingSummary: {
    averageRating: number | null;
    ratingCount: number;
  };
};

/** Drop public photo URLs even if the API has not been redeployed yet. */
export function sanitizePublicStationDetail(d: EvStationDetail): EvStationDetail {
  return {
    ...d,
    coverImageUrl: null,
    coverImageMediumUrl: null,
    images: [],
  };
}

export function locText(
  locale: Locale,
  value: Localized | EvLookup | undefined | null,
  fallback = "",
): string {
  if (!value) return fallback;
  if ("nameEn" in value) {
    if (locale === "ar") return value.nameAr || value.nameEn || fallback;
    if (locale === "ku") return value.nameKu || value.nameEn || fallback;
    return value.nameEn || fallback;
  }
  if (locale === "ar") return value.ar || value.en || fallback;
  if (locale === "ku") return value.ku || value.en || fallback;
  return value.en || fallback;
}

export function operatorName(marker: EvMapMarker, locale: Locale): string {
  if (locale === "ar") return marker.operatorNameAr || marker.operatorNameEn;
  if (locale === "ku") return marker.operatorNameKu || marker.operatorNameEn;
  return marker.operatorNameEn;
}

export function cityName(city: EvCity | Localized, locale: Locale): string {
  if ("nameEn" in city) {
    if (locale === "ar") return city.nameAr || city.nameEn;
    if (locale === "ku") return city.nameKu || city.nameEn;
    return city.nameEn;
  }
  return locText(locale, city);
}

export function connectorTypeName(
  ct: EvConnectorType,
  locale: Locale,
): string {
  if (locale === "ar") return ct.nameAr || ct.nameEn;
  if (locale === "ku") return ct.nameKu || ct.nameEn;
  return ct.nameEn;
}

export function phoneHref(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export function waHref(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export function markerAreaLabel(marker: EvMapMarker, locale: Locale): string {
  const neighborhood = marker.neighborhood?.en
    ? locText(locale, {
        en: marker.neighborhood.en,
        ar: marker.neighborhood.ar || marker.neighborhood.en,
        ku: marker.neighborhood.ku || marker.neighborhood.en,
      })
    : "";
  const city = locText(locale, marker.city);
  if (neighborhood && city) return `${neighborhood}, ${city}`;
  return neighborhood || city || "";
}

function parseTimeToMinutes(time: string): number {
  const parts = time.trim().split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

function baghdadNow(): { dayId: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baghdad",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    dayId: weekdayMap[get("weekday")] ?? new Date().getDay(),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** Open-now from weekly hours (Asia/Baghdad). null = unknown schedule. */
export function stationOpenNowFromHours(
  alwaysOpen: boolean,
  hours: EvOpeningHourSlot[],
): boolean | null {
  if (alwaysOpen) return true;
  if (!hours.length) return null;

  const { dayId, minutes } = baghdadNow();
  const todaySlots = hours.filter((h) => h.dayOfWeekId === dayId);
  if (!todaySlots.length) return false;

  for (const slot of todaySlots) {
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    if (start === end) return true;
    if (end > start) {
      if (minutes >= start && minutes < end) return true;
    } else if (minutes >= start || minutes < end) {
      return true;
    }
  }
  return false;
}

export function markerOpenStatus(marker: EvMapMarker): boolean | null {
  if (marker.openNow != null) return marker.openNow;
  if (marker.alwaysOpen) return true;
  return null;
}

/** Merge workbook ku/hours when the live map API omits them. */
export function enrichMapMarkers(
  markers: EvMapMarker[],
  enrich: EvMapEnrichMap | null | undefined,
): EvMapMarker[] {
  if (!enrich) return markers;
  return markers.map((m) => {
    const e = enrich[m.id];
    if (!e) return m;

    const neighborhood =
      m.neighborhood || e.neighborhood?.ku
        ? {
            en: m.neighborhood?.en ?? "",
            ar: m.neighborhood?.ar ?? "",
            ku: m.neighborhood?.ku || e.neighborhood?.ku || "",
          }
        : m.neighborhood;

    const district =
      m.district || e.district?.ku
        ? {
            en: m.district?.en ?? "",
            ar: m.district?.ar ?? "",
            ku: m.district?.ku || e.district?.ku || "",
          }
        : m.district;

    let openNow = m.openNow;
    if (openNow == null && e.openingHours?.length) {
      openNow = stationOpenNowFromHours(m.alwaysOpen, e.openingHours);
    } else if (openNow == null && m.alwaysOpen) {
      openNow = true;
    }

    return { ...m, neighborhood, district, openNow };
  });
}

export function markerIsFree(marker: EvMapMarker): boolean {
  return (marker.pricingModels ?? []).some((p) => /free/i.test(p));
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type EvMapMarkerWithDistance = EvMapMarker & { distanceKm: number | null };

export function sortMapMarkers(
  markers: EvMapMarker[],
  locale: Locale,
  userLat?: number | null,
  userLng?: number | null,
): EvMapMarkerWithDistance[] {
  const withDistance = markers.map((m) => {
    let distanceKm: number | null = null;
    if (
      userLat != null &&
      userLng != null &&
      m.latitude != null &&
      m.longitude != null
    ) {
      distanceKm = haversineKm(userLat, userLng, m.latitude, m.longitude);
    }
    return { ...m, distanceKm };
  });

  return withDistance.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) {
      return a.distanceKm - b.distanceKm;
    }
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    const cityA = locText(locale, a.city);
    const cityB = locText(locale, b.city);
    const cityCmp = cityA.localeCompare(cityB, locale);
    if (cityCmp !== 0) return cityCmp;
    return operatorName(a, locale).localeCompare(operatorName(b, locale), locale);
  });
}
