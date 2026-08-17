"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ADMIN_NAV } from "@/lib/admin";
import { getFirebaseAuth, sendEmailVerification } from "@/lib/firebase";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, me, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useAppSelector((s) => s.preferences.locale);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const firebaseUser = getFirebaseAuth()?.currentUser;
  const emailVerified = Boolean(firebaseUser?.emailVerified);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth");
    }
  }, [loading, user, router]);

  async function resendVerification() {
    const current = getFirebaseAuth()?.currentUser;
    if (!current) return;
    setVerifyBusy(true);
    setVerifyMsg(null);
    try {
      await sendEmailVerification(current);
      setVerifyMsg(t(locale, "adminVerificationEmailSent"));
    } catch (err) {
      setVerifyMsg(
        err instanceof Error ? err.message : t(locale, "adminCouldNotSendEmail"),
      );
    } finally {
      setVerifyBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="px-4 py-16 text-center text-muted">{t(locale, "loading")}</p>
    );
  }

  if (!user) {
    return null;
  }

  // Wait for /users/me before rendering admin tools.
  if (!me) {
    if (loading) {
      return (
        <p className="px-4 py-16 text-center text-muted">
          {t(locale, "adminCheckingAccess")}
        </p>
      );
    }
    return (
      <div className="mx-auto max-w-lg px-[4%] pb-16 pt-24 text-center">
        <h1 className="text-2xl font-bold">{t(locale, "adminAccessDenied")}</h1>
        <p className="mt-2 text-sm text-muted">
          {t(locale, "adminAccessVerifyFailed")}
        </p>
        {!emailVerified ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted">
              {t(locale, "adminEmailNotVerified")}
            </p>
            <button
              type="button"
              disabled={verifyBusy}
              onClick={() => void resendVerification()}
              className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {verifyBusy
                ? t(locale, "sending")
                : t(locale, "adminResendVerification")}
            </button>
            {verifyMsg ? (
              <p className="text-xs text-muted">{verifyMsg}</p>
            ) : null}
          </div>
        ) : null}
        <Link href="/auth" className="mt-6 inline-block text-sm font-semibold text-primary">
          {t(locale, "signIn")}
        </Link>
      </div>
    );
  }

  if (!me.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-lg px-[4%] pb-16 pt-24 text-center">
        <h1 className="text-2xl font-bold">{t(locale, "adminAccessDenied")}</h1>
        <p className="mt-2 text-sm text-muted">
          {t(locale, "adminSuperAdminRequired")}
        </p>
        {!emailVerified ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted">
              {t(locale, "adminVerifyEmailForAccess")}
            </p>
            <button
              type="button"
              disabled={verifyBusy}
              onClick={() => void resendVerification()}
              className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {verifyBusy
                ? t(locale, "sending")
                : t(locale, "adminResendVerification")}
            </button>
            {verifyMsg ? (
              <p className="text-xs text-muted">{verifyMsg}</p>
            ) : null}
          </div>
        ) : null}
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary">
          {t(locale, "adminBackToHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-none gap-6 px-4 pb-16 pt-24 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:px-8 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-1 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <p className="mb-3 hidden text-xs font-bold uppercase tracking-wider text-muted lg:block">
          {t(locale, "admin")}
        </p>
        <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-outline px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:block lg:space-y-1 lg:overflow-visible lg:border-0 lg:px-0 lg:pb-0">
          {ADMIN_NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap lg:block ${
                  active
                    ? "bg-primary text-on-primary"
                    : "hover:bg-input"
                }`}
              >
                {t(locale, item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 hidden space-y-1 border-t border-outline pt-4 lg:block">
          <Link
            href="/cars"
            className="block rounded-[var(--radius-control)] px-3 py-2 text-xs font-medium text-muted hover:bg-input hover:text-foreground"
          >
            {t(locale, "browseCars")}
          </Link>
          <Link
            href="/showrooms"
            className="block rounded-[var(--radius-control)] px-3 py-2 text-xs font-medium text-muted hover:bg-input hover:text-foreground"
          >
            {t(locale, "adminPublicShowrooms")}
          </Link>
        </div>
      </aside>
      <div className="min-w-0 w-full">{children}</div>
    </div>
  );
}
