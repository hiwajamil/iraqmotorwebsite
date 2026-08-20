import type { ListingCounts } from "@/lib/api";
import { t, type DictKey, type Locale } from "@/lib/i18n";

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

export function formatDashboardWhen(
  value: unknown,
  locale: Locale = "en",
): string {
  const tag =
    locale === "ar" ? "ar-IQ" : locale === "ku" ? "ckb-IQ" : "en-US";
  const format = (date: Date) => {
    if (Number.isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(tag, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
    } catch {
      return date.toLocaleString(tag);
    }
  };

  if (!value) return "";
  if (value instanceof Date) return format(value);
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : format(d);
  }
  if (typeof value === "object" && value) {
    const rec = value as {
      _seconds?: number;
      seconds?: number;
      iso?: string;
      toDate?: () => Date;
    };
    if (typeof rec.toDate === "function") {
      try {
        return format(rec.toDate());
      } catch {
        /* fall through */
      }
    }
    if (typeof rec.iso === "string") {
      const d = new Date(rec.iso);
      if (!Number.isNaN(d.getTime())) return format(d);
    }
    const seconds = rec._seconds ?? rec.seconds;
    if (typeof seconds === "number") {
      return format(new Date(seconds * 1000));
    }
  }
  return "";
}

/** Hint that accounts for every listing in `total` (not only active/pending). */
export function listingsStatHint(
  listings: ListingCounts,
  locale: Locale,
): string {
  const parts: string[] = [];
  const push = (count: number, key: DictKey) => {
    if (count > 0) parts.push(`${count} ${t(locale, key)}`);
  };
  push(listings.active, "dashStatActive");
  push(listings.pending, "dashStatPending");
  push(listings.draft, "statusDraft");
  push(listings.rejected, "statusRejected");
  push(listings.sold, "sold");
  push(listings.expired, "statusExpired");
  if (parts.length === 0) {
    return `0 ${t(locale, "dashStatActive")} · 0 ${t(locale, "dashStatPending")}`;
  }
  return parts.join(" · ");
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
