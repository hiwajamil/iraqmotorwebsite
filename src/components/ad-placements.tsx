"use client";

import Link from "next/link";
import {
  adHref,
  resolveAdImage,
  type Advertise,
  type AdViewport,
} from "@/lib/ads";

function SponsoredLabel({ locale }: { locale?: string }) {
  const label =
    locale === "ar" ? "إعلان" : locale === "ku" ? "ڕیکلام" : "Sponsored";
  return (
    <span className="pointer-events-none absolute start-3 top-3 z-10 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
      {label}
    </span>
  );
}

export function AdHomeBanner({
  ad,
  viewport,
  locale,
}: {
  ad: Advertise;
  viewport: AdViewport;
  locale?: string;
}) {
  const src = resolveAdImage(ad, "homeBanner", viewport);
  if (!src) return null;
  const href = adHref(ad);
  const aspect = viewport === "desktop" ? "aspect-[1440/180]" : "aspect-[1200/390]";

  const media = (
    <div
      className={`relative w-full overflow-hidden rounded-[14px] bg-input ring-1 ring-outline/40 ${aspect}`}
    >
      <SponsoredLabel locale={locale} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={ad.title || "Sponsored"}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );

  if (!href) return media;
  if (href.startsWith("tel:")) {
    return (
      <a href={href} className="block transition hover:opacity-95" aria-label={ad.title}>
        {media}
      </a>
    );
  }
  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block transition hover:opacity-95"
        aria-label={ad.title}
      >
        {media}
      </a>
    );
  }
  return (
    <Link href={href} className="block transition hover:opacity-95" aria-label={ad.title}>
      {media}
    </Link>
  );
}

export function AdGridTile({
  ad,
  viewport,
  locale,
}: {
  ad: Advertise;
  viewport: AdViewport;
  locale?: string;
}) {
  const src = resolveAdImage(ad, "gridTile", viewport);
  if (!src) return null;
  const href = adHref(ad);

  const media = (
    <div
      className={`relative flex h-full min-h-[180px] flex-col overflow-hidden rounded-[16px] bg-[var(--color-card-low,#f8fafc)] ring-1 ring-outline/40 dark:bg-card ${
        viewport === "desktop" ? "max-h-[320px]" : ""
      }`}
    >
      <SponsoredLabel locale={locale} />
      <div
        className={`relative w-full flex-1 overflow-hidden bg-input ${
          viewport === "desktop" ? "min-h-[220px]" : "aspect-[1200/390]"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={ad.title || "Sponsored"}
          className={`h-full w-full ${
            viewport === "desktop" ? "object-cover" : "object-cover"
          }`}
          loading="lazy"
        />
      </div>
      {ad.title ? (
        <div className="px-3 py-2.5">
          <p className="line-clamp-2 text-sm font-semibold text-foreground">
            {ad.title}
          </p>
        </div>
      ) : null}
    </div>
  );

  if (!href) return media;
  if (href.startsWith("tel:")) {
    return (
      <a href={href} className="block h-full transition hover:-translate-y-0.5">
        {media}
      </a>
    );
  }
  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block h-full transition hover:-translate-y-0.5"
      >
        {media}
      </a>
    );
  }
  return (
    <Link href={href} className="block h-full transition hover:-translate-y-0.5">
      {media}
    </Link>
  );
}
