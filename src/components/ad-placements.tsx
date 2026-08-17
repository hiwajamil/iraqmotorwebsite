"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  adHref,
  DEFAULT_HOME_BANNER,
  resolveAdImage,
  resolveHomeBannerContent,
  type AdBannerContent,
  type Advertise,
  type AdViewport,
} from "@/lib/ads";
import { t, type Locale } from "@/lib/i18n";

function SponsoredLabel({ locale }: { locale?: string }) {
  const label = t((locale as Locale) || "en", "sponsored");
  return (
    <span className="pointer-events-none absolute start-3 top-3 z-10 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
      {label}
    </span>
  );
}

function AdFallback({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full w-full flex-col justify-center bg-gradient-to-r from-slate-900 via-slate-800 to-orange-600 px-6 py-4 text-white">
      <p className="text-lg font-bold md:text-2xl">{title}</p>
      <p className="mt-1 text-sm text-white/75">{description}</p>
    </div>
  );
}

function AdCreative({
  src,
  title,
  description,
}: {
  src: string;
  title: string;
  description: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <AdFallback title={title} description={description} />;
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${src}")` }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title}
        className="relative h-full w-full object-fill"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </>
  );
}

function wrapAdHref(
  href: string | null,
  label: string,
  media: ReactNode,
  className: string,
) {
  if (!href) return media;
  if (href.startsWith("tel:")) {
    return (
      <a href={href} className={className} aria-label={label}>
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
        className={className}
        aria-label={label}
      >
        {media}
      </a>
    );
  }
  return (
    <Link href={href} className={className} aria-label={label}>
      {media}
    </Link>
  );
}

export type AdHomeBannerProps = AdBannerContent & {
  /** Active Super Admin / API advertisement. Omit to render the iraqMotors house banner. */
  ad?: Advertise | null;
  viewport: AdViewport;
  locale?: string;
};

export function AdHomeBanner({
  ad,
  title,
  description,
  imageUrl,
  targetLink,
  viewport,
  locale,
}: AdHomeBannerProps) {
  const content = resolveHomeBannerContent(ad, viewport, {
    title,
    description,
    imageUrl,
    targetLink,
  }, (locale as Locale) || "en");
  const aspect =
    viewport === "desktop" ? "aspect-[1440/180]" : "aspect-[1200/390]";

  const media = (
    <div
      className={`relative w-full overflow-hidden rounded-[14px] bg-input ring-1 ring-outline/40 ${aspect}`}
    >
      <SponsoredLabel locale={locale} />
      {content.imageUrl ? (
        <AdCreative
          src={content.imageUrl}
          title={content.title}
          description={content.description}
        />
      ) : (
        <AdFallback title={content.title} description={content.description} />
      )}
    </div>
  );

  return wrapAdHref(
    content.targetLink,
    content.title,
    media,
    "block transition hover:opacity-95",
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
  const title = ad.title || DEFAULT_HOME_BANNER.title;
  const description = ad.description || DEFAULT_HOME_BANNER.description;

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
        <AdCreative
          src={src}
          title={title}
          description={description}
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

  return wrapAdHref(
    href,
    title,
    media,
    "block h-full transition hover:-translate-y-0.5",
  );
}
