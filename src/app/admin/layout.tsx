"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ADMIN_NAV } from "@/lib/admin";
import { getFirebaseAuth, sendEmailVerification } from "@/lib/firebase";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, me, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
      setVerifyMsg("Verification email sent. Check your inbox, then refresh.");
    } catch (err) {
      setVerifyMsg(err instanceof Error ? err.message : "Could not send email");
    } finally {
      setVerifyBusy(false);
    }
  }

  if (loading) {
    return <p className="px-4 py-16 text-center text-muted">Loading…</p>;
  }

  if (!user) {
    return null;
  }

  // Wait for /users/me before rendering admin tools.
  if (!me) {
    if (loading) {
      return (
        <p className="px-4 py-16 text-center text-muted">Checking access…</p>
      );
    }
    return (
      <div className="mx-auto max-w-lg px-[4%] pb-16 pt-24 text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted">
          Could not verify admin access. Sign in again with a verified
          super-admin account.
        </p>
        {!emailVerified ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted">
              Your email is not verified yet. Super-admin access requires a
              verified email.
            </p>
            <button
              type="button"
              disabled={verifyBusy}
              onClick={() => void resendVerification()}
              className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {verifyBusy ? "Sending…" : "Resend verification email"}
            </button>
            {verifyMsg ? (
              <p className="text-xs text-muted">{verifyMsg}</p>
            ) : null}
          </div>
        ) : null}
        <Link href="/auth" className="mt-6 inline-block text-sm font-semibold text-primary">
          Sign in
        </Link>
      </div>
    );
  }

  if (!me.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-lg px-[4%] pb-16 pt-24 text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-sm text-muted">
          Super admin access is required for this area.
        </p>
        {!emailVerified ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted">
              Verify your email if you expect admin access.
            </p>
            <button
              type="button"
              disabled={verifyBusy}
              onClick={() => void resendVerification()}
              className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {verifyBusy ? "Sending…" : "Resend verification email"}
            </button>
            {verifyMsg ? (
              <p className="text-xs text-muted">{verifyMsg}</p>
            ) : null}
          </div>
        ) : null}
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-none gap-6 px-4 pb-16 pt-24 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:px-8 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-1 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        <p className="mb-3 hidden text-xs font-bold uppercase tracking-wider text-muted lg:block">
          Admin
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
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 hidden space-y-1 border-t border-outline pt-4 lg:block">
          <Link
            href="/cars"
            className="block rounded-[var(--radius-control)] px-3 py-2 text-xs font-medium text-muted hover:bg-input hover:text-foreground"
          >
            Browse cars
          </Link>
          <Link
            href="/showrooms"
            className="block rounded-[var(--radius-control)] px-3 py-2 text-xs font-medium text-muted hover:bg-input hover:text-foreground"
          >
            Public showrooms
          </Link>
        </div>
      </aside>
      <div className="min-w-0 w-full">{children}</div>
    </div>
  );
}
