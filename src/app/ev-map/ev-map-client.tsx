"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Navigation,
  Phone,
  Search,
  SlidersHorizontal,
  Star,
  X,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  cityName,
  connectorTypeName,
  enrichMapMarkers,
  locText,
  markerAreaLabel,
  markerIsFree,
  markerOpenStatus,
  operatorName,
  phoneHref,
  sortMapMarkers,
  sanitizePublicStationDetail,
  stationOpenNowFromHours,
  waHref,
  type EvCity,
  type EvConnectorType,
  type EvLookup,
  type EvMapEnrichMap,
  type EvMapMarker,
  type EvMapMarkerWithDistance,
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

type PowerBand = "" | "slow" | "fast" | "ultra";

const fieldClass =
  "w-full rounded-[12px] bg-input px-3 py-2.5 text-xs font-semibold outline-none ring-1 ring-transparent focus:ring-primary";

function pickLookup(list: EvLookup[] | undefined, locale: Locale) {
  return (list ?? []).map((item) => ({
    id: String(item.id ?? item.key),
    label: locText(locale, item),
    key: `${item.key ?? ""} ${item.nameEn ?? ""} ${item.text ?? ""}`.toLowerCase(),
  }));
}

function resolveActiveStatusId(
  options: { id: string; key: string; label: string }[],
) {
  const byKey = options.find(
    (o) => o.key.includes("active") && !o.key.includes("inactive"),
  );
  if (byKey) return byKey.id;
  const byLabel = options.find((o) =>
    /^(active|نشط|چالاک)$/i.test(o.label.trim()),
  );
  if (byLabel) return byLabel.id;
  return options.find((o) => o.id === "1")?.id ?? "1";
}

function powerBandFromKw(minKw: string, maxKw: string): PowerBand {
  if (!minKw && maxKw === "21") return "slow";
  if (minKw === "22" && maxKw === "49") return "fast";
  if (minKw === "50" && !maxKw) return "ultra";
  return "";
}

function chipClass(on: boolean) {
  return [
    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
    on
      ? "bg-primary-fill text-on-primary"
      : "bg-input text-foreground hover:ring-1 hover:ring-outline",
  ].join(" ");
}

function formatDistanceKm(km: number): string {
  if (km < 10) return km.toFixed(1);
  return String(Math.round(km));
}

function statusChipClass(status: EvLookup): string {
  const raw = `${status?.key ?? ""} ${status?.nameEn ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, "");
  if (raw.includes("maintenance") || raw.includes("maint")) {
    return "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200";
  }
  if (
    raw.includes("inactive") ||
    raw.includes("closed") ||
    raw.includes("offline")
  ) {
    return "bg-muted/20 text-muted";
  }
  return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200";
}

export function EvMapClient() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const mapRef = useRef<EvMapLeafletHandle>(null);
  const mapPaneRef = useRef<HTMLDivElement>(null);

  const [markers, setMarkers] = useState<EvMapMarker[]>([]);
  const [enrichMap, setEnrichMap] = useState<EvMapEnrichMap | null>(null);
  const [cities, setCities] = useState<EvCity[]>([]);
  const [connectorTypes, setConnectorTypes] = useState<EvConnectorType[]>([]);
  const [config, setConfig] = useState<Record<string, EvLookup[]>>({});
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [city, setCity] = useState("");
  const [connectorType, setConnectorType] = useState("");
  const [chargerType, setChargerType] = useState("");
  const [minKw, setMinKw] = useState("");
  const [maxKw, setMaxKw] = useState("");
  const [accessType, setAccessType] = useState("");
  const [status, setStatus] = useState("1");
  const [pricing, setPricing] = useState("");
  const [minRating, setMinRating] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EvStationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [listExpanded, setListExpanded] = useState(false);

  const accessOptions = pickLookup(config.accessTypeValues, locale);
  const statusOptions = pickLookup(config.stationStatusValues, locale);
  const pricingOptions = pickLookup(config.pricingModelValues, locale);
  const activeStatusId = useMemo(
    () => resolveActiveStatusId(statusOptions),
    [statusOptions],
  );

  useEffect(() => {
    if (!statusOptions.length) return;
    if (status === "1" && activeStatusId !== "1") {
      setStatus(activeStatusId);
    }
  }, [activeStatusId, statusOptions.length, status]);

  useEffect(() => {
    const handle = window.setTimeout(() => setQ(searchInput.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const query = useMemo(() => {
    const params: Record<string, string> = {};
    if (city) params.city = city;
    if (connectorType) params.connectorType = connectorType;
    if (chargerType) params.chargerType = chargerType;
    if (minKw) params.minKw = minKw;
    if (maxKw) params.maxKw = maxKw;
    if (accessType) params.accessType = accessType;
    if (status) params.status = status;
    if (pricing) params.pricing = pricing;
    if (minRating) params.minRating = minRating;
    if (q) params.q = q;
    return params;
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
    q,
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
    void fetch("/ev-map-enrich.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data === "object") {
          setEnrichMap(data as EvMapEnrichMap);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void api
      .get<EvMapMarker[]>("/ev/stations/map", query)
      .then((items) => {
        if (cancelled) return;
        setMarkers(
          enrichMapMarkers(Array.isArray(items) ? items : [], enrichMap),
        );
        setError(null);
        setMapReady(true);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setMarkers([]);
        setMapReady(true);
        setError(e instanceof Error ? e.message : t(locale, "evMapLoadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, locale, enrichMap]);

  const sortedMarkers = useMemo(
    () =>
      sortMapMarkers(
        markers,
        locale,
        userLocation?.lat,
        userLocation?.lng,
      ),
    [markers, locale, userLocation],
  );

  const handleUserLocation = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng });
  }, []);

  const openStation = useCallback((id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    void api.post(`/ev/stations/${id}/click`).catch(() => undefined);
    void api
      .get<EvStationDetail>(`/ev/stations/${id}`)
      .then((d) => setDetail(sanitizePublicStationDetail(d)))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, []);

  function clearFilters() {
    setCity("");
    setConnectorType("");
    setChargerType("");
    setMinKw("");
    setMaxKw("");
    setAccessType("");
    setStatus(activeStatusId);
    setPricing("");
    setMinRating("");
    setSearchInput("");
    setQ("");
  }

  function setPowerBand(band: PowerBand) {
    const current = powerBandFromKw(minKw, maxKw);
    if (current === band) {
      setMinKw("");
      setMaxKw("");
      return;
    }
    if (band === "slow") {
      setMinKw("");
      setMaxKw("21");
    } else if (band === "fast") {
      setMinKw("22");
      setMaxKw("49");
    } else if (band === "ultra") {
      setMinKw("50");
      setMaxKw("");
    } else {
      setMinKw("");
      setMaxKw("");
    }
  }

  const powerBand = powerBandFromKw(minKw, maxKw);
  const sheetFilterCount = [
    city,
    connectorType,
    accessType,
    minRating,
    powerBand === "" ? minKw : "",
    powerBand === "" ? maxKw : "",
    status && status !== activeStatusId ? status : "",
    pricing && pricing !== "free" ? pricing : "",
  ].filter(Boolean).length;

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    const pane = mapPaneRef.current;
    if (!pane) return;
    const invalidate = () => mapRef.current?.invalidate();
    invalidate();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => invalidate())
        : null;
    ro?.observe(pane);
    window.addEventListener("resize", invalidate);
    const t1 = window.setTimeout(invalidate, 80);
    const t2 = window.setTimeout(invalidate, 320);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", invalidate);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const stationCountLabel = mapReady
    ? t(locale, "evMapStationsCount", { count: markers.length })
    : t(locale, "loading");

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden pt-16 md:pt-[4.5rem]">
      <div className="shrink-0 border-b border-outline bg-surface px-[4%] py-2">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t(locale, "evMapSearchPlaceholder")}
                aria-label={t(locale, "evMapSearch")}
                className="w-full rounded-[12px] bg-input py-2 pe-3 ps-8 text-xs font-semibold outline-none ring-1 ring-transparent focus:ring-primary"
              />
            </label>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[12px] bg-input px-3 py-2 text-xs font-semibold hover:ring-1 hover:ring-outline"
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">{t(locale, "evMapMoreFilters")}</span>
              {sheetFilterCount ? (
                <span className="rounded-full bg-primary-fill px-1.5 text-[10px] text-on-primary">
                  {sheetFilterCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.locate()}
              className="shrink-0 rounded-[12px] bg-input px-3 py-2 text-xs font-semibold hover:ring-1 hover:ring-outline"
            >
              {t(locale, "evMapLocate")}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              className={chipClass(status === activeStatusId)}
              onClick={() =>
                setStatus((cur) => (cur === activeStatusId ? "" : activeStatusId))
              }
              aria-pressed={status === activeStatusId}
            >
              {t(locale, "evMapActiveOnly")}
            </button>
            <button
              type="button"
              className={chipClass(pricing === "free")}
              onClick={() => setPricing((cur) => (cur === "free" ? "" : "free"))}
              aria-pressed={pricing === "free"}
            >
              {t(locale, "evMapFree")}
            </button>
            <button
              type="button"
              className={chipClass(chargerType === "AC")}
              onClick={() =>
                setChargerType((cur) => (cur === "AC" ? "" : "AC"))
              }
              aria-pressed={chargerType === "AC"}
            >
              {t(locale, "evMapAc")}
            </button>
            <button
              type="button"
              className={chipClass(chargerType === "DC")}
              onClick={() =>
                setChargerType((cur) => (cur === "DC" ? "" : "DC"))
              }
              aria-pressed={chargerType === "DC"}
            >
              {t(locale, "evMapDc")}
            </button>
            <button
              type="button"
              className={chipClass(powerBand === "slow")}
              onClick={() => setPowerBand("slow")}
              aria-pressed={powerBand === "slow"}
            >
              {t(locale, "evMapSlow")}
            </button>
            <button
              type="button"
              className={chipClass(powerBand === "fast")}
              onClick={() => setPowerBand("fast")}
              aria-pressed={powerBand === "fast"}
            >
              {t(locale, "evMapFast")}
            </button>
            <button
              type="button"
              className={chipClass(powerBand === "ultra")}
              onClick={() => setPowerBand("ultra")}
              aria-pressed={powerBand === "ultra"}
            >
              {t(locale, "evMapUltra")}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:bg-input"
            >
              {t(locale, "evMapClearFilters")}
            </button>
          </div>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          ref={mapPaneRef}
          className="relative min-h-0 flex-1 md:w-[68%] md:max-w-[70%] md:flex-none"
        >
          <EvMapLeaflet
            ref={mapRef}
            markers={markers}
            selectedId={selectedId}
            onSelect={openStation}
            onUserLocation={handleUserLocation}
          />
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[400] flex justify-center px-3 sm:justify-start sm:px-4">
          <div className="pointer-events-auto flex max-w-[min(100%,28rem)] items-baseline gap-2 rounded-[12px] bg-card/95 px-3 py-2 shadow-md ring-1 ring-outline backdrop-blur-sm">
            <h1
              className="truncate text-sm font-bold tracking-tight md:text-base"
              title={t(locale, "evMapSubtitle")}
            >
              {t(locale, "evMapTitle")}
            </h1>
            <p className="shrink-0 text-xs font-semibold text-muted">
              {stationCountLabel}
              {mapReady && loading ? " · …" : ""}
            </p>
          </div>
        </div>
        {mapReady && !error && markers.length === 0 ? (
          <div className="pointer-events-none absolute inset-x-0 top-16 z-[400] flex justify-center px-4">
            <p className="pointer-events-auto rounded-[12px] bg-card px-4 py-2 text-sm shadow ring-1 ring-outline">
              {t(locale, "evMapEmpty")}
            </p>
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-[148px] start-3 z-[400] md:bottom-4 md:start-4">
          <div
            className="pointer-events-auto flex flex-col gap-1.5 rounded-[12px] bg-card/95 px-3 py-2 text-[11px] font-semibold shadow-md ring-1 ring-outline backdrop-blur-sm"
            role="legend"
            aria-label={t(locale, "evMapStatus")}
          >
            <div className="flex items-center gap-2">
              <span className="ev-legend-swatch ev-legend-swatch--active" />
              {t(locale, "evMapLegendActive")}
            </div>
            <div className="flex items-center gap-2">
              <span className="ev-legend-swatch ev-legend-swatch--inactive" />
              {t(locale, "evMapLegendInactive")}
            </div>
            <div className="flex items-center gap-2">
              <span className="ev-legend-swatch ev-legend-swatch--maintenance" />
              {t(locale, "evMapLegendMaintenance")}
            </div>
          </div>
        </div>

        <EvStationListSheet
          locale={locale}
          items={sortedMarkers}
          selectedId={selectedId}
          onSelect={openStation}
          expanded={listExpanded}
          onToggleExpanded={() => setListExpanded((v) => !v)}
          mapReady={mapReady}
          loading={loading}
        />

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

        <aside className="hidden min-h-0 w-[32%] min-w-[280px] max-w-[420px] shrink-0 flex-col border-s border-outline bg-card md:flex">
          <EvStationListPanel
            locale={locale}
            items={sortedMarkers}
            selectedId={selectedId}
            onSelect={openStation}
            mapReady={mapReady}
            loading={loading}
          />
        </aside>
      </div>

      <Dialog
        open={filtersOpen}
        onClose={setFiltersOpen}
        className="relative z-[600]"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-end justify-center md:items-center md:p-4">
          <DialogPanel className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[20px] bg-card shadow-xl ring-1 ring-outline md:rounded-[16px]">
            <div className="flex items-center justify-between border-b border-outline px-4 py-3">
              <DialogTitle className="text-base font-bold">
                {t(locale, "evMapMoreFilters")}
              </DialogTitle>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-[10px] p-2 hover:bg-input"
                aria-label={t(locale, "evMapCloseDetail")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto px-4 py-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">
                  {t(locale, "evMapCity")}
                </span>
                <select
                  className={fieldClass}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">{t(locale, "evMapAllCities")}</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.nameEn}>
                      {cityName(c, locale)}
                      {c.stationsOnMap ? ` (${c.stationsOnMap})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">
                  {t(locale, "evMapConnector")}
                </span>
                <select
                  className={fieldClass}
                  value={connectorType}
                  onChange={(e) => setConnectorType(e.target.value)}
                >
                  <option value="">{t(locale, "evMapAllConnectors")}</option>
                  {connectorTypes.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {connectorTypeName(ct, locale)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">
                  {t(locale, "evMapAccess")}
                </span>
                <select
                  className={fieldClass}
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value)}
                >
                  <option value="">{t(locale, "evMapAllAccess")}</option>
                  {accessOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">
                  {t(locale, "evMapStatus")}
                </span>
                <select
                  className={fieldClass}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">{t(locale, "evMapAllStatuses")}</option>
                  {statusOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">
                  {t(locale, "evMapRating")}
                </span>
                <select
                  className={fieldClass}
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                >
                  <option value="">{t(locale, "evMapAnyRating")}</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                  <option value="5">5</option>
                </select>
              </label>

              <div>
                <span className="mb-1 block text-xs font-semibold text-muted">
                  {t(locale, "evMapExactKw")}
                </span>
                <div className="flex gap-2">
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    placeholder={t(locale, "evMapMinKw")}
                    value={minKw}
                    onChange={(e) =>
                      setMinKw(e.target.value.replace(/[^\d.]/g, ""))
                    }
                    aria-label={t(locale, "evMapMinKw")}
                  />
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    placeholder={t(locale, "evMapMaxKw")}
                    value={maxKw}
                    onChange={(e) =>
                      setMaxKw(e.target.value.replace(/[^\d.]/g, ""))
                    }
                    aria-label={t(locale, "evMapMaxKw")}
                  />
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted">
                  {t(locale, "evMapPricing")}
                </span>
                <select
                  className={fieldClass}
                  value={pricing}
                  onChange={(e) => setPricing(e.target.value)}
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
              </label>
            </div>
            <div className="flex gap-2 border-t border-outline px-4 py-3">
              <button
                type="button"
                onClick={clearFilters}
                className="flex-1 rounded-[12px] bg-input px-3 py-2.5 text-sm font-semibold"
              >
                {t(locale, "evMapClearFilters")}
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="flex-1 rounded-[12px] bg-primary-fill px-3 py-2.5 text-sm font-semibold text-on-primary"
              >
                {t(locale, "evMapApplyFilters")}
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}

function EvStationListRow({
  locale,
  marker,
  selected,
  onSelect,
  rowRef,
}: {
  locale: Locale;
  marker: EvMapMarkerWithDistance;
  selected: boolean;
  onSelect: (id: string) => void;
  rowRef?: (el: HTMLButtonElement | null) => void;
}) {
  const isFree = markerIsFree(marker);
  const area = markerAreaLabel(marker, locale);

  return (
    <button
      type="button"
      ref={rowRef}
      onClick={() => onSelect(marker.id)}
      aria-current={selected ? "true" : undefined}
      className={[
        "flex w-full gap-3 p-3 text-start transition hover:bg-input/60",
        selected ? "bg-primary/10 ring-2 ring-inset ring-primary" : "",
      ].join(" ")}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-input text-muted"
        aria-hidden
      >
        <Zap size={20} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-bold">
            {operatorName(marker, locale)}
          </p>
          {marker.distanceKm != null ? (
            <span className="shrink-0 text-[11px] font-semibold text-muted">
              {t(locale, "evMapDistanceKm", {
                km: formatDistanceKm(marker.distanceKm),
              })}
            </span>
          ) : null}
        </div>
        {area ? (
          <p className="mt-0.5 truncate text-xs text-muted">{area}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span
            className={[
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              statusChipClass(marker.status),
            ].join(" ")}
          >
            {locText(locale, marker.status)}
          </span>
          {marker.maxPowerKw != null ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary-strong">
              {t(locale, "evMapPower", { kw: Math.round(marker.maxPowerKw) })}
            </span>
          ) : null}
          {marker.accessType ? (
            <span className="rounded-full bg-input px-2 py-0.5 text-[10px] font-semibold">
              {locText(locale, marker.accessType)}
            </span>
          ) : null}
          <span className="rounded-full bg-input px-2 py-0.5 text-[10px] font-semibold">
            {isFree ? t(locale, "evMapFree") : t(locale, "evMapPaid")}
          </span>
          {marker.alwaysOpen ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
              {t(locale, "evMapAlwaysOpen")}
            </span>
          ) : markerOpenStatus(marker) === true ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200">
              {t(locale, "evMapOpenNow")}
            </span>
          ) : markerOpenStatus(marker) === false ? (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-900 dark:bg-red-900/30 dark:text-red-200">
              {t(locale, "evMapClosedNow")}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function EvStationListBody({
  locale,
  items,
  selectedId,
  onSelect,
  scrollRef,
  mapReady,
}: {
  locale: Locale;
  items: EvMapMarkerWithDistance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
  mapReady: boolean;
}) {
  const rowRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    rowRefs.current.get(selectedId)?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedId, items.length]);

  if (!mapReady) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        {t(locale, "loading")}
      </p>
    );
  }

  if (!items.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        {t(locale, "evMapEmpty")}
      </p>
    );
  }

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <ul className="divide-y divide-outline">
        {items.map((m) => (
          <li key={m.id}>
            <EvStationListRow
              locale={locale}
              marker={m}
              selected={m.id === selectedId}
              onSelect={onSelect}
              rowRef={(el) => {
                if (el) rowRefs.current.set(m.id, el);
                else rowRefs.current.delete(m.id);
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvStationListPanel({
  locale,
  items,
  selectedId,
  onSelect,
  mapReady,
  loading,
}: {
  locale: Locale;
  items: EvMapMarkerWithDistance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  mapReady: boolean;
  loading: boolean;
}) {
  const countLabel = mapReady
    ? t(locale, "evMapStationsCount", { count: items.length })
    : t(locale, "loading");

  return (
    <>
      <div className="shrink-0 border-b border-outline px-4 py-3">
        <h2 className="text-sm font-bold">{t(locale, "evMapListTitle")}</h2>
        <p className="text-xs font-semibold text-muted">
          {countLabel}
          {mapReady && loading ? " · …" : ""}
        </p>
      </div>
      <EvStationListBody
        locale={locale}
        items={items}
        selectedId={selectedId}
        onSelect={onSelect}
        mapReady={mapReady}
      />
    </>
  );
}

function EvStationListSheet({
  locale,
  items,
  selectedId,
  onSelect,
  expanded,
  onToggleExpanded,
  mapReady,
  loading,
}: {
  locale: Locale;
  items: EvMapMarkerWithDistance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  mapReady: boolean;
  loading: boolean;
}) {
  const countLabel = mapReady
    ? t(locale, "evMapStationsCount", { count: items.length })
    : t(locale, "loading");

  return (
    <div
      className={[
        "absolute inset-x-0 bottom-0 z-[450] flex flex-col rounded-t-[20px] bg-card shadow-[0_-8px_32px_rgba(0,0,0,0.12)] ring-1 ring-outline transition-[max-height] duration-300 md:hidden",
        expanded ? "max-h-[70vh]" : "max-h-[140px]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex shrink-0 flex-col items-center pt-2 pb-1"
        aria-expanded={expanded}
        aria-label={
          expanded
            ? t(locale, "evMapCollapseList")
            : t(locale, "evMapExpandList")
        }
      >
        <span className="mb-1 h-1 w-10 rounded-full bg-outline" />
      </button>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-outline px-4 pb-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold">
            {t(locale, "evMapListTitle")}
          </h2>
          <p className="text-xs font-semibold text-muted">
            {countLabel}
            {mapReady && loading ? " · …" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="shrink-0 rounded-[10px] p-2 hover:bg-input"
          aria-label={
            expanded
              ? t(locale, "evMapCollapseList")
              : t(locale, "evMapExpandList")
          }
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>
      <EvStationListBody
        locale={locale}
        items={items}
        selectedId={selectedId}
        onSelect={onSelect}
        mapReady={mapReady}
      />
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
  const openStatus = useMemo(
    () =>
      detail
        ? stationOpenNowFromHours(
            detail.alwaysOpen,
            (detail.openingHours ?? [])
              .filter((h) => h.dayOfWeekId != null)
              .map((h) => ({
                dayOfWeekId: h.dayOfWeekId as number,
                startTime: h.startTime,
                endTime: h.endTime,
              })),
          )
        : null,
    [detail],
  );

  const actions = useMemo(
    () => (detail ? stationContactActions(detail) : null),
    [detail],
  );

  const hasFooter =
    !!actions &&
    (actions.phone || actions.whatsapp || actions.directions);

  return (
    <aside className="absolute inset-x-0 bottom-0 z-[500] flex max-h-[75vh] flex-col overflow-hidden rounded-t-[20px] bg-card shadow-[0_-8px_40px_rgba(0,0,0,0.18)] ring-1 ring-outline md:inset-y-3 md:end-3 md:inset-x-auto md:w-[min(100%,420px)] md:max-h-none md:rounded-[16px]">
      <div className="flex shrink-0 items-center justify-between border-b border-outline bg-card px-4 py-3">
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
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div className="h-36 animate-pulse rounded-[12px] bg-input" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-input" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-input" />
        </div>
      ) : detail ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 p-4 pb-4">
              <div className="h-40 w-full rounded-[12px] bg-input" aria-hidden />

              {openStatus != null ? (
                <p
                  className={[
                    "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                    openStatus
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/35 dark:text-emerald-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900/35 dark:text-red-200",
                  ].join(" ")}
                >
                  {openStatus
                    ? t(locale, "evMapOpenNow")
                    : t(locale, "evMapClosedNow")}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-input px-2.5 py-1">
                  {locText(locale, detail.status)}
                </span>
                <span className="rounded-full bg-input px-2.5 py-1">
                  {locText(locale, detail.accessType)}
                </span>
                {detail.maxPowerKw != null ? (
                  <span className="rounded-full bg-primary/15 px-2.5 py-1 text-primary-strong">
                    {t(locale, "evMapPower", {
                      kw: Math.round(detail.maxPowerKw),
                    })}
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
                <span className="font-semibold">
                  {t(locale, "evMapOperator")}:{" "}
                </span>
                {operatorName(detail, locale)}
              </p>

              {detail.alwaysOpen ? (
                <p className="text-sm font-semibold text-emerald-600">
                  {t(locale, "evMapAlwaysOpen")}
                </p>
              ) : detail.openingHours?.length ? (
                <div>
                  <h3 className="mb-1 text-sm font-bold">
                    {t(locale, "evMapHours")}
                  </h3>
                  <ul className="space-y-0.5 text-sm text-muted">
                    {detail.openingHours.map((h) => (
                      <li key={`${h.dayOfWeekId}-${h.startTime}`}>
                        {localizedDayName(locale, h.dayOfWeekId, h.dayOfWeek)}
                        {": "}
                        {formatHourTime(h.startTime)} – {formatHourTime(h.endTime)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detail.ports?.length ? (
                <div>
                  <h3 className="mb-2 text-sm font-bold">
                    {t(locale, "evMapPorts")}
                  </h3>
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
                                  ? c.connectorTypeNameAr ||
                                    c.connectorTypeNameEn
                                  : locale === "ku"
                                    ? c.connectorTypeNameKu ||
                                      c.connectorTypeNameEn
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

              <div>
                <h3 className="mb-2 text-sm font-bold">
                  {t(locale, "evMapPhotos")}
                </h3>
                <div className="flex gap-2 overflow-x-auto scrollbar-none">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-24 w-32 shrink-0 rounded-[10px] bg-input"
                      aria-hidden
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold">
                  {t(locale, "evMapReviews")}
                </h3>
                {detail.reviews?.length ? (
                  <ul className="space-y-3">
                    {detail.reviews.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-[12px] bg-input/50 p-3 text-sm"
                      >
                        <p className="font-semibold">
                          {r.publicUserFullName ||
                            r.publicUserName ||
                            "—"}
                          {r.rate != null ? ` · ${r.rate}★` : ""}
                        </p>
                        {r.comment ? (
                          <p className="mt-1 text-muted">{r.comment}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">
                    {t(locale, "evMapNoReviews")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {hasFooter ? (
            <div className="flex shrink-0 gap-2 border-t border-outline bg-card p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              {actions?.phone && phoneHref(actions.phone) ? (
                <a
                  href={phoneHref(actions.phone)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-input px-3 py-2.5 text-sm font-semibold"
                >
                  <Phone size={16} />
                  {t(locale, "evMapCall")}
                </a>
              ) : null}
              {actions?.whatsapp && waHref(actions.whatsapp) ? (
                <a
                  href={waHref(actions.whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-primary-fill px-3 py-2.5 text-sm font-semibold text-on-primary"
                >
                  {t(locale, "whatsapp")}
                </a>
              ) : null}
              {actions?.directions ? (
                <a
                  href={actions.directions}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-input px-3 py-2.5 text-sm font-semibold"
                >
                  <Navigation size={16} />
                  {t(locale, "evMapDirections")}
                </a>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </aside>
  );
}

const EV_DAY_KEYS = [
  "evMapDaySun",
  "evMapDayMon",
  "evMapDayTue",
  "evMapDayWed",
  "evMapDayThu",
  "evMapDayFri",
  "evMapDaySat",
] as const;

const ENGLISH_DAY_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

function localizedDayName(
  locale: Locale,
  dayOfWeekId: number | null,
  fallback: string,
): string {
  if (
    dayOfWeekId != null &&
    dayOfWeekId >= 0 &&
    dayOfWeekId <= 6
  ) {
    return t(locale, EV_DAY_KEYS[dayOfWeekId]);
  }
  const idx = ENGLISH_DAY_INDEX[fallback.trim().toLowerCase()];
  if (idx != null) return t(locale, EV_DAY_KEYS[idx]);
  return fallback;
}

function formatHourTime(time: string): string {
  const parts = time.trim().split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return time.trim();
}

function stationContactActions(detail: EvStationDetail): {
  phone: string | null;
  whatsapp: string | null;
  directions: string | null;
} {
  let phone: string | null = null;
  let whatsapp: string | null = null;
  for (const c of detail.operatorContacts ?? []) {
    if (!phone && !c.disablePhoneNumber && phoneHref(c.contactValue)) {
      phone = c.contactValue;
    }
    if (!whatsapp && !c.disableWhatsapp && waHref(c.contactValue)) {
      whatsapp = c.contactValue;
    }
  }
  return {
    phone,
    whatsapp,
    directions: detail.googleMapsLink?.trim() || null,
  };
}
