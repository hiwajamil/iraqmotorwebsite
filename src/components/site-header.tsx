"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocale, toggleTheme } from "@/store/slices/preferencesSlice";
import { t, type Locale } from "@/lib/i18n";

const navLinks = [
  { href: "/cars", labelKey: "browse" as const },
  { href: "/showrooms", labelKey: "showrooms" as const },
];

export function SiteHeader() {
  const { user, me, signOut } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.preferences.locale);
  const theme = useAppSelector((s) => s.preferences.theme);
  const dark = theme === "dark";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const immersive = isHome && !scrolled && !menuOpen;
  const barClass = immersive
    ? "bg-transparent text-white"
    : "border-b border-outline/70 bg-surface/90 text-foreground backdrop-blur-xl";

  const linkClass = immersive
    ? "text-white/90 hover:text-white"
    : "text-foreground/80 hover:text-primary";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${barClass}`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-[4%] py-3 md:gap-6 md:py-4">
        <Link
          href="/"
          className="relative flex h-12 w-[140px] shrink-0 items-center md:h-14 md:w-[180px]"
        >
          {/* Dark wordmark for light surfaces */}
          <Image
            src="/brand/IQ33.png"
            alt="IQ Motors"
            fill
            sizes="180px"
            className={`object-contain object-left ${
              immersive ? "hidden" : "dark:hidden"
            }`}
            priority
          />
          {/* Light wordmark for dark surfaces / immersive hero */}
          <Image
            src="/brand/iqLogo.png"
            alt="IQ Motors"
            fill
            sizes="180px"
            className={`object-contain object-left ${
              immersive ? "block" : "hidden dark:block"
            }`}
            priority
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-8 text-sm font-semibold md:flex">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className={`transition ${linkClass}`}>
              {t(locale, l.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2 md:gap-3">
          <select
            value={locale}
            onChange={(e) => dispatch(setLocale(e.target.value as Locale))}
            className={`hidden rounded-[12px] px-2 py-2 text-xs font-semibold outline-none sm:block ${
              immersive
                ? "bg-white/15 text-white [color-scheme:dark]"
                : "bg-input text-foreground"
            }`}
            aria-label="Language"
          >
            <option value="en">EN</option>
            <option value="ar">AR</option>
            <option value="ku">KU</option>
          </select>

          <button
            type="button"
            onClick={() => dispatch(toggleTheme())}
            className={`hidden h-10 w-10 items-center justify-center rounded-[12px] text-sm font-semibold sm:flex ${
              immersive ? "bg-white/15 text-white" : "bg-input"
            }`}
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? "☀" : "☾"}
          </button>

          <Link
            href="/sell"
            className="rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition hover:brightness-110"
          >
            {t(locale, "sell")}
          </Link>

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              {me?.isSuperAdmin ? (
                <Link
                  href="/admin"
                  className={`rounded-[12px] px-3 py-2.5 text-sm font-semibold ${
                    immersive ? "bg-white/15 text-white" : "bg-input"
                  }`}
                >
                  {t(locale, "admin")}
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className={`rounded-[12px] px-3 py-2.5 text-sm font-semibold ${
                  immersive ? "bg-white/15 text-white" : "bg-input"
                }`}
              >
                {(me?.profile?.displayName as string) || t(locale, "dashboard")}
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className={`rounded-[12px] px-3 py-2.5 text-sm font-medium ${
                  immersive ? "bg-white/15 text-white" : "bg-input"
                }`}
              >
                {t(locale, "signOut")}
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className={`hidden rounded-[12px] px-4 py-2.5 text-sm font-semibold sm:inline ${
                immersive
                  ? "bg-white/90 text-on-surface"
                  : "bg-input text-foreground"
              }`}
            >
              {t(locale, "signIn")}
            </Link>
          )}

          <button
            type="button"
            className={`flex h-10 w-10 items-center justify-center rounded-[12px] md:hidden ${
              immersive ? "bg-white/15 text-white" : "bg-input"
            }`}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="text-lg leading-none" aria-hidden>
              {menuOpen ? "✕" : "☰"}
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id={menuId}
          className="border-t border-outline/60 bg-surface text-foreground md:hidden"
        >
          <nav className="mx-auto flex max-w-[1400px] flex-col gap-1 px-[4%] py-4">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-[12px] px-3 py-3 text-sm font-semibold hover:bg-input"
              >
                {t(locale, l.labelKey)}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-[12px] px-3 py-3 text-sm font-semibold hover:bg-input"
                >
                  {(me?.profile?.displayName as string) || t(locale, "dashboard")}
                </Link>
                {me?.isSuperAdmin ? (
                  <Link
                    href="/admin"
                    className="rounded-[12px] px-3 py-3 text-sm font-semibold hover:bg-input"
                  >
                    {t(locale, "admin")}
                  </Link>
                ) : null}
              </>
            ) : (
              <Link
                href="/auth"
                className="rounded-[12px] px-3 py-3 text-sm font-semibold hover:bg-input"
              >
                {t(locale, "signIn")}
              </Link>
            )}
            <div className="mt-2 flex items-center gap-2 border-t border-outline/50 pt-3">
              <select
                value={locale}
                onChange={(e) => dispatch(setLocale(e.target.value as Locale))}
                className="flex-1 rounded-[12px] bg-input px-3 py-2.5 text-xs font-semibold outline-none"
                aria-label="Language"
              >
                <option value="en">EN</option>
                <option value="ar">AR</option>
                <option value="ku">KU</option>
              </select>
              <button
                type="button"
                onClick={() => dispatch(toggleTheme())}
                className="h-10 w-10 rounded-[12px] bg-input text-sm font-semibold"
                aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              >
                {dark ? "☀" : "☾"}
              </button>
              {user ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-[12px] bg-input px-3 py-2.5 text-sm font-medium"
                >
                  {t(locale, "signOut")}
                </button>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
