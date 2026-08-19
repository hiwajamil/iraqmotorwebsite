import { api, type Car } from "@/lib/api";
import { t, type DictKey, type Locale } from "@/lib/i18n";

export type AdminStats = {
  activeCars: number;
  pendingCars: number;
  soldCars: number;
  expiredCars?: number;
  rejectedCars?: number;
  users: number;
  showrooms?: number;
  openFlags?: number;
  openTickets?: number;
  pendingServices?: number;
};

export type AdminUser = {
  uid: string;
  displayName?: string;
  showroomName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  city?: string;
  accountType?: string;
  banned?: boolean;
  photoUrl?: string;
  photoURL?: string;
  avatarUrl?: string;
  createdAt?: string | { _seconds?: number; seconds?: number };
  listingCounts?: {
    active: number;
    pending: number;
    total: number;
  };
};

export type FlaggedAd = {
  id: string;
  adId?: string;
  reason?: string;
  details?: string;
  status?: string;
  resolution?: string;
  reporterId?: string;
  reportedBy?: string;
  createdAt?: string | { _seconds?: number; seconds?: number };
  timestamp?: string | { _seconds?: number; seconds?: number };
  resolvedBy?: string;
  resolvedAt?: string | { _seconds?: number; seconds?: number };
  adData?: Record<string, unknown>;
};

export type FlaggedListResponse = {
  items: FlaggedAd[];
  counts: { open: number; resolved: number; dismissed: number };
  nextCursor?: string | null;
};

export type ActivityLog = {
  id: string;
  type?: string;
  action?: string;
  details?: string;
  status?: string;
  carId?: string;
  userId?: string;
  flagId?: string;
  ticketId?: string;
  adId?: string;
  leadId?: string;
  serviceId?: string;
  count?: number;
  adminDisplayName?: string;
  adminId?: string;
  createdAt?: string | { _seconds?: number; seconds?: number };
  timestamp?: string | { _seconds?: number; seconds?: number };
};

export type ActivityListResponse = {
  items: ActivityLog[];
  nextCursor?: string | null;
};

export type ActivityFilter =
  | "all"
  | "listings"
  | "users"
  | "ads"
  | "flags"
  | "tickets";

export const ACTIVITY_FILTERS: {
  value: ActivityFilter;
  labelKey: DictKey;
}[] = [
  { value: "all", labelKey: "all" },
  { value: "listings", labelKey: "adminNavListings" },
  { value: "users", labelKey: "adminNavUsers" },
  { value: "ads", labelKey: "adminNavAds" },
  { value: "flags", labelKey: "adminNavFlagged" },
  { value: "tickets", labelKey: "dashMessages" },
];

const DATE_LOCALES: Record<Locale, string> = {
  en: "en-GB",
  ar: "ar-IQ",
  ku: "ckb-IQ",
};

const ACTIVITY_ACTION_KEYS: Record<string, DictKey> = {
  car_active: "activityActionCarActive",
  car_rejected: "activityActionCarRejected",
  car_pending: "activityActionCarPending",
  car_expired: "activityActionCarExpired",
  car_sold: "activityActionCarSold",
  car_bulk_active: "activityActionCarBulkActive",
  car_bulk_rejected: "activityActionCarBulkRejected",
  car_bulk_pending: "activityActionCarBulkPending",
  car_bulk_expired: "activityActionCarBulkExpired",
  car_bulk_sold: "activityActionCarBulkSold",
  user_update: "activityActionUserUpdate",
  flag_resolved: "activityActionFlagResolved",
  flag_dismissed: "activityActionFlagDismissed",
  flag_open: "activityActionFlagOpen",
  flag_reject: "activityActionFlagReject",
  flag_expire: "activityActionFlagExpire",
  flag_delete: "activityActionFlagDelete",
  ticket_open: "activityActionTicketOpen",
  ticket_resolved: "activityActionTicketResolved",
  banner_create: "activityActionBannerCreate",
  banner_update: "activityActionBannerUpdate",
  banner_delete: "activityActionBannerDelete",
  banner_image: "activityActionBannerImage",
  banner_seed: "activityActionBannerSeed",
  catalog_brand_create: "activityActionCatalogBrandCreate",
  catalog_brand_update: "activityActionCatalogBrandUpdate",
  catalog_brand_delete: "activityActionCatalogBrandDelete",
  catalog_model_create: "activityActionCatalogModelCreate",
  catalog_model_update: "activityActionCatalogModelUpdate",
  catalog_model_delete: "activityActionCatalogModelDelete",
  catalog_trim_create: "activityActionCatalogTrimCreate",
  catalog_trim_update: "activityActionCatalogTrimUpdate",
  catalog_trim_delete: "activityActionCatalogTrimDelete",
  lead_new: "activityActionLeadNew",
  lead_contacted: "activityActionLeadContacted",
  lead_resolved: "activityActionLeadResolved",
  lead_notes: "activityActionLeadNotes",
  service_pending: "activityActionServicePending",
  service_approved: "activityActionServiceApproved",
  service_rejected: "activityActionServiceRejected",
  settings_update: "activityActionSettingsUpdate",
  settings_maintenance_on: "activityActionSettingsMaintenanceOn",
  settings_maintenance_off: "activityActionSettingsMaintenanceOff",
};

const ACTIVITY_TYPE_KEYS: Record<string, DictKey> = {
  car_status: "adminNavListings",
  car_bulk_status: "adminNavListings",
  user_update: "adminNavUsers",
  sponsor_banner: "adminNavAds",
  flagged_update: "adminNavFlagged",
  ticket_update: "dashMessages",
  catalog_update: "adminNavCatalog",
  lead_update: "adminNavLeads",
  service_status: "adminNavServices",
  settings_update: "dashSettings",
};

const ID_IN_TEXT_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\b[A-Za-z0-9_-]{18,}\b/gi;

export function shortenActivityIds(text: string): string {
  return text.replace(ID_IN_TEXT_RE, (id) => `${id.slice(0, 8)}…`);
}

export function activityTypeLabel(locale: Locale, type?: string): string {
  const key = ACTIVITY_TYPE_KEYS[type ?? ""];
  return key ? t(locale, key) : t(locale, "activityFallback");
}

export function activityTypeBadgeClass(type?: string): string {
  switch (type) {
    case "car_status":
    case "car_bulk_status":
      return "bg-emerald-500/15 text-emerald-700";
    case "user_update":
      return "bg-sky-500/15 text-sky-700";
    case "sponsor_banner":
      return "bg-violet-500/15 text-violet-700";
    case "flagged_update":
      return "bg-amber-500/15 text-amber-700";
    case "ticket_update":
      return "bg-rose-500/15 text-rose-700";
    case "catalog_update":
      return "bg-slate-500/15 text-slate-700";
    case "lead_update":
      return "bg-indigo-500/15 text-indigo-700";
    case "service_status":
      return "bg-teal-500/15 text-teal-700";
    case "settings_update":
      return "bg-slate-500/15 text-slate-700";
    default:
      return "bg-input text-muted";
  }
}

export function parseAdminDate(
  value: ActivityLog["createdAt"] | TicketMessage["timestamp"],
): Date | null {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const seconds = value._seconds ?? value.seconds;
  if (typeof seconds === "number") return new Date(seconds * 1000);
  return null;
}

export function activityDayLabel(
  value: ActivityLog["createdAt"] | TicketMessage["timestamp"],
  locale: Locale,
): string {
  const d = parseAdminDate(value);
  if (!d) return "";
  const tag = DATE_LOCALES[locale];
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86400000,
  );
  if (diffDays === 0) return t(locale, "activityToday");
  if (diffDays === 1) return t(locale, "activityYesterday");
  try {
    return d.toLocaleDateString(tag, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d.toLocaleDateString();
  }
}

export type SupportTicket = {
  id: string;
  subject?: string | null;
  status?: string;
  userId?: string;
  userDisplayName?: string;
  lastMessage?: string;
  lastMessageAt?: string | { _seconds?: number; seconds?: number };
  lastMessageIsAdmin?: boolean;
  unreadForAdmin?: boolean;
  createdAt?: string | { _seconds?: number; seconds?: number };
  updatedAt?: string | { _seconds?: number; seconds?: number };
};

export type TicketListResponse = {
  items: SupportTicket[];
  counts?: { open: number; resolved: number };
  nextCursor?: string | null;
};

export type TicketMessage = {
  id: string;
  senderId?: string;
  text?: string;
  isAdmin?: boolean;
  timestamp?: string | { _seconds?: number; seconds?: number };
};

export type AnalyticsReport = {
  dailyActiveUsers: { date: string; count: number }[];
  todaysActiveUsers: number;
  totalAppDownloads: number;
  cityVisitors: { city: string; count: number }[];
  dailyNewAds?: { date: string; count: number }[];
  totalNewAds?: number;
  /** Paid N-Genius orders in range. Not estimated listing fees. */
  totalRevenue?: number;
  paidRevenue?: number;
  paidCount?: number;
  /** packageKey × config prices. Do not add to paidRevenue. */
  estimatedListingFees?: number;
  estimatedFeesCard?: number;
  estimatedFeesEWallet?: number;
  estimatedFeesUnknown?: number;
  /** Estimated card-method fees (unknown methods are not included). */
  revenueCard?: number;
  revenueEWallet?: number;
  revenueUnknown?: number;
  cityPerformance?: {
    city: string;
    totalAds: number;
    approvedAds: number;
    visitorCount?: number;
  }[];
  gaAvailable?: boolean;
  gaError?: string | null;
};

export type UserRegistrationStats = {
  totalRegistrations: number;
  platformBreakdown: {
    ios: number;
    android: number;
    web: number;
    unknown: number;
  };
  chartData: { date: string; count: number }[];
};

export const ADMIN_NAV = [
  { href: "/admin", labelKey: "adminNavOverview" as const },
  { href: "/admin/approvals", labelKey: "adminNavApprovals" as const },
  { href: "/admin/listings", labelKey: "adminNavListings" as const },
  { href: "/admin/users", labelKey: "adminNavUsers" as const },
  { href: "/admin/showrooms", labelKey: "showrooms" as const },
  { href: "/admin/ads", labelKey: "adminNavAds" as const },
  { href: "/admin/flagged", labelKey: "adminNavFlagged" as const },
  { href: "/admin/leads", labelKey: "adminNavLeads" as const },
  { href: "/admin/services", labelKey: "adminNavServices" as const },
  { href: "/admin/messages", labelKey: "dashMessages" as const },
  { href: "/admin/catalog", labelKey: "adminNavCatalog" as const },
  { href: "/admin/analytics", labelKey: "adminNavAnalytics" as const },
  { href: "/admin/activity", labelKey: "adminNavActivity" as const },
  { href: "/admin/settings", labelKey: "dashSettings" as const },
] satisfies { href: string; labelKey: DictKey }[];

export type CarAdminStatus =
  | "active"
  | "pending"
  | "rejected"
  | "expired"
  | "sold";

export const LISTING_STATUSES: {
  value: CarAdminStatus | "all";
  labelKey: DictKey;
}[] = [
  { value: "all", labelKey: "all" },
  { value: "pending", labelKey: "statusPending" },
  { value: "active", labelKey: "statusActive" },
  { value: "sold", labelKey: "sold" },
  { value: "expired", labelKey: "statusExpired" },
  { value: "rejected", labelKey: "statusRejected" },
];

export function statusBadgeClass(status?: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-700";
    case "pending":
      return "bg-amber-500/15 text-amber-700";
    case "sold":
      return "bg-sky-500/15 text-sky-700";
    case "rejected":
      return "bg-red-500/15 text-red-700";
    case "expired":
      return "bg-slate-500/15 text-slate-600";
    default:
      return "bg-input text-muted";
  }
}

export { carTitle } from "@/lib/listing-display";

export function carImage(car: Car): string | null {
  if (typeof car.imageUrl === "string" && car.imageUrl) return car.imageUrl;
  if (Array.isArray(car.imageUrls) && typeof car.imageUrls[0] === "string") {
    return car.imageUrls[0];
  }
  return null;
}

export function formatAdminWhen(
  value: ActivityLog["createdAt"] | TicketMessage["timestamp"],
  locale?: Locale,
): string {
  const d = parseAdminDate(value);
  if (!d) {
    return typeof value === "string" ? value : "";
  }
  const tag = locale ? DATE_LOCALES[locale] : undefined;
  try {
    return d.toLocaleString(tag, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return d.toLocaleString();
  }
}

export function formatActivity(
  log: ActivityLog,
  locale: Locale,
): {
  title: string;
  detail: string;
} {
  const action = (log.action || "").trim();
  const actionKey = ACTIVITY_ACTION_KEYS[action];
  const title = actionKey
    ? t(locale, actionKey)
    : action ||
      (log.type
        ? activityTypeLabel(locale, log.type)
        : t(locale, "activityFallback"));
  return {
    title,
    detail: shortenActivityIds(log.details || ""),
  };
}

export async function logAdminActivity(input: {
  adminId: string;
  action: string;
  details: string;
  adminDisplayName?: string;
}) {
  try {
    await api.post("/admin/activity", input);
  } catch {
    // Non-blocking — primary action already succeeded.
  }
}

export function presetRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export function defaultAnalyticsRange(): { startDate: string; endDate: string } {
  return presetRange(30);
}

export async function setCarStatuses(
  ids: string[],
  status: "active" | "rejected" | "expired" | "sold" | "pending",
  rejectionReason?: string,
) {
  if (ids.length === 0) return { updated: [] as string[], failed: [] as string[] };
  const body: {
    status: typeof status;
    rejectionReason?: string;
  } = { status };
  if (status === "rejected" && rejectionReason?.trim()) {
    body.rejectionReason = rejectionReason.trim();
  }
  if (ids.length === 1) {
    await api.patch(`/admin/cars/${ids[0]}/status`, body);
    return { updated: ids, failed: [] as string[] };
  }
  return api.post<{ updated: string[]; failed: string[]; status: string }>(
    "/admin/cars/bulk-status",
    { ids, ...body },
  );
}

export function groupByCity<T extends { city?: string; province?: string }>(
  items: T[],
): { city: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const city = String(item.city || item.province || "Unknown").trim() || "Unknown";
    const list = map.get(city) ?? [];
    list.push(item);
    map.set(city, list);
  }
  return [...map.entries()]
    .map(([city, group]) => ({ city, items: group }))
    .sort((a, b) => b.items.length - a.items.length || a.city.localeCompare(b.city));
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const v = String(cell ?? "");
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
