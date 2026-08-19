export const LEAD_INTENTS = [
  "buy_car",
  "sell_car",
  "finance",
  "valuation",
  "showroom",
  "other",
] as const;

export type LeadIntent = (typeof LEAD_INTENTS)[number];

export const LEAD_STATUSES = ["new", "contacted", "resolved"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadRequest = {
  id: string;
  name: string;
  email: string;
  whatsappNumber: string;
  intent: string;
  status: LeadStatus;
  notes?: string;
  sourceUrl?: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
};

export type LeadCounts = {
  new: number;
  contacted: number;
  resolved: number;
};

export type LeadListResponse = {
  items: LeadRequest[];
  total: number;
  filteredTotal?: number;
  counts: LeadCounts;
};

export const COUNTRY_CODES = [
  { iso: "IQ", dial: "+964", flag: "🇮🇶", name: "Iraq" },
  { iso: "AE", dial: "+971", flag: "🇦🇪", name: "UAE" },
  { iso: "SA", dial: "+966", flag: "🇸🇦", name: "Saudi" },
  { iso: "KW", dial: "+965", flag: "🇰🇼", name: "Kuwait" },
  { iso: "QA", dial: "+974", flag: "🇶🇦", name: "Qatar" },
  { iso: "BH", dial: "+973", flag: "🇧🇭", name: "Bahrain" },
  { iso: "OM", dial: "+968", flag: "🇴🇲", name: "Oman" },
  { iso: "TR", dial: "+90", flag: "🇹🇷", name: "Turkey" },
  { iso: "JO", dial: "+962", flag: "🇯🇴", name: "Jordan" },
  { iso: "GB", dial: "+44", flag: "🇬🇧", name: "UK" },
  { iso: "US", dial: "+1", flag: "🇺🇸", name: "USA" },
] as const;

export const INTENT_LABEL_KEYS = {
  buy_car: "helpIntentBuy",
  sell_car: "helpIntentSell",
  finance: "helpIntentFinance",
  valuation: "helpIntentValue",
  showroom: "helpIntentShowroom",
  other: "helpIntentOther",
} as const;

export function formatWhatsApp(
  countryDial: string,
  national: string,
): string {
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  const dial = countryDial.replace(/\s/g, "");
  return `${dial}${digits}`;
}
