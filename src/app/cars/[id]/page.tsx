"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Car } from "@/lib/api";
import { listingItemParams, trackEvent } from "@/lib/analytics";
import { carTitle } from "@/components/car-card";
import { PriceHistoryTimeline } from "@/components/price-history-timeline";
import { TrustChips } from "@/components/trust-chips";
import { useAuth } from "@/components/auth-provider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleFavorite } from "@/store/slices/favoritesSlice";
import {
  buildTrustChips,
  formatMoney,
  isPriceDropped,
  soldDisplayPrice,
} from "@/lib/car-pricing-trust";

function Spec({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-[12px] bg-input px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

export default function CarDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const isFavorite = useAppSelector((s) =>
    params.id ? s.favorites.ids.includes(params.id) : false,
  );
  const [car, setCar] = useState<Car | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [bid, setBid] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "err">("ok");
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [bidding, setBidding] = useState(false);
  const [savingFav, setSavingFav] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.get<Car>(`/cars/${params.id}`);
        if (!cancelled) {
          setCar(data);
          setActiveImage(0);
          setError(null);
          setNotFound(false);
          trackEvent("view_item", listingItemParams(data));
        }
      } catch (e) {
        if (cancelled) return;
        const status =
          e && typeof e === "object" && "status" in e
            ? Number((e as { status: number }).status)
            : 0;
        if (status === 404) setNotFound(true);
        setError(e instanceof Error ? e.message : "Failed to load listing");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  function requireAuth(action: string) {
    if (user) return true;
    setMessageTone("err");
    setMessage(`Sign in to ${action}`);
    router.push(
      `/auth?next=${encodeURIComponent(`/cars/${params.id ?? ""}`)}`,
    );
    return false;
  }

  async function placeBid() {
    if (!requireAuth("place a bid")) return;
    const amount = Number(bid.replace(/[^\d]/g, ""));
    if (!amount) {
      setMessageTone("err");
      setMessage("Enter a valid amount");
      return;
    }
    setBidding(true);
    setMessage(null);
    try {
      await api.post(`/cars/${params.id}/bids`, { amount });
      setMessageTone("ok");
      setMessage("Bid submitted");
      setBid("");
      const refreshed = await api.get<Car>(`/cars/${params.id}`);
      setCar(refreshed);
    } catch (e) {
      setMessageTone("err");
      setMessage(e instanceof Error ? e.message : "Bid failed");
    } finally {
      setBidding(false);
    }
  }

  async function onToggleFavorite() {
    if (!requireAuth("save favorites")) return;
    if (!params.id) return;
    setSavingFav(true);
    try {
      await dispatch(toggleFavorite(params.id)).unwrap();
      setMessageTone("ok");
      setMessage(isFavorite ? "Removed from favorites" : "Added to favorites");
    } catch (e) {
      setMessageTone("err");
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setSavingFav(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-4xl px-[4%] pt-28 text-center">
        <h1 className="text-2xl font-bold">Listing not found</h1>
        <p className="mt-2 text-muted">
          This car may have been removed or is no longer available.
        </p>
        <Link
          href="/cars"
          className="mt-6 inline-block text-sm font-semibold text-primary"
        >
          Back to browse
        </Link>
      </div>
    );
  }

  if (error && !car) {
    return (
      <div className="mx-auto max-w-4xl px-[4%] pt-28 text-center">
        <p className="text-red-600" role="alert">
          {error}
        </p>
        <button
          type="button"
          className="mt-4 text-sm font-semibold text-primary"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!car) {
    return (
      <div className="mx-auto max-w-5xl px-[4%] pt-28">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-[4/3] animate-pulse rounded-[16px] bg-input" />
          <div className="space-y-3">
            <div className="h-8 w-2/3 animate-pulse rounded bg-input" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-input" />
            <div className="h-24 animate-pulse rounded bg-input" />
          </div>
        </div>
      </div>
    );
  }

  const images =
    (car.imageUrls?.length
      ? car.imageUrls.map(String)
      : car.imageUrl
        ? [String(car.imageUrl)]
        : []) || [];
  const title = carTitle(car) || "Car listing";
  const sold = car.status === "sold";
  const priceDropped = !sold && isPriceDropped(car.priceMeta);
  const displayPrice = sold
    ? soldDisplayPrice(car)
    : car.price && String(car.price).trim()
      ? String(car.price)
      : formatMoney(car.priceValue, car.currencyKey);
  const fuel = String(car.fuelKey || car.fuel || "");
  const transmission = String(car.transmissionKey || car.transmission || "");
  const condition = String(car.conditionKey || car.condition || "");
  const plate = [car.plateTypeKey, car.plateCityKey]
    .filter(Boolean)
    .join(" · ");
  const trustChips = buildTrustChips({
    vin: car.vin,
    conditionReport: car.conditionReport,
    vinNumber: car.vinNumber,
  });

  return (
    <div className="mx-auto max-w-5xl px-[4%] pb-16 pt-24">
      <Link href="/cars" className="text-sm font-medium text-primary">
        ← Back to browse
      </Link>
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative overflow-hidden rounded-[16px] bg-input ring-1 ring-outline">
            {images[activeImage] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[activeImage]}
                alt={title}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-muted">
                No photo
              </div>
            )}
            {priceDropped ? (
              <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-teal-700/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                ↓ Price dropped
              </span>
            ) : null}
          </div>
          {images.length > 1 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {images.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-[10px] ring-2 transition ${
                    i === activeImage
                      ? "ring-primary"
                      : "ring-transparent opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            {sold ? (
              <span className="mb-2 inline-block rounded-full bg-input px-2.5 py-1 text-[11px] font-semibold">
                Sold
              </span>
            ) : null}
            <h1 className="text-3xl font-bold capitalize tracking-tight">
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-2xl font-semibold ${
                sold ? "text-foreground" : "text-primary"
              }`}
            >
              {sold ? `Sold for ${displayPrice}` : displayPrice}
            </p>
            {priceDropped ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-700/95 px-2.5 py-1 text-[11px] font-semibold text-white">
                ↓ Price dropped
              </span>
            ) : null}
          </div>
          <TrustChips chips={trustChips} />
          <p className="text-sm text-muted">
            {[car.city, car.province].filter(Boolean).join(", ") || "Iraq"}
            {car.mileageValue != null
              ? ` · ${Number(car.mileageValue).toLocaleString()} km`
              : ""}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Spec label="Fuel" value={fuel || null} />
            <Spec label="Transmission" value={transmission || null} />
            <Spec label="Condition" value={condition || null} />
            <Spec label="Plate" value={plate || null} />
            <Spec
              label="Year"
              value={car.year != null ? String(car.year) : null}
            />
            <Spec
              label="Color"
              value={car.colorKey ? String(car.colorKey) : null}
            />
          </div>

          {car.description ? (
            <p className="text-sm leading-relaxed text-foreground/90">
              {String(car.description)}
            </p>
          ) : null}

          <PriceHistoryTimeline carId={car.id} />

          {car.sellerId ? (
            <Link
              href={`/cars?sellerId=${encodeURIComponent(String(car.sellerId))}`}
              className="inline-block text-sm font-semibold text-primary"
            >
              More from this seller
            </Link>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={savingFav}
              onClick={() => void onToggleFavorite()}
              className="rounded-[12px] bg-input px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {isFavorite ? "Saved" : "Save"}
            </button>
          </div>

          {!sold ? (
            <div className="rounded-[16px] bg-card p-4 ring-1 ring-outline">
              <p className="text-sm font-semibold">Place a bid</p>
              {car.highestBid != null ? (
                <p className="mt-1 text-xs text-muted">
                  Highest: {Number(car.highestBid).toLocaleString()}
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <input
                  value={bid}
                  onChange={(e) => setBid(e.target.value)}
                  placeholder="Amount"
                  inputMode="numeric"
                  className="flex-1 rounded-[12px] bg-input px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
                />
                <button
                  type="button"
                  disabled={bidding || !bid.trim()}
                  onClick={() => void placeBid()}
                  className="rounded-[12px] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
                >
                  {bidding ? "…" : "Bid"}
                </button>
              </div>
              {message ? (
                <p
                  role="status"
                  className={`mt-2 text-xs ${
                    messageTone === "ok"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
