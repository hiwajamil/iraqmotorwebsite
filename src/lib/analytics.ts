export const GA_MEASUREMENT_ID = (
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
  "G-BCGJYXYT2R"
).trim();

export function isGaMeasurementId(value: string): boolean {
  return /^G-[A-Z0-9]+$/i.test(value);
}

type GaParam = string | number | boolean | undefined;
type GaParams = Record<string, GaParam>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag(...args);
    return;
  }
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(args);
}

export function trackPageView(path: string) {
  if (!isGaMeasurementId(GA_MEASUREMENT_ID)) return;
  gtag("event", "page_view", {
    page_path: path,
    page_location:
      typeof window !== "undefined" ? window.location.href : undefined,
    page_title: typeof document !== "undefined" ? document.title : undefined,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function trackEvent(name: string, params?: GaParams) {
  if (!isGaMeasurementId(GA_MEASUREMENT_ID)) return;
  gtag("event", name, params);
}

import { formatCarTitle } from "@/lib/listing-display";

export function listingItemParams(car: {
  id: string;
  brandId?: string;
  modelKey?: string;
  year?: number | string;
  priceValue?: number;
  currencyKey?: string;
}): GaParams {
  const itemName = formatCarTitle(car) || car.id;
  const compact = (car.currencyKey || "iqd")
    .toString()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return {
    item_id: car.id,
    item_name: itemName,
    item_brand: car.brandId,
    item_category: car.modelKey,
    value: Number(car.priceValue) || undefined,
    currency: compact.includes("usd") ? "USD" : "IQD",
  };
}
