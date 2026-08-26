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
  district?: { en: string; ar: string };
  neighborhood?: { en: string; ar: string };
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
};

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
