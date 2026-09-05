"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { useAuth } from "@/components/auth-provider";
import { api, type Car } from "@/lib/api";
import { formatAskPrice } from "@/lib/car-pricing-trust";
import { listingStatusClass } from "@/lib/dashboard";
import { formatCarTitle } from "@/lib/listing-display";
import { useAppSelector } from "@/store/hooks";
import { t, listingStatusLabel } from "@/lib/i18n";

type ListingCounts = {
  total: number;
  draft: number;
  pending: number;
  active: number;
  rejected: number;
  sold: number;
  expired: number;
};

type ConfirmAction =
  | { type: "sold"; car: Car }
  | { type: "delete"; car: Car }
  | { type: "withdraw"; car: Car }
  | null;

export default function DashboardListingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const locale = useAppSelector((s) => s.preferences.locale);
  const [ads, setAds] = useState<Car[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<ListingCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const mine = await api.get<{
        items: Car[];
        total?: number;
        counts?: ListingCounts;
      }>("/cars/mine", { limit: "100" });
      const items = mine.items ?? [];
      setAds(items);
      setTotal(mine.total ?? items.length);
      setCounts(mine.counts ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "dashFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    const { type, car } = confirm;
    setBusyId(car.id);
    try {
      if (type === "sold") {
        await api.patch(`/cars/${car.id}/status`, { status: "sold" });
        setAds((list) =>
          list.map((row) =>
            row.id === car.id ? { ...row, status: "sold" } : row,
          ),
        );
        setCounts((prev) =>
          prev
            ? {
                ...prev,
                active: Math.max(0, prev.active - 1),
                sold: prev.sold + 1,
              }
            : prev,
        );
      } else if (type === "withdraw") {
        await api.patch(`/cars/${car.id}/status`, { status: "draft" });
        setAds((list) =>
          list.map((row) =>
            row.id === car.id ? { ...row, status: "draft" } : row,
          ),
        );
        setCounts((prev) =>
          prev
            ? {
                ...prev,
                pending: Math.max(0, prev.pending - 1),
                draft: prev.draft + 1,
              }
            : prev,
        );
      } else {
        await api.delete(`/cars/${car.id}`);
        setAds((list) => list.filter((row) => row.id !== car.id));
        setTotal((n) => Math.max(0, n - 1));
        const status = (car.status || "draft").toLowerCase();
        setCounts((prev) => {
          if (!prev) return prev;
          const next = { ...prev, total: Math.max(0, prev.total - 1) };
          if (status in next && status !== "total") {
            const key = status as keyof Omit<ListingCounts, "total">;
            next[key] = Math.max(0, next[key] - 1);
          }
          return next;
        });
      }
      setConfirm(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "dashFailed"));
    } finally {
      setBusyId(null);
    }
  }

  function publish(id: string) {
    router.push(`/sell?id=${encodeURIComponent(id)}`);
  }

  const subtitle =
    !loading && ads.length > 0
      ? counts
        ? t(locale, "dashListingsCountBreakdown", {
            count: counts.total,
            active: counts.active,
            draft: counts.draft,
            pending: counts.pending,
          })
        : total > ads.length
          ? t(locale, "dashListingsShowing", {
              shown: ads.length,
              total,
            })
          : t(locale, "dashListingsCount", { count: total || ads.length })
      : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t(locale, "dashListings")}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
        <Link
          href="/sell"
          className="rounded-[12px] bg-primary-fill px-4 py-2.5 text-sm font-semibold text-on-primary"
        >
          {t(locale, "dashNewListing")}
        </Link>
      </div>

      {error ? (
        <p className="mt-6 text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[16px] bg-input"
            />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="mt-10 rounded-[16px] bg-card p-10 text-center ring-1 ring-outline">
          <p className="font-semibold">{t(locale, "dashEmptyListings")}</p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "dashEmptyListingsHint")}
          </p>
          <Link
            href="/sell"
            className="mt-5 inline-block rounded-[12px] bg-primary-fill px-5 py-2.5 text-sm font-semibold text-on-primary"
          >
            {t(locale, "dashCreateListing")}
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {ads.map((car) => (
            <OwnerListingRow
              key={car.id}
              car={car}
              busy={busyId === car.id}
              onMarkSold={() => setConfirm({ type: "sold", car })}
              onDelete={() => setConfirm({ type: "delete", car })}
              onWithdraw={() => setConfirm({ type: "withdraw", car })}
              onPublish={() => void publish(car.id)}
            />
          ))}
        </ul>
      )}

      <AdminConfirmDialog
        open={confirm != null}
        title={
          confirm?.type === "delete"
            ? t(locale, "dashDelete")
            : confirm?.type === "withdraw"
              ? t(locale, "dashWithdraw")
              : t(locale, "dashMarkSold")
        }
        description={
          confirm?.type === "delete"
            ? t(locale, "dashDeleteConfirm")
            : confirm?.type === "withdraw"
              ? t(locale, "dashWithdrawConfirm")
              : t(locale, "dashMarkSoldConfirm")
        }
        confirmLabel={
          confirm?.type === "delete"
            ? t(locale, "dashDelete")
            : confirm?.type === "withdraw"
              ? t(locale, "dashWithdraw")
              : t(locale, "dashMarkSold")
        }
        danger={confirm?.type === "delete"}
        busy={busyId != null && confirm != null}
        onCancel={() => {
          if (busyId) return;
          setConfirm(null);
        }}
        onConfirm={() => void runConfirm()}
      />
    </div>
  );
}

function OwnerListingRow({
  car,
  busy,
  onMarkSold,
  onDelete,
  onWithdraw,
  onPublish,
}: {
  car: Car;
  busy: boolean;
  onMarkSold: () => void;
  onDelete: () => void;
  onWithdraw: () => void;
  onPublish: () => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const status = (car.status || "draft").toLowerCase();
  const title =
    formatCarTitle(car, locale) || t(locale, "dashUntitledDraft");
  const image =
    car.imageUrl ||
    (Array.isArray(car.imageUrls) && car.imageUrls[0]) ||
    "/placeholder-car.svg";
  const price =
    car.priceValue != null && Number(car.priceValue) > 0
      ? formatAskPrice(car)
      : "—";
  const canEdit =
    status === "draft" ||
    status === "active" ||
    status === "rejected" ||
    status === "pending";
  const canView = status === "active" || status === "sold";
  const canMarkSold = status === "active";
  const canDelete =
    status === "draft" ||
    status === "sold" ||
    status === "expired" ||
    status === "pending";
  const canPublish = status === "draft";
  const canWithdraw = status === "pending";

  return (
    <li className="flex flex-col gap-3 rounded-[16px] bg-card p-3 ring-1 ring-outline sm:flex-row sm:items-center sm:gap-4 sm:p-4">
      <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-[12px] bg-input sm:h-24 sm:w-36">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={String(image)}
          alt=""
          className="h-full w-full object-cover"
        />
        <span
          className={`absolute start-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur ${listingStatusClass(car.status)}`}
        >
          {listingStatusLabel(locale, car.status)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold" dir="auto">
          {title}
        </p>
        <p className="mt-1 text-sm font-semibold text-primary-strong" dir="auto">
          {price}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {canEdit ? (
            <Link
              href={`/sell?id=${encodeURIComponent(car.id)}`}
              className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold"
            >
              {t(locale, "dashEdit")}
            </Link>
          ) : null}
          {canView ? (
            <Link
              href={`/cars/${car.id}`}
              className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold"
            >
              {t(locale, "dashViewListing")}
            </Link>
          ) : null}
          {canPublish ? (
            <button
              type="button"
              disabled={busy}
              onClick={onPublish}
              className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-60"
            >
              {t(locale, "dashPublish")}
            </button>
          ) : null}
          {canWithdraw ? (
            <button
              type="button"
              disabled={busy}
              onClick={onWithdraw}
              className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-60"
            >
              {t(locale, "dashWithdraw")}
            </button>
          ) : null}
          {canMarkSold ? (
            <button
              type="button"
              disabled={busy}
              onClick={onMarkSold}
              className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold disabled:opacity-60"
            >
              {t(locale, "dashMarkSold")}
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="rounded-[12px] px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-500/10 disabled:opacity-60"
            >
              {t(locale, "dashDelete")}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
