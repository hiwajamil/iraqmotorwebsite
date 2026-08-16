import { api, type Car } from "@/lib/api";

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

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/showrooms", label: "Showrooms" },
  { href: "/admin/ads", label: "Ads" },
  { href: "/admin/flagged", label: "Flagged" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/catalog", label: "Catalog" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export type CarAdminStatus =
  | "active"
  | "pending"
  | "rejected"
  | "expired"
  | "sold";

export const LISTING_STATUSES: { value: CarAdminStatus | "all"; label: string }[] =
  [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "active", label: "Active" },
    { value: "sold", label: "Sold" },
    { value: "expired", label: "Expired" },
    { value: "rejected", label: "Rejected" },
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

export function formatActivity(log: ActivityLog): {
  title: string;
  detail: string;
} {
  if (log.action || log.details) {
    return {
      title: log.action || log.type || "Activity",
      detail: log.details || "",
    };
  }
  if (log.type === "car_status" || log.carId) {
    return {
      title: `car_${log.status ?? "update"}`,
      detail: `Listing ${log.carId ?? "?"} → ${log.status ?? "?"}`,
    };
  }
  return {
    title: log.type || "Activity",
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

export function defaultAnalyticsRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - 29);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
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
