"use client";

import { useAppSelector } from "@/store/hooks";
import { t } from "@/lib/i18n";

export function LoadingFallback({ className }: { className: string }) {
  const locale = useAppSelector((s) => s.preferences.locale);
  return <p className={className}>{t(locale, "loading")}</p>;
}
