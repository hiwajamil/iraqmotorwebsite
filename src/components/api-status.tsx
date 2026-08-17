"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

/** Dev-only health chip — hidden in production builds. */
export function ApiStatus() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    let cancelled = false;
    void api.health().then((h) => {
      if (!cancelled) setOk(Boolean(h.ok));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (process.env.NODE_ENV === "production" || ok === null) return null;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
        ok
          ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/40"
          : "bg-red-500/25 text-red-100 ring-1 ring-red-400/40"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-300" : "bg-red-300"}`}
      />
      {ok ? t(locale, "apiOnline") : t(locale, "apiOffline")}
    </span>
  );
}
