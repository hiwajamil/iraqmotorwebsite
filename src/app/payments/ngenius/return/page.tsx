"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { t } from "@/lib/i18n";
import { NGENIUS_PENDING_PUBLISH_KEY } from "@/lib/listing-packages";
import { useAppSelector } from "@/store/hooks";
import { LoadingFallback } from "@/components/loading-fallback";

type PaymentView = {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  alreadyPaid?: boolean;
};

function ReturnBody() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const locale = useAppSelector((s) => s.preferences.locale);
  const paymentId = params.get("paymentId") ?? "";
  const cancelled = params.get("cancelled") === "1";
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const publishStarted = useRef(false);

  useEffect(() => {
    if (!paymentId || !user) return;
    let cancelledFetch = false;
    void (async () => {
      try {
        const data = await api.get<PaymentView>(
          `/payments/ngenius/orders/${paymentId}`,
        );
        if (!cancelledFetch) setPayment(data);
      } catch (e) {
        if (!cancelledFetch) {
          setError(e instanceof Error ? e.message : t(locale, "paymentLoadFailed"));
        }
      }
    })();
    return () => {
      cancelledFetch = true;
    };
  }, [paymentId, user]);

  const status = cancelled
    ? "cancelled"
    : payment?.status ?? (loading ? "loading" : "pending");
  const paid = status === "paid" || payment?.alreadyPaid === true;

  useEffect(() => {
    if (!paid || !user || publishStarted.current) return;
    let carId: string | null = null;
    try {
      carId = sessionStorage.getItem(NGENIUS_PENDING_PUBLISH_KEY);
    } catch {
      carId = null;
    }
    if (!carId) return;
    publishStarted.current = true;
    setPublishing(true);
    void (async () => {
      try {
        await api.post(`/cars/${encodeURIComponent(carId!)}/publish`);
        try {
          sessionStorage.removeItem(NGENIUS_PENDING_PUBLISH_KEY);
        } catch {
          // ignore
        }
        setPublished(true);
        router.replace("/dashboard/listings");
      } catch (e) {
        setError(e instanceof Error ? e.message : t(locale, "paymentLoadFailed"));
        publishStarted.current = false;
      } finally {
        setPublishing(false);
      }
    })();
  }, [paid, user, locale, router]);

  return (
    <div className="mx-auto max-w-lg px-[4%] pb-16 pt-28">
      <h1 className="text-3xl font-bold tracking-tight">{t(locale, "paymentCardTitle")}</h1>
      <p className="mt-2 text-sm text-muted">
        {t(locale, "paymentCardSubtitle")}
      </p>

      <div className="mt-8 rounded-[16px] border border-outline bg-card p-6">
        {paid ? (
          <p className="text-emerald-700 dark:text-emerald-300">
            {published || publishing
              ? t(locale, "paymentPublishPending")
              : t(locale, "paymentSuccessBody")}
          </p>
        ) : status === "cancelled" || status === "failed" ? (
          <p className="text-red-600">
            {t(locale, "paymentFailedBody")}
          </p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : !user && !loading ? (
          <p className="text-muted">
            {t(locale, "paymentSignInHint")}
          </p>
        ) : (
          <p className="text-muted">
            {t(locale, "paymentPendingBody")}
          </p>
        )}

        {payment?.amount != null && (
          <p className="mt-3 text-sm text-muted">
            {payment.amount.toLocaleString()} {payment.currency ?? "IQD"}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard"
          className="rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
        >
          {t(locale, "paymentGoToDashboard")}
        </Link>
        {!user && (
          <Link
            href={`/auth?next=${encodeURIComponent(`/payments/ngenius/return?paymentId=${paymentId}`)}`}
            className="rounded-[12px] border border-outline px-4 py-2.5 text-sm font-semibold"
          >
            {t(locale, "signIn")}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function NgeniusReturnPage() {
  return (
    <Suspense
      fallback={
        <LoadingFallback className="px-[4%] pt-28 text-center text-muted" />
      }
    >
      <ReturnBody />
    </Suspense>
  );
}
