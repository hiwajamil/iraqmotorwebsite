"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useAppSelector } from "@/store/hooks";
import { t } from "@/lib/i18n";
import {
  DASHBOARD_NAV,
  isDashboardActive,
  type DashboardIcon,
} from "@/lib/dashboard";

function NavIcon({ name, className }: { name: DashboardIcon; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20z" />
          <path d="M9 21.5V12h6v9.5" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M12 20.5s-7-4.4-9.2-8.4C1 9.2 2.2 5.8 5.4 5.1 7.3 4.7 9.3 5.6 12 8c2.7-2.4 4.7-3.3 6.6-2.9 3.2.7 4.4 4.1 2.6 7-2.2 4-9.2 8.4-9.2 8.4z" />
        </svg>
      );
    case "car":
      return (
        <svg {...common}>
          <path d="M4 14.5 5.4 9.8A2 2 0 0 1 7.3 8.5h9.4a2 2 0 0 1 1.9 1.3L20 14.5" />
          <path d="M3 14.5h18v3.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 18z" />
          <circle cx="7" cy="18" r="1.2" />
          <circle cx="17" cy="18" r="1.2" />
          <path d="M7 8.5 8 5.5h8L17 8.5" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3" y="5.5" width="18" height="13" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case "gear":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H8a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V8c.3.6.9 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      );
  }
}

export function DashboardSidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const { me, signOut } = useAuth();
  const locale = useAppSelector((s) => s.preferences.locale);
  const profile = (me?.profile ?? {}) as Record<string, unknown>;
  const displayName =
    (typeof profile.displayName === "string" && profile.displayName) ||
    me?.email ||
    t(locale, "dashboard");
  const isShowroom = profile.accountType === "showroom";

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-[16px] bg-card p-5 ring-1 ring-outline lg:min-h-[calc(100vh-8rem)] lg:flex lg:flex-col">
        <div className="mb-6 hidden border-b border-outline pb-6 text-center lg:block">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-input text-lg font-bold text-muted">
            {displayName.slice(0, 1).toUpperCase()}
          </div>
          <p className="mt-3 text-sm font-bold text-foreground">{displayName}</p>
          <p className="mt-0.5 text-xs text-muted">
            {isShowroom
              ? t(locale, "dashShowroomAccount")
              : t(locale, "dashPersonalAccount")}
          </p>
        </div>

        <nav className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto pb-1 lg:mx-0 lg:flex-col lg:gap-2 lg:overflow-visible lg:pb-0">
          {DASHBOARD_NAV.map((item) => {
            const active = isDashboardActive(pathname, item.href);
            const badge =
              item.icon === "mail" && unreadCount > 0 ? unreadCount : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-3 rounded-[12px] px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-primary text-on-primary"
                    : "text-muted hover:bg-input hover:text-foreground"
                }`}
              >
                <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
                <span className="flex-1">{t(locale, item.labelKey)}</span>
                {badge != null ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active
                        ? "bg-on-primary/20 text-on-primary"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 hidden items-center gap-3 rounded-[12px] px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-500/10 lg:mt-auto lg:flex"
        >
          <svg
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H3"
            />
          </svg>
          {t(locale, "signOut")}
        </button>
      </div>
    </aside>
  );
}
