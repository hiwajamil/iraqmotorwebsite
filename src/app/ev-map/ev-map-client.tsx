"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Phone, Star, X } from "lucide-react";
import { api } from "@/lib/api";
import {
  cityName,
  connectorTypeName,
  locText,
  operatorName,
  phoneHref,
  waHref,
  type EvCity,
  type EvConnectorType,
  type EvLookup,
  type EvMapMarker,
  type EvStationDetail,
} from "@/lib/ev-map";
import { t, type Locale } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";
import type { EvMapLeafletHandle } from "./ev-map-leaflet";

const EvMapLeaflet = dynamic(
  () => import("./ev-map-leaflet").then((m) => m.EvMapLeaflet),
  { ssr: false },
);

type ConfigResponse = {
  config: Record<string, EvLookup[]>;
};

const selectClass =
  "rounded-[12px] bg-input px-3 py-2 text-xs font-semibold outline-none ring-1 ring-transparent focus:ring-primary";

function pickLookup(list: EvLookup[] | undefined, locale: Locale) {
  return (list ?? []).map((item) => ({
    id: String(item.id ?? item.key),
    label: locText(locale, item),
  }));
}

export function EvMapClient() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const mapRef = useRef<EvMapLeafletHandle>(null);

  const [markers, setMarkers] = useState<EvMapMarker[]>([]);
  const [cities, setCities] = useState<EvCity[]>([]);
  const [connectorTypes, setConnectorTypes] = useState<EvConnectorType[]>([]);
  const [config, setConfig] = useState<Record<string, EvLookup[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [city, setCity] = useState("");
  const [connectorType, setConnectorType] = useState("");
  const [chargerType, setChargerType] = useState("");
  const [minKw, setMinKw] = useState("");
  const [maxKw, setMaxKw] = useState("");
  const [accessType, setAccessType] = useState("");
  const [status, setStatus] = useState("");
  const [pricing, setPricing] = useState("");
  const [minRating, setMinRating] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EvStationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const query = useMemo(() => {
    const q: Record<string, string> = {};
    if (city) q.city = city;
    if (connectorType) q.connectorType = connectorType;
    if (chargerType) q.chargerType = chargerType;
    if (minKw) q.minKw = minKw;
    if (maxKw) q.maxKw = maxKw;
    if (accessType) q.accessType = accessType;
    if (status) q.status = status;
    if (pricing) q.pricing = pricing;
    if (minRating) q.minRating = minRating;
    return q;
  }, [
    city,
    connectorType,
    chargerType,
    minKw,
    maxKw,
    accessType,
    status,
    pricing,
    minRating,
  ]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.get<EvCity[]>("/ev/cities"),
      api.get<EvConnectorType[]>("/ev/connector-types"),
      api.get<ConfigResponse>("/ev/config"),
    ])
      .then(([c, ct, cfg]) => {
        if (cancelled) return;
        setCities(Array.isArray(c) ? c : []);
        setConnectorTypes(Array.isArray(ct) ? ct : []);
        setConfig(cfg?.config ?? {});
      })
      .catch(() => {
        if (!cancelled) setError(t(locale, "evMapLoadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void api
      .get<EvMapMarker[]>("/ev/stations/map", query)
      .then((items) => {
        if (cancelled) return;
        setMarkers(Array.isArray(items) ? items : []);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setMarkers([]);
        setError(e instanceof Error ? e.message : t(locale, "evMapLoadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, locale]);

  const openStation = useCallback(
    (id: string) => {
      setSelectedId(id);
      setDetailLoading(true);
      void api.post(`/ev/stations/${id}/click`).catch(() => undefined);
      void api
        .get<EvStationDetail>(`/ev/stations/${id}`)
        .then((d) => setDetail(d))
        .catch(() => setDetail(null))
        .finally(() => setDetailLoading(false));
    },
    [],
  );

  function clearFilters() {
    setCity("");
    setConnectorType("");
    setChargerType("");
    setMinKw("");
    setMaxKw("");
    setAccessType("");
    setStatus("");
    setPricing("");
    setMinRating("");
  }

  const accessOptions = pickLookup(config.accessTypeValues, locale);
  const statusOptions = pickLookup(config.stationStatusValues, locale);
  const pricingOptions = pickLookup(config.pricingModelValues, locale);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col pt-16 md:pt-[4.5rem]">
      <div className="border-b border-outline bg-surface px-[4%] py-3">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                {t(locale, "evMapTitle")}
              </h1>
              <p className="text-sm text-muted">{t(locale, "evMapSubtitle")}</p>
            </div>
            <p className="text-sm font-semibold">
              {loading
                ? t(locale, "loading")
                : t(locale, "evMapStationsCount", { count: markers.length })}
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <select
              className={selectClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label={t(locale, "evMapCity")}
            >
              <option value="">{t(locale, "evMapAllCities")}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.nameEn}>
                  {cityName(c, locale)}
                  {c.stationsOnMap ? ` (${c.stationsOnMap})` : ""}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={connectorType}
              onChange={(e) => setConnectorType(e.target.value)}
              aria-label={t(locale, "evMapConnector")}
            >
              <option value="">{t(locale, "evMapAllConnectors")}</option>
              {connectorTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {connectorTypeName(ct, locale)}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={chargerType}
              onChange={(e) => setChargerType(e.target.value)}
              aria-label={t(locale, "evMapCharger")}
            >
              <option value="">{t(locale, "evMapAllChargers")}</option>
              <option value="AC">{t(locale, "evMapAc")}</option>
              <option value="DC">{t(locale, "evMapDc")}</option>
            </select>
            <input
              className={`${selectClass} w-24`}
              inputMode="numeric"
              placeholder={t(locale, "evMapMinKw")}
              value={minKw}
              onChange={(e) => setMinKw(e.target.value.replace(/[^\d.]/g, ""))}
            />
            <input
              className={`${selectClass} w-24`}
              inputMode="numeric"
              placeholder={t(locale, "evMapMaxKw")}
              value={maxKw}
              onChange={(e) => setMaxKw(e.target.value.replace(/[^\d.]/g, ""))}
            />
            <select
              className={selectClass}
              value={accessType}
              onChange={(e) => setAccessType(e.target.value)}
              aria-label={t(locale, "evMapAccess")}
            >
              <option value="">{t(locale, "evMapAllAccess")}</option>
              {accessOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label={t(locale, "evMapStatus")}
            >
              <option value="">{t(locale, "evMapAllStatuses")}</option>
              {statusOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={pricing}
              onChange={(e) => setPricing(e.target.value)}
              aria-label={t(locale, "evMapPricing")}
            >
              <option value="">{t(locale, "evMapAllPricing")}</option>
              <option value="free">{t(locale, "evMapFree")}</option>
              {pricingOptions
                .filter((o) => o.label.toLowerCase() !== "free")
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
            </select>
            <select
              className={selectClass}
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              aria-label={t(locale, "evMapRating")}
            >
              <option value="">{t(locale, "evMapAnyRating")}</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
              <option value="5">5</option>
            </select>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-[12px] px-3 py-2 text-xs font-semibold hover:bg-input"
            >
              {t(locale, "evMapClearFilters")}
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.locate()}
              className="rounded-[12px] px-3 py-2 text-xs font-semibold hover:bg-input"
            >
              {t(locale, "evMapLocate")}
            </button>
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <EvMapLeaflet
          ref={mapRef}
          markers={markers}
          selectedId={selectedId}
          onSelect={openStation}
        />
        {!loading && !error && markers.length === 0 ? (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-[400] flex justify-center px-4">
            <p className="pointer-events-auto rounded-[12px] bg-card px-4 py-2 text-sm shadow ring-1 ring-outline">
              {t(locale, "evMapEmpty")}
            </p>
          </div>
        ) : null}

        {selectedId ? (
          <StationPanel
            locale={locale}
            detail={detail}
            loading={detailLoading}
            onClose={() => {
              setSelectedId(null);
              setDetail(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function StationPanel({
  locale,
  detail,
  loading,
  onClose,
}: {
  locale: Locale;
  detail: EvStationDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <aside className="absolute inset-x-0 bottom-0 z-[500] max-h-[75vh] overflow-y-auto rounded-t-[20px] bg-card shadow-[0_-8px_40px_rgba(0,0,0,0.18)] ring-1 ring-outline md:inset-y-3 md:end-3 md:inset-x-auto md:w-[min(100%,420px)] md:max-h-none md:rounded-[16px]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-outline bg-card px-4 py-3">
        <h2 className="truncate text-base font-bold">
          {detail
            ? operatorName(detail, locale)
            : loading
              ? t(locale, "loading")
              : t(locale, "evMap")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[10px] p-2 hover:bg-input"
          aria-label={t(locale, "evMapCloseDetail")}
        >
          <X size={18} />
        </button>
      </div>
      {loading && !detail ? (
        <div className="space-y-3 p-4">
          <div className="h-36 animate-pulse rounded-[12px] bg-input" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-input" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-input" />
        </div>
      ) : detail ? (
        <div className="space-y-5 p-4 pb-8">
          {detail.coverImageUrl || detail.coverImageMediumUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={detail.coverImageMediumUrl || detail.coverImageUrl || ""}
              alt=""
              className="h-40 w-full rounded-[12px] object-cover"
            />
          ) : null}
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-input px-2.5 py-1">
              {locText(locale, detail.status)}
            </span>
            <span className="rounded-full bg-input px-2.5 py-1">
              {locText(locale, detail.accessType)}
            </span>
            {detail.maxPowerKw != null ? (
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-primary">
                {t(locale, "evMapPower", { kw: Math.round(detail.maxPowerKw) })}
              </span>
            ) : null}
            {detail.averageRating != null && detail.ratingCount ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-input px-2.5 py-1">
                <Star size={12} className="fill-current" />
                {detail.averageRating.toFixed(1)} ({detail.ratingCount})
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            <MapPin size={14} className="me-1 inline" />
            {locText(locale, detail.address) || locText(locale, detail.city)}
          </p>
          <p className="text-sm">
            <span className="font-semibold">{t(locale, "evMapOperator")}: </span>
            {operatorName(detail, locale)}
          </p>
          {detail.alwaysOpen ? (
            <p className="text-sm font-semibold text-emerald-600">
              {t(locale, "evMapAlwaysOpen")}
            </p>
          ) : detail.openingHours?.length ? (
            <div>
              <h3 className="mb-1 text-sm font-bold">{t(locale, "evMapHours")}</h3>
              <ul className="space-y-0.5 text-sm text-muted">
                {detail.openingHours.map((h) => (
                  <li key={`${h.dayOfWeekId}-${h.startTime}`}>
                    {h.dayOfWeek}: {h.startTime} – {h.endTime}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {detail.ports?.length ? (
            <div>
              <h3 className="mb-2 text-sm font-bold">{t(locale, "evMapPorts")}</h3>
              <div className="space-y-2">
                {detail.ports.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-[12px] bg-input/60 p-3 text-sm"
                  >
                    <p className="font-semibold">
                      {p.portLabel} · {locText(locale, p.status)}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {p.connectors.map((c) => (
                        <li
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-2"
                        >
                          <span>
                            {locale === "ar"
                              ? c.connectorTypeNameAr || c.connectorTypeNameEn
                              : locale === "ku"
                                ? c.connectorTypeNameKu || c.connectorTypeNameEn
                                : c.connectorTypeNameEn}{" "}
                            · {locText(locale, c.chargerType)}
                            {c.powerKw != null
                              ? ` · ${t(locale, "evMapPower", { kw: c.powerKw })}`
                              : ""}
                          </span>
                          <span className="text-xs font-semibold">
                            {locText(locale, c.pricingModel) === "Free" ||
                            c.pricingModel.id === 4
                              ? t(locale, "evMapFree")
                              : c.price != null
                                ? `${c.price} ${locText(locale, c.currency)}`
                                : locText(locale, c.pricingModel)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {detail.amenities?.length ? (
            <div>
              <h3 className="mb-1 text-sm font-bold">
                {t(locale, "evMapAmenities")}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.amenities.map((a, i) => (
                  <span
                    key={`${locText(locale, a)}-${i}`}
                    className="rounded-full bg-input px-2.5 py-1 text-xs"
                  >
                    {locText(locale, a)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {detail.images?.filter((i) => i.role === "gallery" && i.url).length ? (
            <div>
              <h3 className="mb-2 text-sm font-bold">{t(locale, "evMapPhotos")}</h3>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {detail.images
                  .filter((i) => i.url)
                  .map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.id}
                      src={img.mediumUrl || img.url}
                      alt=""
                      className="h-24 w-32 shrink-0 rounded-[10px] object-cover"
                    />
                  ))}
              </div>
            </div>
          ) : null}

          {detail.operatorContacts?.length ? (
            <div>
              <h3 className="mb-2 text-sm font-bold">
                {t(locale, "evMapContacts")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {detail.operatorContacts.map((c) => (
                  <span key={c.id} className="flex gap-2">
                    {!c.disablePhoneNumber && phoneHref(c.contactValue) ? (
                      <a
                        href={phoneHref(c.contactValue)}
                        className="inline-flex items-center gap-1 rounded-[12px] bg-input px-3 py-2 text-sm font-semibold"
                      >
                        <Phone size={14} /> {c.contactValue}
                      </a>
                    ) : null}
                    {!c.disableWhatsapp && waHref(c.contactValue) ? (
                      <a
                        href={waHref(c.contactValue)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-[12px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary"
                      >
                        {t(locale, "whatsapp")}
                      </a>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {detail.googleMapsLink ? (
            <a
              href={detail.googleMapsLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
            >
              {t(locale, "evMapDirections")}
            </a>
          ) : null}

          <div>
            <h3 className="mb-2 text-sm font-bold">{t(locale, "evMapReviews")}</h3>
            {detail.reviews?.length ? (
              <ul className="space-y-3">
                {detail.reviews.map((r) => (
                  <li key={r.id} className="rounded-[12px] bg-input/50 p-3 text-sm">
                    <p className="font-semibold">
                      {r.publicUserFullName || r.publicUserName || "—"}
                      {r.rate != null ? ` · ${r.rate}★` : ""}
                    </p>
                    {r.comment ? <p className="mt-1 text-muted">{r.comment}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t(locale, "evMapNoReviews")}</p>
            )}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
