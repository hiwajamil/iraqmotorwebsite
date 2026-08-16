"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, type Car } from "@/lib/api";
import { listingItemParams, trackEvent } from "@/lib/analytics";
import { carTitle } from "@/components/car-card";
import { PriceHistoryTimeline } from "@/components/price-history-timeline";
import { TrustChips } from "@/components/trust-chips";
import { ListingGallery } from "@/components/listing-gallery";
import { ListingQuickActions } from "@/components/listing-quick-actions";
import { ListingSellerCard } from "@/components/listing-seller-card";
import { useAuth } from "@/components/auth-provider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleFavorite } from "@/store/slices/favoritesSlice";
import {
  buildTrustChips,
  formatAskPrice,
  formatMoney,
  isPriceDropped,
  soldDisplayPrice,
} from "@/lib/car-pricing-trust";
import { t } from "@/lib/i18n";
import {
  formatMileageLabel,
  listingDescription,
  listingFeatureKeys,
  localizeCity,
  localizeOption,
  stringField,
} from "@/lib/listing-labels";

function Spec({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-[12px] bg-input px-3 py-2.5">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-semibold" dir="auto">
        {value}
      </p>
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/cars"
      className="inline-flex items-center gap-1.5 rounded-full bg-input/80 px-3 py-1.5 text-sm font-medium text-foreground/80 ring-1 ring-outline/60 transition hover:bg-input hover:text-foreground"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="rtl:rotate-180"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      {label}
    </Link>
  );
}

export default function CarDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.preferences.locale);
  const isFavorite = useAppSelector((s) =>
    params.id ? s.favorites.ids.includes(params.id) : false,
  );
  const [car, setCar] = useState<Car | null>(null);
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
        setError(e instanceof Error ? e.message : t(locale, "loadFailed"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, locale]);

  function requireAuth(action: string) {
    if (user) return true;
    setMessageTone("err");
    setMessage(t(locale, "signInToAction", { action }));
    router.push(
      `/auth?next=${encodeURIComponent(`/cars/${params.id ?? ""}`)}`,
    );
    return false;
  }

  async function placeBid() {
    if (!requireAuth(t(locale, "placeBid").toLowerCase())) return;
    const amount = Number(bid.replace(/[^\d]/g, ""));
    if (!amount) {
      setMessageTone("err");
      setMessage(t(locale, "enterValidAmount"));
      return;
    }
    setBidding(true);
    setMessage(null);
    try {
      await api.post(`/cars/${params.id}/bids`, { amount });
      setMessageTone("ok");
      setMessage(t(locale, "bidSubmitted"));
      setBid("");
      const refreshed = await api.get<Car>(`/cars/${params.id}`);
      setCar(refreshed);
    } catch (e) {
      setMessageTone("err");
      setMessage(e instanceof Error ? e.message : t(locale, "bidFailed"));
    } finally {
      setBidding(false);
    }
  }

  async function onToggleFavorite() {
    if (!requireAuth(t(locale, "save").toLowerCase())) return;
    if (!params.id) return;
    setSavingFav(true);
    try {
      await dispatch(toggleFavorite(params.id)).unwrap();
      setMessageTone("ok");
      setMessage(isFavorite ? t(locale, "saved") : t(locale, "save"));
    } catch (e) {
      setMessageTone("err");
      setMessage(e instanceof Error ? e.message : t(locale, "bidFailed"));
    } finally {
      setSavingFav(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-4xl px-[4%] pt-28 text-center">
        <h1 className="text-2xl font-bold">{t(locale, "listingNotFound")}</h1>
        <p className="mt-2 text-muted">{t(locale, "listingRemoved")}</p>
        <div className="mt-6">
          <BackLink label={t(locale, "backToBrowse")} />
        </div>
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
          {t(locale, "retry")}
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
  const title = carTitle(car, locale) || t(locale, "browseCars");
  const sold = car.status === "sold";
  const priceDropped = !sold && isPriceDropped(car.priceMeta);
  const displayPrice = sold ? soldDisplayPrice(car) : formatAskPrice(car);
  const fuel = localizeOption(
    locale,
    stringField(car, "fuelKey", "fuel", "engine"),
  );
  const transmission = localizeOption(
    locale,
    stringField(car, "transmissionKey", "transmission"),
  );
  const condition = localizeOption(
    locale,
    stringField(car, "conditionKey", "condition"),
  );
  const color = localizeOption(locale, stringField(car, "colorKey", "color"));
  const plateType = localizeOption(locale, stringField(car, "plateTypeKey"));
  const plateCity = localizeCity(locale, stringField(car, "plateCityKey"));
  const plate = [plateType, plateCity].filter(Boolean).join(" · ");
  const city = localizeCity(locale, stringField(car, "city"));
  const province = localizeCity(locale, stringField(car, "province"));
  const location =
    [city, province].filter((part, i, all) => part && all.indexOf(part) === i).join(
      " · ",
    ) || t(locale, "iraq");
  const mileage = formatMileageLabel(
    locale,
    car.mileageValue ?? car.mileage,
    car.mileageUnit,
  );
  const description = listingDescription(car);
  const featureKeys = listingFeatureKeys(car);
  const trustChips = buildTrustChips({
    vin: car.vin,
    conditionReport: car.conditionReport,
    vinNumber: car.vinNumber,
    locale,
  });
  const highestFormatted = formatMoney(
    car.highestBid != null ? Number(car.highestBid) : 0,
    car.currencyKey,
  );
  const sellerId = car.sellerId ? String(car.sellerId) : "";
  const priceDroppedBadge = (
    <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-teal-700/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
      ↓ {t(locale, "priceDropped")}
    </span>
  );

  return (
    <div className="mx-auto max-w-5xl px-[4%] pb-16 pt-24">
      <BackLink label={t(locale, "backToBrowse")} />
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <ListingGallery
          images={images}
          title={title}
          locale={locale}
          badge={priceDropped ? priceDroppedBadge : null}
          actions={<ListingQuickActions car={car} title={title} />}
        />

        <div className="space-y-4">
          <div>
            {sold ? (
              <span className="mb-2 inline-block rounded-full bg-input px-2.5 py-1 text-[11px] font-semibold">
                {t(locale, "sold")}
              </span>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight" dir="auto">
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-2xl font-semibold ${
                sold ? "text-foreground" : "text-primary"
              }`}
              dir="ltr"
            >
              {sold
                ? t(locale, "soldFor", { price: displayPrice })
                : displayPrice}
            </p>
            {priceDropped ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-700/95 px-2.5 py-1 text-[11px] font-semibold text-white">
                ↓ {t(locale, "priceDropped")}
              </span>
            ) : null}
          </div>
          <TrustChips chips={trustChips} />
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {mileage ? (
              <span dir="ltr" className="[unicode-bidi:isolate]">
                {mileage}
              </span>
            ) : null}
            {mileage && transmission ? (
              <span aria-hidden className="text-outline">
                ·
              </span>
            ) : null}
            {transmission ? (
              <span dir="auto" className="[unicode-bidi:isolate]">
                {transmission}
              </span>
            ) : null}
            {(mileage || transmission) && location ? (
              <span aria-hidden className="text-outline">
                ·
              </span>
            ) : null}
            {location ? (
              <span dir="auto" className="[unicode-bidi:isolate]">
                {location}
              </span>
            ) : null}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Spec label={t(locale, "specFuel")} value={fuel || null} />
            <Spec
              label={t(locale, "specTransmission")}
              value={transmission || null}
            />
            <Spec
              label={t(locale, "specCondition")}
              value={condition || null}
            />
            <Spec label={t(locale, "specPlate")} value={plate || null} />
            <Spec
              label={t(locale, "specYear")}
              value={car.year != null ? String(car.year) : null}
            />
            <Spec label={t(locale, "specColor")} value={color || null} />
            <Spec label={t(locale, "specMileage")} value={mileage} />
            <Spec
              label={t(locale, "specBody")}
              value={
                localizeOption(locale, stringField(car, "bodyTypeKey", "bodyType")) ||
                null
              }
            />
            <Spec
              label={t(locale, "specDrivetrain")}
              value={
                localizeOption(
                  locale,
                  stringField(car, "drivetrainKey", "drivetrain"),
                ) || null
              }
            />
            <Spec
              label={t(locale, "specEngineSize")}
              value={
                localizeOption(locale, stringField(car, "engineSizeKey")) || null
              }
            />
            <Spec
              label={t(locale, "specCylinders")}
              value={
                localizeOption(locale, stringField(car, "cylindersKey")) || null
              }
            />
            <Spec
              label={t(locale, "specImport")}
              value={
                localizeOption(locale, stringField(car, "importCountryKey")) ||
                null
              }
            />
            <Spec
              label={t(locale, "specHorsepower")}
              value={
                stringField(car, "horsepower")
                  ? `${stringField(car, "horsepower")} HP`
                  : null
              }
            />
            <Spec
              label={t(locale, "specSeatMaterial")}
              value={
                localizeOption(
                  locale,
                  stringField(car, "seatMaterialKey", "seat_material"),
                ) || null
              }
            />
            <Spec
              label={t(locale, "specSeats")}
              value={
                localizeOption(locale, stringField(car, "seatCountKey")) ||
                (car.numberOfSeats != null || car.number_of_seats != null
                  ? String(car.numberOfSeats ?? car.number_of_seats)
                  : null)
              }
            />
            <Spec
              label={t(locale, "specPainted")}
              value={
                localizeOption(
                  locale,
                  stringField(car, "paintedPartsKey", "painted_parts"),
                ) || null
              }
            />
          </div>

          {stringField(car, "damagePhotoUrl", "damage_photo_url") ||
          (Array.isArray(car.damageImageUrls) && car.damageImageUrls[0]) ? (
            <div>
              <p className="mb-2 text-[11px] font-medium text-muted">
                {t(locale, "specDamage")}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  stringField(car, "damagePhotoUrl", "damage_photo_url") ||
                  String(car.damageImageUrls?.[0] ?? "")
                }
                alt=""
                className="h-40 w-full rounded-[12px] object-cover ring-1 ring-outline"
              />
            </div>
          ) : null}

          {description || featureKeys.length ? (
            <section className="rounded-[16px] bg-card p-4 ring-1 ring-outline/60">
              <h2 className="text-sm font-semibold tracking-tight">
                {t(locale, "descriptionFeatures")}
              </h2>
              {description ? (
                <p
                  className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90"
                  dir="auto"
                >
                  {description}
                </p>
              ) : null}
              {featureKeys.length ? (
                <div className={description ? "mt-4" : "mt-3"}>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                    {t(locale, "features")}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {featureKeys.map((key) => (
                      <li
                        key={key}
                        className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-primary/15"
                      >
                        {localizeOption(locale, key)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          <PriceHistoryTimeline carId={car.id} locale={locale} />

          <ListingSellerCard
            sellerId={sellerId || null}
            locale={locale}
            listingSeller={{
              displayName: stringField(car, "sellerName") || null,
              showroomName: stringField(car, "sellerShowroom") || null,
              phone: stringField(car, "sellerPhone", "phone", "phoneNumber") || null,
              photoUrl: stringField(car, "sellerAvatar") || null,
            }}
          />

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={savingFav}
              onClick={() => void onToggleFavorite()}
              className="rounded-[12px] bg-input px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {isFavorite ? t(locale, "saved") : t(locale, "save")}
            </button>
          </div>

          {!sold ? (
            <div className="rounded-[16px] bg-card p-4 ring-1 ring-outline">
              <p className="text-sm font-semibold">{t(locale, "placeBid")}</p>
              <p className="mt-1 text-xs text-muted" dir="auto">
                {t(locale, "highestBid", { amount: highestFormatted })}
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={bid}
                  onChange={(e) => setBid(e.target.value)}
                  placeholder={t(locale, "bidAmount")}
                  inputMode="numeric"
                  dir="ltr"
                  className="flex-1 rounded-[12px] bg-input px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
                />
                <button
                  type="button"
                  disabled={bidding || !bid.trim()}
                  onClick={() => void placeBid()}
                  className="rounded-[12px] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
                >
                  {bidding ? "…" : t(locale, "bid")}
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
