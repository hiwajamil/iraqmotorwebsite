"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { api, type DashboardSummary } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { t } from "@/lib/i18n";

export default function DashboardHomePage() {
  const { user, me } = useAuth();
  const locale = useAppSelector((s) => s.preferences.locale);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const summary = await api.get<DashboardSummary>("/users/me/dashboard");
        setData(summary);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : t(locale, "dashFailed"));
      }
    })();
  }, [user, locale]);

  const profile = (data?.profile ?? me?.profile ?? {}) as Record<
    string,
    unknown
  >;
  const name =
    (typeof profile.displayName === "string" && profile.displayName) ||
    me?.email ||
    "";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t(locale, "dashWelcome")}
            {name ? ` ${name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">{t(locale, "dashSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/cars"
            className="rounded-[12px] bg-input px-4 py-2.5 text-sm font-semibold"
          >
            {t(locale, "dashBrowseCars")}
          </Link>
          <Link
            href="/sell"
            className="rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
          >
            {t(locale, "dashNewListing")}
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          href="/dashboard/listings"
          label={t(locale, "dashStatListings")}
          value={data?.listings.total ?? 0}
          hint={`${data?.listings.active ?? 0} ${t(locale, "dashStatActive")} · ${data?.listings.pending ?? 0} ${t(locale, "dashStatPending")}`}
        />
        <StatCard
          href="/dashboard/favorites"
          label={t(locale, "dashStatFavorites")}
          value={data?.favoritesCount ?? 0}
        />
        <StatCard
          href="/dashboard/messages"
          label={t(locale, "dashStatMessages")}
          value={data?.unreadMessages ?? 0}
        />
      </div>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  hint,
}: {
  href: string;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-[16px] bg-card p-5 ring-1 ring-outline transition hover:ring-primary/40"
    >
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Link>
  );
}
