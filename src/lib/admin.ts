import { api, type Car } from "@/lib/api";
import { t, listingStatusLabel, type DictKey, type Locale } from "@/lib/i18n";

export type AdminStats = {
  activeCars: number;
  pendingCars: number;
  soldCars: number;
  users: number;
  showrooms?: number;
  openFlags?: number;
  openTickets?: number;
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
};

export type FlaggedAd = {
  id: string;
  adId?: string;
  reason?: string;
  details?: string;
  status?: string;
  resolution?: string;
  reporterId?: string;
  adData?: Record<string, unknown>;
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
  adminDisplayName?: string;
  adminId?: string;
  createdAt?: string | { _seconds?: number; seconds?: number };
  timestamp?: string | { _seconds?: number; seconds?: number };
};

export type SupportTicket = {
  id: string;
  subject?: string;
  status?: string;
  userId?: string;
  userDisplayName?: string;
  lastMessage?: string;
  createdAt?: string;
  updatedAt?: string;
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
  totalRevenue?: number;
  revenueCard?: number;
  revenueEWallet?: number;
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
): string {
  if (!value) return "";
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
  }
  const seconds = value._seconds ?? value.seconds;
  if (typeof seconds === "number") {
    return new Date(seconds * 1000).toLocaleString();
  }
  return "";
}

export function formatActivity(
  log: ActivityLog,
  locale: Locale,
): {
  title: string;
  detail: string;
} {
  if (log.action || log.details) {
    return {
      title: log.action || log.type || t(locale, "activityFallback"),
      detail: log.details || "",
    };
  }
  if (log.type === "car_status" || log.carId) {
    return {
      title: t(locale, "activityListingStatusChange", {
        id: log.carId ?? "?",
        status: listingStatusLabel(locale, log.status),
      }),
      detail: t(locale, "activityListingStatusChange", {
        id: log.carId ?? "?",
        status: listingStatusLabel(locale, log.status),
      }),
    };
  }
  return {
    title: log.type || t(locale, "activityFallback"),
    detail: "",
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
) {
  if (ids.length === 0) return { updated: [] as string[], failed: [] as string[] };
  if (ids.length === 1) {
    await api.patch(`/admin/cars/${ids[0]}/status`, { status });
    return { updated: ids, failed: [] as string[] };
  }
  return api.post<{ updated: string[]; failed: string[]; status: string }>(
    "/admin/cars/bulk-status",
    { ids, status },
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
