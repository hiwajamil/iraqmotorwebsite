"use client";

import { useId, useState, useSyncExternalStore, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import {
  COUNTRY_CODES,
  INTENT_LABEL_KEYS,
  LEAD_INTENTS,
  formatWhatsApp,
  type LeadIntent,
} from "@/lib/leads";
import { useAppSelector } from "@/store/hooks";
import { useCompareHydrated, useCompareStore } from "@/store/compare-store";

const STORAGE_KEY = "iq_help_widget_dismissed";

function subscribeDismissed() {
  return () => {};
}

function getDismissedSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getDismissedServerSnapshot() {
  return true;
}

type View = "closed" | "open" | "success";

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M4.5 5.25A2.25 2.25 0 0 1 6.75 3h10.5A2.25 2.25 0 0 1 19.5 5.25v8.25A2.25 2.25 0 0 1 17.25 15.75H9.64l-3.86 2.9A.75.75 0 0 1 4.5 18.06V5.25Z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function FloatingHelpWidget() {
  const pathname = usePathname();
  const locale = useAppSelector((s) => s.preferences.locale);
  const compareHydrated = useCompareHydrated();
  const compareCount = useCompareStore((s) => s.compareList.length);
  const liftForCompare =
    compareHydrated &&
    compareCount > 0 &&
    !pathname.startsWith("/compare");
  const formId = useId();
  const storedDismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissedSnapshot,
    getDismissedServerSnapshot,
  );
  const [hiddenNow, setHiddenNow] = useState(false);
  const [view, setView] = useState<View>("closed");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryDial, setCountryDial] = useState("+964");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState<LeadIntent | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dismissed = storedDismissed || hiddenNow;

  if (dismissed) return null;
  if (pathname.startsWith("/admin")) return null;

  function dismiss() {
    setHiddenNow(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }

  function open() {
    setView("open");
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const whatsappNumber = formatWhatsApp(countryDial, phone);
    if (!trimmedName || !trimmedEmail || !phone.trim() || !intent) {
      setError(t(locale, "helpRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(t(locale, "helpInvalidEmail"));
      return;
    }
    if (!/^\+[1-9]\d{6,14}$/.test(whatsappNumber)) {
      setError(t(locale, "helpInvalidPhone"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/leads", {
        name: trimmedName,
        email: trimmedEmail,
        whatsappNumber,
        intent,
      });
      setView("success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t(locale, "helpError"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`pointer-events-none fixed z-40 end-4 transition-[bottom] duration-300 ${
        liftForCompare
          ? "bottom-[13.5rem]"
          : "bottom-[max(1rem,env(safe-area-inset-bottom))]"
      }`}
    >
      {view === "closed" ? (
        <div className="pointer-events-auto relative flex items-center widget-pop">
          <button
            type="button"
            onClick={open}
            aria-expanded={false}
            aria-haspopup="dialog"
            className="flex items-center gap-2.5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-[0_10px_28px_rgba(234,88,12,0.38)] transition hover:brightness-110 hover:shadow-[0_12px_32px_rgba(234,88,12,0.48)]"
          >
            <ChatIcon className="h-5 w-5 shrink-0" />
            <span>{t(locale, "helpCta")}</span>
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="absolute -top-1.5 -end-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-black/5 transition hover:bg-slate-50 hover:text-slate-800"
            aria-label={t(locale, "helpDismiss")}
            title={t(locale, "helpDismiss")}
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          className="pointer-events-auto widget-pop flex w-[min(22.5rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.22)] ring-1 ring-black/5"
          role="dialog"
          aria-labelledby={`${formId}-title`}
        >
          <div className="flex items-start justify-between gap-3 bg-primary px-5 py-4 text-on-primary">
            <div className="min-w-0">
              <p
                id={`${formId}-title`}
                className="text-lg font-bold leading-tight tracking-tight"
              >
                {t(locale, "helpTitle")}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-on-primary/85">
                {t(locale, "helpSubtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView("closed")}
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-on-primary transition hover:bg-white/25"
              aria-label={t(locale, "helpMinimize")}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M5 8.5 10 13.5 15 8.5" />
              </svg>
            </button>
          </div>

          {view === "success" ? (
            <div className="flex flex-col items-center px-6 py-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
                <CheckIcon className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                {t(locale, "helpSuccessTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {t(locale, "helpSuccessBody")}
              </p>
              <button
                type="button"
                onClick={() => setView("closed")}
                className="mt-6 text-sm font-semibold text-primary"
              >
                {t(locale, "helpClose")}
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-3.5 px-5 py-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  {t(locale, "helpName")}
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t(locale, "helpNamePlaceholder")}
                  autoComplete="name"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  {t(locale, "helpEmail")}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t(locale, "helpEmailPlaceholder")}
                  autoComplete="email"
                  dir="ltr"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  {t(locale, "helpWhatsapp")}
                </span>
                <div
                  dir="ltr"
                  className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/20"
                >
                  <select
                    value={countryDial}
                    onChange={(e) => setCountryDial(e.target.value)}
                    aria-label={t(locale, "helpCountryCode")}
                    className="lang-select shrink-0 border-e border-slate-200 bg-transparent px-2.5 py-2.5 text-sm font-semibold text-slate-800 outline-none"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.iso} value={c.dial}>
                        {c.flag} {c.dial}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t(locale, "helpWhatsappPlaceholder")}
                    autoComplete="tel"
                    required
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                  {t(locale, "helpIntent")}
                </span>
                <select
                  value={intent}
                  onChange={(e) =>
                    setIntent(e.target.value as LeadIntent | "")
                  }
                  className="lang-select w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                  required
                >
                  <option value="" disabled>
                    {t(locale, "helpIntentPlaceholder")}
                  </option>
                  {LEAD_INTENTS.map((key) => (
                    <option key={key} value={key}>
                      {t(locale, INTENT_LABEL_KEYS[key])}
                    </option>
                  ))}
                </select>
              </label>

              {error ? (
                <p className="text-xs font-medium text-red-600">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-on-primary shadow-[0_8px_18px_rgba(234,88,12,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy ? t(locale, "helpSubmitting") : t(locale, "helpSubmit")}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
