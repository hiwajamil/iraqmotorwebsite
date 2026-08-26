"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { setLocale } from "@/store/slices/preferencesSlice";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export function EvMapLocaleAlias({ locale }: { locale: Locale }) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.setItem("iq_locale", locale);
    } catch {
      // ignore private-mode storage
    }
    dispatch(setLocale(locale));
    router.replace("/ev-map");
  }, [dispatch, locale, router]);

  return (
    <p className="px-[4%] py-24 text-center text-muted">
      {t(locale, "evMapTitle")}
    </p>
  );
}
