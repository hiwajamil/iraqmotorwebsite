import type { DictKey } from "@/lib/i18n";

export const DASHBOARD_NAV = [
  { href: "/dashboard", labelKey: "dashHome" as const, icon: "home" },
  {
    href: "/dashboard/favorites",
    labelKey: "dashFavorites" as const,
    icon: "heart",
  },
  {
    href: "/dashboard/listings",
    labelKey: "dashListings" as const,
    icon: "car",
  },
  {
    href: "/dashboard/messages",
    labelKey: "dashMessages" as const,
    icon: "mail",
  },
  {
    href: "/dashboard/settings",
    labelKey: "dashSettings" as const,
    icon: "gear",
  },
] satisfies { href: string; labelKey: DictKey; icon: DashboardIcon }[];

export type DashboardIcon = "home" | "heart" | "car" | "mail" | "gear";

export function isDashboardActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function formatDashboardWhen(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
  }
  if (typeof value === "object" && value) {
    const rec = value as { _seconds?: number; seconds?: number };
    const seconds = rec._seconds ?? rec.seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000).toLocaleString();
    }
  }
  return "";
}

export function listingStatusClass(status?: string) {
  const s = (status || "draft").toLowerCase();
  const styles: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    draft: "bg-input text-muted",
    rejected: "bg-red-500/15 text-red-600",
    sold: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    expired: "bg-input text-muted",
  };
  return styles[s] || styles.draft;
}
