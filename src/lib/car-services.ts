import {
  CircleDot,
  ClipboardCheck,
  Cog,
  MapPin,
  Shield,
  ShoppingBag,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { HOME_CITIES, homeCityLabel } from "@/lib/home-data";
import type { Locale } from "@/lib/i18n";
import { t, type DictKey } from "@/lib/i18n";

export const SERVICE_STATUSES = ["pending", "approved", "rejected"] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export type ServiceCategory = {
  id: number;
  slug: string;
  title: string;
  subtext: string;
  iconName: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type UserServiceSubmitter = {
  userId: string;
  displayName?: string | null;
  showroomName?: string | null;
  phone?: string | null;
};

export type UserService = {
  id: string;
  userId: string;
  categoryId: number;
  categorySlug: string | null;
  categoryTitle: string | null;
  categoryIconName: string | null;
  city: string;
  title: string;
  description: string;
  phone: string;
  status: ServiceStatus;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  submitter?: UserServiceSubmitter;
  createdAt: string;
  updatedAt: string;
};

export type ServiceCounts = {
  pending: number;
  approved: number;
  rejected: number;
};

export type ServiceListResponse = {
  items: UserService[];
  total: number;
  counts: ServiceCounts;
};

export const SERVICE_CITIES = HOME_CITIES.filter(
  (city): city is (typeof HOME_CITIES)[number] & { key: string } =>
    city.key != null,
);

const CATEGORY_TITLE_KEYS: Record<string, DictKey> = {
  buy_sell: "servicesCatBuySell",
  insurance: "servicesCatInsurance",
  registration: "servicesCatRegistration",
  maintenance: "servicesCatMaintenance",
  tyres: "servicesCatTyres",
  mechanical: "servicesCatMechanical",
};

const CATEGORY_SUBTEXT_KEYS: Record<string, DictKey> = {
  buy_sell: "servicesCatBuySellSub",
  insurance: "servicesCatInsuranceSub",
  registration: "servicesCatRegistrationSub",
  maintenance: "servicesCatMaintenanceSub",
  tyres: "servicesCatTyresSub",
  mechanical: "servicesCatMechanicalSub",
};

const ICONS: Record<string, LucideIcon> = {
  "shopping-bag": ShoppingBag,
  shield: Shield,
  "clipboard-check": ClipboardCheck,
  wrench: Wrench,
  "circle-dot": CircleDot,
  cog: Cog,
  "map-pin": MapPin,
};

export function serviceCategoryIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Wrench;
  return ICONS[iconName] ?? Wrench;
}

export function serviceCategoryTitle(
  locale: Locale,
  category: Pick<ServiceCategory, "slug" | "title">,
): string {
  const key = CATEGORY_TITLE_KEYS[category.slug];
  return key ? t(locale, key) : category.title;
}

export function serviceCategorySubtext(
  locale: Locale,
  category: Pick<ServiceCategory, "slug" | "subtext">,
): string {
  const key = CATEGORY_SUBTEXT_KEYS[category.slug];
  return key ? t(locale, key) : category.subtext;
}

export function serviceCityLabel(locale: Locale, city: string): string {
  const match = SERVICE_CITIES.find(
    (c) => c.en.toLowerCase() === city.trim().toLowerCase() || c.key === city,
  );
  return match ? homeCityLabel(match, locale) : city;
}

export function serviceStatusLabel(locale: Locale, status: string): string {
  if (status === "pending") return t(locale, "servicesStatusPending");
  if (status === "approved") return t(locale, "servicesStatusApproved");
  if (status === "rejected") return t(locale, "servicesStatusRejected");
  return status;
}
