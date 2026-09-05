"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Scale, Share2, Flag } from "lucide-react";
import type { Car } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleFavorite } from "@/store/slices/favoritesSlice";
import { toCompareCar, useCompareStore } from "@/store/compare-store";
import { shareListing } from "@/lib/compare";
import { emitToast } from "@/components/site-toast";
import { t } from "@/lib/i18n";

const fabClass =
  "flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow-sm ring-1 ring-outline/70 backdrop-blur transition hover:bg-primary-fill hover:text-on-primary hover:ring-primary-fill";

const compareRevealClass =
  "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100 focus-visible:opacity-100";

export function ListingQuickActions({
  car,
  title,
  onReport,
  reportBusy = false,
  variant = "grid",
}: {
  car: Car;
  title: string;
  onReport?: () => void;
  reportBusy?: boolean;
  variant?: "grid" | "detail";
}) {
  const { user } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.preferences.locale);
  const isFavorite = useAppSelector((s) => s.favorites.ids.includes(car.id));
  const inCompare = useCompareStore((s) =>
    s.compareList.some((item) => item.id === car.id),
  );
  const add = useCompareStore((s) => s.add);
  const remove = useCompareStore((s) => s.remove);
  const [busyShare, setBusyShare] = useState(false);

  async function onFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/auth?next=${encodeURIComponent(`/cars/${car.id}`)}`);
      return;
    }
    try {
      await dispatch(toggleFavorite(car.id)).unwrap();
    } catch {
      // Favorite toggle is best-effort on cards.
    }
  }

  function onCompare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inCompare) {
      remove(car.id);
      return;
    }
    const result = add(toCompareCar(car));
    if (!result.ok) {
      emitToast(
        result.reason === "full"
          ? t(locale, "compareFull")
          : t(locale, "compareAlready"),
      );
    }
  }

  async function onShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busyShare) return;
    setBusyShare(true);
    try {
      const result = await shareListing(car.id, title);
      if (result === "copied") emitToast(t(locale, "linkCopied"));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      emitToast(t(locale, "shareFailed"));
    } finally {
      setBusyShare(false);
    }
  }

  return (
    <div className="absolute top-3 end-3 z-10 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={(e) => void onFavorite(e)}
        aria-label={
          isFavorite
            ? t(locale, "removeFromFavorites")
            : t(locale, "addToFavorites")
        }
        className={`${fabClass} ${isFavorite ? "text-red-500" : ""}`}
      >
        <Heart
          size={16}
          fill={isFavorite ? "currentColor" : "none"}
          strokeWidth={2}
        />
      </button>
      <button
        type="button"
        onClick={onCompare}
        aria-pressed={inCompare}
        aria-label={
          inCompare ? t(locale, "removeFromCompare") : t(locale, "addToCompare")
        }
        className={`${fabClass} ${inCompare ? "bg-primary-fill text-on-primary" : ""} ${
          variant === "grid" && !inCompare ? compareRevealClass : ""
        }`}
      >
        <Scale size={16} strokeWidth={2} />
      </button>
      {variant === "detail" ? (
        <button
          type="button"
          onClick={(e) => void onShare(e)}
          aria-label={t(locale, "shareListing")}
          disabled={busyShare}
          className={fabClass}
        >
          <Share2 size={16} strokeWidth={2} />
        </button>
      ) : null}
      {onReport ? (
        <button
          type="button"
          disabled={reportBusy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (reportBusy) return;
            onReport();
          }}
          aria-label={t(locale, "reportListing")}
          className={`${fabClass} disabled:pointer-events-none disabled:opacity-60`}
        >
          <Flag size={16} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}
