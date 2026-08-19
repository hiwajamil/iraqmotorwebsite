/**
 * API client for the Express backend.
 * Local browser traffic uses the Next rewrite (`/api/backend`) to avoid CORS.
 * Production (Vercel) calls the public API directly — Vercel blocks rewrites
 * to localhost (`DNS_HOSTNAME_RESOLVED_PRIVATE`).
 */
const PRODUCTION_API = "https://api.iraqmotors.net";

function isPrivateOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  } catch {
    return true;
  }
}

export function resolveApiOrigin(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";
  const hosted = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
  if (env && !isPrivateOrigin(env)) return env;
  if (hosted) return PRODUCTION_API;
  return env || "http://localhost:4000";
}

function resolveApiBase(): string {
  const origin = resolveApiOrigin();
  if (typeof window === "undefined") return origin;
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    return "/api/backend";
  }
  return origin;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setApiTokenGetter(getter: TokenGetter) {
  tokenGetter = getter;
}

async function headers(json = true): Promise<HeadersInit> {
  const h: Record<string, string> = {
    Accept: "application/json",
  };
  if (json) h["Content-Type"] = "application/json";
  if (tokenGetter) {
    const token = await tokenGetter();
    if (token) h.Authorization = `Bearer ${token}`;
  }
  return h;
}

function buildUrl(path: string, query?: Record<string, string>): string {
  const base = resolveApiBase();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (base.startsWith("http")) {
    const url = new URL(`${base}${normalized}`);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v) url.searchParams.set(k, v);
      });
    }
    return url.toString();
  }
  const qs = query
    ? `?${new URLSearchParams(
        Object.fromEntries(Object.entries(query).filter(([, v]) => Boolean(v))),
      ).toString()}`
    : "";
  return `${base}${normalized}${qs === "?" ? "" : qs}`;
}

async function parse(res: Response) {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const fromBody =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null;
    const message =
      fromBody ||
      (res.status === 500 || res.status === 502 || res.status === 503
        ? "API unavailable — start the backend (port 4000) and retry"
        : `Request failed (${res.status})`);
    const details =
      data && typeof data === "object" && "details" in data
        ? (data as { details: unknown }).details
        : undefined;
    throw new ApiError(message, res.status, details);
  }
  return data;
}

export const api = {
  get baseUrl() {
    return resolveApiBase();
  },
  async get<T = unknown>(
    path: string,
    query?: Record<string, string>,
    opts?: { revalidate?: number | false },
  ) {
    const revalidate = opts?.revalidate;
    return parse(
      await fetch(buildUrl(path, query), {
        headers: await headers(),
        ...(revalidate === false || revalidate === undefined
          ? { cache: "no-store" as const }
          : { next: { revalidate } }),
      }),
    ) as Promise<T>;
  },
  async post<T = unknown>(path: string, body?: unknown) {
    return parse(
      await fetch(buildUrl(path), {
        method: "POST",
        headers: await headers(),
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    ) as Promise<T>;
  },
  async patch<T = unknown>(path: string, body?: unknown) {
    return parse(
      await fetch(buildUrl(path), {
        method: "PATCH",
        headers: await headers(),
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    ) as Promise<T>;
  },
  async put<T = unknown>(path: string, body?: unknown) {
    return parse(
      await fetch(buildUrl(path), {
        method: "PUT",
        headers: await headers(),
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    ) as Promise<T>;
  },
  async delete<T = unknown>(path: string) {
    return parse(
      await fetch(buildUrl(path), {
        method: "DELETE",
        headers: await headers(),
      }),
    ) as Promise<T>;
  },
  async upload<T = unknown>(path: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    const h = await headers(false);
    return parse(
      await fetch(buildUrl(path), {
        method: "POST",
        headers: h,
        body: form,
      }),
    ) as Promise<T>;
  },
  async health(): Promise<{ ok: boolean; service?: string }> {
    try {
      return (await this.get("/health")) as { ok: boolean; service?: string };
    } catch {
      return { ok: false };
    }
  },
};

export type Car = {
  id: string;
  brandId?: string;
  modelKey?: string;
  year?: number | string;
  priceValue?: number;
  currencyKey?: string;
  price?: string;
  city?: string;
  province?: string;
  mileageValue?: number;
  mileageUnit?: string;
  imageUrl?: string;
  imageUrls?: string[];
  status?: string;
  description?: string;
  features?: string[] | string;
  selectedFeatures?: string[] | string;
  sellerId?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerAvatar?: string;
  sellerShowroom?: string;
  highestBid?: number;
  vinNumber?: string;
  fuelKey?: string;
  fuel?: string;
  transmissionKey?: string;
  transmission?: string;
  conditionKey?: string;
  condition?: string;
  colorKey?: string;
  plateTypeKey?: string;
  plateCityKey?: string;
  plate_type?: string;
  plate_city?: string;
  bodyTypeKey?: string;
  drivetrainKey?: string;
  drivetrain?: string;
  cylindersKey?: string;
  cylinders?: number;
  engineSizeKey?: string;
  engineSize?: number;
  engine_size?: number;
  importCountryKey?: string;
  import_origin?: string;
  seatMaterialKey?: string;
  seat_material?: string;
  seatCountKey?: string;
  numberOfSeats?: number;
  number_of_seats?: number;
  paintedPartsKey?: string;
  painted_parts?: string;
  extraFeatures?: string[] | string;
  extra_features?: string[] | string;
  damagePhotoUrl?: string;
  damage_photo_url?: string;
  damageImageUrls?: string[];
  horsepower?: string | number;
  priceMeta?: import("./car-pricing-trust").PriceMeta | null;
  sale?: import("./car-pricing-trust").Sale | null;
  vin?: import("./car-pricing-trust").VinSummary | null;
  conditionReport?: import("./car-pricing-trust").ConditionReport | null;
  [key: string]: unknown;
};

export type CarsPagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export type CarsListResponse = {
  data?: Car[];
  items?: Car[];
  nextCursor?: string | null;
  limit?: number;
  pagination?: CarsPagination;
};

export type UserPreferences = {
  priceAlerts: boolean;
  newMatchAlerts: boolean;
};

export type DashboardSummary = {
  uid: string;
  email?: string;
  isSuperAdmin?: boolean;
  profile?: Record<string, unknown> | null;
  preferences?: UserPreferences;
  listings: {
    total: number;
    draft: number;
    pending: number;
    active: number;
    rejected: number;
    sold: number;
    expired: number;
  };
  favoritesCount: number;
  unreadMessages: number;
};

export type InboxMessage = {
  id: string;
  senderName?: string;
  senderPhone?: string;
  carId?: string;
  carName?: string;
  bidAmount?: number;
  amount?: number;
  currencyKey?: string;
  messageBody?: string;
  timestamp?: unknown;
  createdAt?: unknown;
  isRead?: boolean;
  read?: boolean;
  [key: string]: unknown;
};
