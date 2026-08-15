/** Pricing intelligence + VIN / condition-trust helpers for marketplace UI. */

export type PriceMeta = {
  initialPriceValue?: number | null;
  initialCurrencyKey?: string | null;
  lastChangedAt?: string | Date | null;
  changeCount?: number;
  lastDirection?: "up" | "down" | "none" | string;
  lastDeltaValue?: number | null;
  lastDeltaPct?: number | null;
};

export type Sale = {
  soldAt?: string | Date;
  soldPriceValue?: number;
  soldCurrencyKey?: string;
  soldPrice?: string;
  source?: string;
  vsAskDelta?: number | null;
  vsAskPct?: number | null;
};

export type VinSummary = {
  last4?: string | null;
  isComplete?: boolean;
  isValidChecksum?: boolean | null;
  verifiedStatus?: string;
  normalized?: string | null;
  raw?: string | null;
};

export type ConditionReport = {
  accidentDeclared?: boolean | null;
  hasAccidentHistory?: boolean;
  inspectionStatus?: string | null;
  inspectionGrade?: string | null;
  accidentSeverityKey?: string | null;
  floodDamage?: boolean | null;
  salvageTitle?: boolean | null;
  rebuiltTitle?: boolean | null;
};

export type PriceHistoryEvent = {
  id: string;
  at?: string | Date | { _seconds?: number } | null;
  fromPriceValue?: number | null;
  toPriceValue?: number | null;
  fromCurrencyKey?: string | null;
  toCurrencyKey?: string | null;
  deltaValue?: number | null;
  deltaPct?: number | null;
  reason?: string | null;
  actorRole?: string | null;
};

export function isPriceDropped(meta?: PriceMeta | null): boolean {
  return meta?.lastDirection === "down";
}

export function formatMoney(
  amount: number | null | undefined,
  currencyKey?: string | null,
): string {
  if (amount == null || !Number.isFinite(Number(amount))) return "—";
  const raw = (currencyKey || "iqd").toString().toLowerCase();
  const formatted = Number(amount).toLocaleString();
  if (raw.includes("usd")) return `$${formatted}`;
  if (raw.includes("iqd")) return `${formatted} IQD`;
  return `${formatted} ${raw.toUpperCase()}`;
}

export function soldDisplayPrice(car: {
  sale?: Sale | null;
  priceValue?: number;
  currencyKey?: string;
  price?: unknown;
}): string {
  const sale = car.sale;
  if (sale?.soldPrice && String(sale.soldPrice).trim()) {
    return String(sale.soldPrice).trim();
  }
  if (sale?.soldPriceValue != null) {
    return formatMoney(sale.soldPriceValue, sale.soldCurrencyKey || car.currencyKey);
  }
  if (typeof car.price === "string" && car.price.trim()) return car.price.trim();
  return formatMoney(car.priceValue, car.currencyKey);
}

export function parseEventTime(value: PriceHistoryEvent["at"]): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && value._seconds != null) {
    return new Date(value._seconds * 1000);
  }
  return null;
}

export type TrustChip = {
  key: string;
  label: string;
  tone: "positive" | "warning" | "neutral";
};

export function buildTrustChips(input: {
  vin?: VinSummary | null;
  conditionReport?: ConditionReport | null;
  vinNumber?: string | null;
}): TrustChip[] {
  const chips: TrustChip[] = [];
  const { vin, conditionReport: report, vinNumber } = input;

  if (vin?.verifiedStatus === "admin_verified") {
    chips.push({ key: "vin-verified", label: "VIN verified", tone: "positive" });
  } else if (vin?.isComplete || vin?.last4) {
    chips.push({
      key: "vin",
      label: vin.last4 ? `VIN ···${vin.last4}` : "VIN on file",
      tone: "neutral",
    });
  } else if (vinNumber && String(vinNumber).trim()) {
    const raw = String(vinNumber).trim();
    const last4 = raw.length >= 4 ? raw.slice(-4) : raw;
    chips.push({ key: "vin-legacy", label: `VIN ···${last4}`, tone: "neutral" });
  }

  if (report?.hasAccidentHistory) {
    chips.push({
      key: "accident",
      label: "Accident history",
      tone: "warning",
    });
  } else if (report?.accidentDeclared === false) {
    chips.push({
      key: "clean",
      label: "No accidents declared",
      tone: "positive",
    });
  }

  if (report?.inspectionStatus && report.inspectionStatus !== "none") {
    chips.push({
      key: "inspected",
      label: report.inspectionGrade
        ? `Grade ${report.inspectionGrade}`
        : "Inspected",
      tone: "positive",
    });
  }

  if (report?.floodDamage) {
    chips.push({ key: "flood", label: "Flood damage", tone: "warning" });
  }
  if (report?.salvageTitle || report?.rebuiltTitle) {
    chips.push({ key: "salvage", label: "Salvage title", tone: "warning" });
  }

  return chips;
}
