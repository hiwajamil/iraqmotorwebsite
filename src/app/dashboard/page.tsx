"use client";

import Link from "next/link";
import { CarCard } from "@/components/car-card";
import { useAuth } from "@/components/auth-provider";
import { useDashboardData } from "@/components/dashboard-provider";
import type { Car } from "@/lib/api";
import { listingsStatHint } from "@/lib/dashboard";
import { useAppSelector } from "@/store/hooks";
import { t } from "@/lib/i18n";

export default function DashboardHomePage() {
  const { me } = useAuth();
  const locale = useAppSelector((s) => s.preferences.locale);
  const { summary, loading, error } = useDashboardData();

  const profile = (summary?.profile ?? me?.profile ?? {}) as Record<
    string,
    unknown
  >;
  const name =
    (typeof profile.displayName === "string" && profile.displayName) ||
    me?.email ||
    "";

  const listings = summary?.listings;
  const pending = listings?.pending ?? 0;
  const rejected = listings?.rejected ?? 0;
  const listingsPreview = (summary?.listingsPreview ?? []).slice(0, 3);
  const favoritesPreview = (summary?.favoritesPreview ?? []).slice(0, 3);
  const showAttention = pending > 0 || rejected > 0;

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
          {error === "dashFailed" ? t(locale, "dashFailed") : error}
        </p>
      ) : null}

      {loading ? (
        <HomeSkeleton />
      ) : summary ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard
              href="/dashboard/listings"
              label={t(locale, "dashStatListings")}
              value={summary.listings.total}
              hint={listingsStatHint(summary.listings, locale)}
            />
            <StatCard
              href="/dashboard/favorites"
              label={t(locale, "dashStatFavorites")}
              value={summary.favoritesCount}
            />
            <StatCard
              href="/dashboard/messages"
              label={t(locale, "dashStatMessages")}
              value={summary.unreadMessages}
            />
          </div>

          {showAttention ? (
            <Link
              href="/dashboard/listings"
              className="mt-8 flex items-center justify-between gap-3 rounded-[16px] bg-card p-5 ring-1 ring-amber-500/40 transition hover:ring-amber-500/70"
            >
              <div>
                <p className="text-sm font-semibold">
                  {t(locale, "dashNeedsAttention")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {[
                    pending > 0
                      ? `${pending} ${t(locale, "dashStatPending")}`
                      : null,
                    rejected > 0
                      ? `${rejected} ${t(locale, "statusRejected")}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className="text-sm font-semibold text-primary">
                {t(locale, "viewAll")}
              </span>
            </Link>
          ) : null}

          {listingsPreview.length > 0 ? (
            <PreviewRow
              title={t(locale, "dashListings")}
              href="/dashboard/listings"
              cars={listingsPreview}
            />
          ) : summary.listings.total === 0 ? (
            <div className="mt-8 rounded-[16px] bg-card p-8 text-center ring-1 ring-outline">
              <p className="font-semibold">{t(locale, "dashEmptyListings")}</p>
              <p className="mt-1 text-sm text-muted">
                {t(locale, "dashEmptyListingsHint")}
              </p>
              <Link
                href="/sell"
                className="mt-5 inline-block rounded-[12px] bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary"
              >
                {t(locale, "dashCreateListing")}
              </Link>
            </div>
          ) : (
            <PreviewRow
              title={t(locale, "dashListings")}
              href="/dashboard/listings"
              cars={[]}
            />
          )}

          {favoritesPreview.length > 0 ? (
            <PreviewRow
              title={t(locale, "dashFavorites")}
              href="/dashboard/favorites"
              cars={favoritesPreview}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function PreviewRow({
  title,
  href,
  cars,
}: {
  title: string;
  href: string;
  cars: Car[];
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <Link href={href} className="text-sm font-semibold text-primary">
          {t(locale, "viewAll")}
        </Link>
      </div>
      <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} compact />
        ))}
      </div>
    </section>
  );
}

function HomeSkeleton() {
  const locale = useAppSelector((s) => s.preferences.locale);
  return (
    <div className="mt-8" role="status" aria-live="polite">
      <span className="sr-only">{t(locale, "loading")}</span>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-[16px] bg-card p-5 ring-1 ring-outline"
          >
            <div className="h-4 w-24 rounded bg-input" />
            <div className="mt-3 h-8 w-14 rounded bg-input" />
            <div className="mt-3 h-3 w-32 rounded bg-input" />
          </div>
        ))}
      </div>
      <div className="mt-8 h-24 animate-pulse rounded-[16px] bg-card ring-1 ring-outline" />
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
