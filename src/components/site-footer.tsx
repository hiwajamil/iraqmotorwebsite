"use client";

import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { t } from "@/lib/i18n";

export function SiteFooter() {
  const locale = useAppSelector((s) => s.preferences.locale);
  return (
    <footer className="mt-10 border-t border-outline px-[4%] py-10 text-center text-sm text-muted">
      <nav className="mb-3 flex flex-wrap justify-center gap-4">
        <Link
          href="/showrooms"
          className="font-semibold text-foreground/80 transition hover:text-primary-strong"
        >
          {t(locale, "showrooms")}
        </Link>
        <Link
          href="/services"
          className="font-semibold text-foreground/80 transition hover:text-primary-strong"
        >
          {t(locale, "services")}
        </Link>
        <Link
          href="/ev-map"
          className="font-semibold text-foreground/80 transition hover:text-primary-strong"
        >
          {t(locale, "evMap")}
        </Link>
        <Link
          href="/privacy"
          className="font-semibold text-foreground/80 transition hover:text-primary-strong"
        >
          {t(locale, "footerPrivacy")}
        </Link>
      </nav>
      © {new Date().getFullYear()} Iraq Motors. {t(locale, "footerRights")}
    </footer>
  );
}
