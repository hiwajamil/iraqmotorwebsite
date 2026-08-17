"use client";

import { useAppSelector } from "@/store/hooks";
import { t } from "@/lib/i18n";

export function SiteFooter() {
  const locale = useAppSelector((s) => s.preferences.locale);
  return (
    <footer className="mt-10 border-t border-outline px-[4%] py-10 text-center text-sm text-muted">
      © {new Date().getFullYear()} Iraq Motors. {t(locale, "footerRights")}
    </footer>
  );
}
