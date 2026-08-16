"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

type PaymentView = {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  alreadyPaid?: boolean;
};

function ReturnBody() {
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const paymentId = params.get("paymentId") ?? "";
  const cancelled = params.get("cancelled") === "1";
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          setError(e instanceof Error ? e.message : "Could not load payment");
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

  return (
    <div className="mx-auto max-w-lg px-[4%] pb-16 pt-28">
      <h1 className="text-3xl font-bold tracking-tight">Card payment</h1>
      <p className="mt-2 text-sm text-muted">
        N-Genius checkout for your Iraq Motors listing boost.
      </p>

      <div className="mt-8 rounded-[16px] border border-outline bg-card p-6">
        {paid ? (
          <p className="text-emerald-700 dark:text-emerald-300">
            Payment received. You can return to the app or dashboard to finish
            publishing the listing.
          </p>
        ) : status === "cancelled" || status === "failed" ? (
          <p className="text-red-600">
            Payment was cancelled or declined. Open the listing again and retry
            debit card checkout.
          </p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : !user && !loading ? (
          <p className="text-muted">
            Sign in to confirm this payment, or return to the Iraq Motors app.
          </p>
        ) : (
          <p className="text-muted">
            Waiting for N-Genius to confirm the payment…
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
          Go to dashboard
        </Link>
        {!user && (
          <Link
            href={`/auth?next=${encodeURIComponent(`/payments/ngenius/return?paymentId=${paymentId}`)}`}
            className="rounded-[12px] border border-outline px-4 py-2.5 text-sm font-semibold"
          >
            Sign in
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
        <p className="px-[4%] pt-28 text-center text-muted">Loading…</p>
      }
    >
      <ReturnBody />
    </Suspense>
  );
}
