"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { usePathname } from "next/navigation";
import { IraqMotorsWordmark } from "@/components/iraq-motors-wordmark";
import { useAuth } from "@/components/auth-provider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setLocale, toggleTheme } from "@/store/slices/preferencesSlice";
import { t, type Locale } from "@/lib/i18n";
import { Moon, Sun } from "lucide-react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

const navLinks = [
  { href: "/cars", labelKey: "browse" as const, navKey: "navBrowse" as const },
  { href: "/compare", labelKey: "compare" as const, navKey: "navCompare" as const },
  { href: "/showrooms", labelKey: "showrooms" as const, navKey: "navShowrooms" as const },
  { href: "/services", labelKey: "services" as const, navKey: "navServices" as const },
  { href: "/ev-map", labelKey: "evMap" as const, navKey: "navEvMap" as const },
];

const NAV_OVERFLOW = new Set(["/services", "/ev-map"]);

function isNavCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function accountChipLabel(displayName: unknown, locale: Locale) {
  const name = typeof displayName === "string" ? displayName.trim() : "";
  if (!name || /^super\s*admin$/i.test(name) || /^admin$/i.test(name)) {
    return t(locale, "dashboard");
  }
  return name;
}

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

  const compactNav = locale === "ar" || locale === "ku";
  const immersive = isHome && !scrolled && !menuOpen;
  const barClass = immersive
    ? "bg-transparent text-white"
    : "border-b border-outline/70 bg-surface/90 text-foreground backdrop-blur-xl";

  const linkClass = immersive
    ? "text-white/90 hover:text-white"
    : "text-foreground/80 hover:text-primary-strong";
  const activeLinkClass = immersive
    ? "text-white underline decoration-white/80 decoration-2 underline-offset-[10px]"
    : "text-primary-strong";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${barClass}`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-[4%] py-3 md:gap-6 md:py-4">
        <Link href="/" className="shrink-0">
          <IraqMotorsWordmark inverted={immersive} />
        </Link>

        <nav
          className={`hidden min-w-0 flex-1 items-center justify-center font-semibold md:flex ${
            locale === "ku"
              ? "gap-4 text-[13px]"
              : locale === "ar"
                ? "gap-5 text-sm"
                : "gap-8 text-sm"
          }`}
        >
          {navLinks.map((l) => {
            const current = isNavCurrent(pathname, l.href);
            const overflow = compactNav && NAV_OVERFLOW.has(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={current ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap transition ${
                  current ? activeLinkClass : linkClass
                } ${overflow ? "max-xl:hidden" : ""}`}
              >
                {t(locale, l.navKey)}
              </Link>
            );
          })}
          {compactNav ? (
            <Menu as="div" className="relative xl:hidden">
              <MenuButton
                className={`shrink-0 whitespace-nowrap transition ${
                  navLinks.some(
                    (l) => NAV_OVERFLOW.has(l.href) && isNavCurrent(pathname, l.href),
                  )
                    ? activeLinkClass
                    : linkClass
                }`}
              >
                {t(locale, "more")}
              </MenuButton>
              <MenuItems
                className="absolute start-0 top-full z-50 mt-2 min-w-44 rounded-[12px] bg-card p-1 text-foreground shadow-lg ring-1 ring-outline outline-none"
              >
                {navLinks
                  .filter((l) => NAV_OVERFLOW.has(l.href))
                  .map((l) => {
                    const current = isNavCurrent(pathname, l.href);
                    return (
                      <MenuItem key={l.href}>
                        <Link
                          href={l.href}
                          aria-current={current ? "page" : undefined}
                          className={`block rounded-[10px] px-3 py-2 text-sm font-semibold ${
                            current
                              ? "bg-input text-primary-strong"
                              : "text-foreground hover:bg-input"
                          }`}
                        >
                          {t(locale, l.navKey)}
                        </Link>
                      </MenuItem>
                    );
                  })}
              </MenuItems>
            </Menu>
          ) : null}
        </nav>

        <div className="ms-auto flex shrink-0 items-center gap-2 md:gap-3">
          <select
            value={locale}
            onChange={(e) => dispatch(setLocale(e.target.value as Locale))}
            className={`lang-select hidden rounded-[12px] px-2 py-2 text-xs font-semibold outline-none sm:block ${
              immersive
                ? "bg-white/15 text-white"
                : "bg-input text-foreground"
            }`}
            aria-label={t(locale, "language")}
          >
            <option value="en" className="bg-card text-foreground">
              EN
            </option>
            <option value="ar" className="bg-card text-foreground">
              AR
            </option>
            <option value="ku" className="bg-card text-foreground">
              KU
            </option>
          </select>

          <button
            type="button"
            onClick={() => dispatch(toggleTheme())}
            className={`hidden h-10 w-10 items-center justify-center rounded-[12px] sm:flex ${
              immersive ? "bg-white/15 text-white" : "bg-input text-foreground"
            }`}
            aria-label={dark ? t(locale, "themeLight") : t(locale, "themeDark")}
          >
            {dark ? (
              <Sun className="size-4" strokeWidth={2} aria-hidden />
            ) : (
              <Moon className="size-4" strokeWidth={2} aria-hidden />
            )}
          </button>

          <Link
            href="/sell"
            className="shrink-0 whitespace-nowrap rounded-[12px] bg-primary-fill px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition hover:brightness-110"
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
                {accountChipLabel(me?.profile?.displayName, locale)}
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
              className={`hidden rounded-[12px] px-4 py-2.5 text-sm font-semibold sm:inline-flex sm:items-center ${
                immersive
                  ? "bg-white/20 text-white ring-1 ring-white/80 hover:bg-white/35"
                  : "bg-card text-foreground ring-1 ring-outline hover:bg-input"
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
            aria-label={menuOpen ? t(locale, "closeMenu") : t(locale, "openMenu")}
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
            {navLinks.map((l) => {
              const current = isNavCurrent(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={current ? "page" : undefined}
                  className={`rounded-[12px] px-3 py-3 text-sm font-semibold hover:bg-input ${
                    current ? "bg-input text-primary-strong" : ""
                  }`}
                >
                  {t(locale, l.labelKey)}
                </Link>
              );
            })}
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-[12px] px-3 py-3 text-sm font-semibold hover:bg-input"
                >
                  {accountChipLabel(me?.profile?.displayName, locale)}
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
                className="lang-select flex-1 rounded-[12px] bg-input px-3 py-2.5 text-xs font-semibold text-foreground outline-none"
                aria-label={t(locale, "language")}
              >
                <option value="en" className="bg-card text-foreground">
                  EN
                </option>
                <option value="ar" className="bg-card text-foreground">
                  AR
                </option>
                <option value="ku" className="bg-card text-foreground">
                  KU
                </option>
              </select>
              <button
                type="button"
                onClick={() => dispatch(toggleTheme())}
                className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-input text-foreground"
                aria-label={dark ? t(locale, "themeLight") : t(locale, "themeDark")}
              >
                {dark ? (
                  <Sun className="size-4" strokeWidth={2} aria-hidden />
                ) : (
                  <Moon className="size-4" strokeWidth={2} aria-hidden />
                )}
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
