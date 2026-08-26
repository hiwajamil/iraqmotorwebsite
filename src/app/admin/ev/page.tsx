"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdminToast } from "@/components/admin-toast";
import { locText, operatorName, type EvLookup } from "@/lib/ev-map";
import { t, type Locale } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

type Tab =
  | "stations"
  | "reviews"
  | "cities"
  | "operators"
  | "types"
  | "amenities";

type StationList = {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AdminEvPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [tab, setTab] = useState<Tab>("stations");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tabs: { id: Tab; labelKey: "adminEvStations" | "adminEvReviews" | "adminEvCities" | "adminEvOperators" | "adminEvConnectorTypes" | "adminEvAmenities" }[] = [
    { id: "stations", labelKey: "adminEvStations" },
    { id: "reviews", labelKey: "adminEvReviews" },
    { id: "cities", labelKey: "adminEvCities" },
    { id: "operators", labelKey: "adminEvOperators" },
    { id: "types", labelKey: "adminEvConnectorTypes" },
    { id: "amenities", labelKey: "adminEvAmenities" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "adminEvTitle")}</h1>
          <p className="mt-1 text-sm text-muted">{t(locale, "adminEvSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer text-sm font-semibold text-primary">
            {t(locale, "adminEvImport")}
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void api
                  .upload<{
                    stationsCount?: number;
                    chargingPortsCount?: number;
                    connectorsCount?: number;
                  }>("/admin/ev/import", file)
                  .then((d) => {
                    setToast(
                      t(locale, "adminEvImported", {
                        stations: d.stationsCount ?? 0,
                        ports: d.chargingPortsCount ?? 0,
                        connectors: d.connectorsCount ?? 0,
                      }),
                    );
                    setError(null);
                  })
                  .catch((err: unknown) =>
                    setError(err instanceof Error ? err.message : t(locale, "loadFailed")),
                  );
              }}
            />
          </label>
          <Link href="/ev-map" className="text-sm font-semibold text-primary">
            {t(locale, "adminEvPublicMap")}
          </Link>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-outline pb-2 scrollbar-none">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-[12px] px-3 py-2 text-sm font-semibold ${
              tab === item.id ? "bg-primary text-on-primary" : "hover:bg-input"
            }`}
          >
            {t(locale, item.labelKey)}
          </button>
        ))}
      </nav>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {tab === "stations" ? (
        <StationsTab
          onToast={setToast}
          onError={setError}
        />
      ) : null}
      {tab === "reviews" ? (
        <ReviewsTab onToast={setToast} onError={setError} />
      ) : null}
      {tab === "cities" ? (
        <CitiesTab onToast={setToast} onError={setError} />
      ) : null}
      {tab === "operators" ? (
        <OperatorsTab onToast={setToast} onError={setError} />
      ) : null}
      {tab === "types" ? (
        <TypesTab onToast={setToast} onError={setError} />
      ) : null}
      {tab === "amenities" ? <AmenitiesTab onError={setError} /> : null}
      {toast ? (
        <AdminToast message={toast} onDismiss={() => setToast(null)} />
      ) : null}
    </div>
  );
}

function StationsTab({
  onToast,
  onError,
}: {
  onToast: (s: string) => void;
  onError: (s: string | null) => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [q, setQ] = useState("");
  const [data, setData] = useState<StationList | null>(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Record<string, unknown> | "new" | null>(
    null,
  );
  const [lookups, setLookups] = useState<Record<string, EvLookup[]>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<StationList>("/admin/ev/stations", {
        q,
        pageSize: "50",
      });
      setData(d);
      onError(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [q, locale, onError]);

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), q ? 250 : 0);
    return () => window.clearTimeout(handle);
  }, [load, q]);

  useEffect(() => {
    void api
      .get<{ items: { group: string; id: number; nameEn: string; nameAr: string; nameKu: string; key: string; text: string }[] }>(
        "/admin/ev/lookups",
      )
      .then((d) => {
        const grouped: Record<string, EvLookup[]> = {};
        for (const item of d.items ?? []) {
          (grouped[item.group] ??= []).push({
            id: item.id,
            key: item.key,
            text: item.text,
            nameEn: item.nameEn,
            nameAr: item.nameAr,
            nameKu: item.nameKu,
          });
        }
        setLookups(grouped);
      })
      .catch(() => undefined);
  }, []);

  async function setStatus(id: string, statusId: number) {
    try {
      await api.patch(`/admin/ev/stations/${id}/status`, { statusId });
      onToast(t(locale, "adminEvSaved"));
      void load();
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/admin/ev/stations/${id}`);
      onToast(t(locale, "adminEvDeleted"));
      setConfirmId(null);
      void load();
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    }
  }

  const items = data?.items ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(locale, "evMapCity")}
          className="w-full max-w-sm rounded-[12px] bg-input px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => setEditor("new")}
          className="rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
        >
          {t(locale, "adminEvNewStation")}
        </button>
      </div>
      {loading ? (
        <div className="h-40 animate-pulse rounded-[16px] bg-input" />
      ) : items.length === 0 ? (
        <p className="rounded-[16px] bg-card p-8 text-center text-muted ring-1 ring-outline">
          {t(locale, "adminEvEmptyStations")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[16px] ring-1 ring-outline">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-input text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">{t(locale, "evMapOperator")}</th>
                <th className="px-3 py-3">{t(locale, "evMapCity")}</th>
                <th className="px-3 py-3">{t(locale, "adminEvStatus")}</th>
                <th className="px-3 py-3">{t(locale, "adminEvPorts")}</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const id = String(row.id || row.stationId || "");
                const status = row.status as EvLookup | undefined;
                return (
                  <tr key={id} className="border-t border-outline">
                    <td className="px-4 py-3 font-semibold">
                      {operatorName(
                        {
                          operatorNameEn: String(
                            (row.operator as { en?: string })?.en ||
                              row.operatorNameEn ||
                              "",
                          ),
                          operatorNameAr: String(
                            (row.operator as { ar?: string })?.ar ||
                              row.operatorNameAr ||
                              "",
                          ),
                          operatorNameKu: String(
                            (row.operator as { ku?: string })?.ku ||
                              row.operatorNameKu ||
                              "",
                          ),
                        } as never,
                        locale,
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {locText(locale, row.city as never)}
                    </td>
                    <td className="px-3 py-3">{locText(locale, status)}</td>
                    <td className="px-3 py-3">
                      {String(row.portCount ?? 0)} / {String(row.connectorCount ?? 0)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(lookups.stationStatusValues ?? []).map((s) => (
                          <button
                            key={String(s.id)}
                            type="button"
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              String(status?.id) === String(s.id)
                                ? "bg-primary text-on-primary"
                                : "bg-input"
                            }`}
                            onClick={() => void setStatus(id, Number(s.id))}
                          >
                            {locText(locale, s)}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-on-primary"
                          onClick={() => setEditor(row)}
                        >
                          {t(locale, "edit")}
                        </button>
                        <button
                          type="button"
                          className="rounded-full bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-700"
                          onClick={() => setConfirmId(id)}
                        >
                          {t(locale, "adminEvDelete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editor ? (
        <StationEditor
          initial={editor === "new" ? null : editor}
          lookups={lookups}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            onToast(t(locale, "adminEvSaved"));
            void load();
          }}
          onError={onError}
        />
      ) : null}
      {confirmId ? (
        <AdminConfirmDialog
          open
          title={t(locale, "adminEvDelete")}
          description={t(locale, "adminEvDeleteConfirm")}
          confirmLabel={t(locale, "adminEvDelete")}
          danger
          onCancel={() => setConfirmId(null)}
          onConfirm={() => void remove(confirmId)}
        />
      ) : null}
    </div>
  );
}

function StationEditor({
  initial,
  lookups,
  onClose,
  onSaved,
  onError,
}: {
  initial: Record<string, unknown> | null;
  lookups: Record<string, EvLookup[]>;
  onClose: () => void;
  onSaved: () => void;
  onError: (s: string | null) => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const id = initial ? String(initial.id || initial.stationId || "") : "";
  const [operatorEn, setOperatorEn] = useState(
    String((initial?.operator as { en?: string })?.en || initial?.operatorNameEn || ""),
  );
  const [operatorAr, setOperatorAr] = useState(
    String((initial?.operator as { ar?: string })?.ar || ""),
  );
  const [operatorKu, setOperatorKu] = useState(
    String((initial?.operator as { ku?: string })?.ku || ""),
  );
  const [cityEn, setCityEn] = useState(
    String((initial?.city as { en?: string })?.en || ""),
  );
  const [cityAr, setCityAr] = useState(
    String((initial?.city as { ar?: string })?.ar || ""),
  );
  const [cityKu, setCityKu] = useState(
    String((initial?.city as { ku?: string })?.ku || ""),
  );
  const [addressEn, setAddressEn] = useState(
    String((initial?.address as { en?: string })?.en || ""),
  );
  const [addressAr, setAddressAr] = useState(
    String((initial?.address as { ar?: string })?.ar || ""),
  );
  const [addressKu, setAddressKu] = useState(
    String((initial?.address as { ku?: string })?.ku || ""),
  );
  const [districtEn, setDistrictEn] = useState(
    String((initial?.district as { en?: string })?.en || ""),
  );
  const [districtAr, setDistrictAr] = useState(
    String((initial?.district as { ar?: string })?.ar || ""),
  );
  const [districtKu, setDistrictKu] = useState(
    String((initial?.district as { ku?: string })?.ku || ""),
  );
  const [neighborhoodEn, setNeighborhoodEn] = useState(
    String((initial?.neighborhood as { en?: string })?.en || ""),
  );
  const [neighborhoodAr, setNeighborhoodAr] = useState(
    String((initial?.neighborhood as { ar?: string })?.ar || ""),
  );
  const [neighborhoodKu, setNeighborhoodKu] = useState(
    String((initial?.neighborhood as { ku?: string })?.ku || ""),
  );
  const [descriptionEn, setDescriptionEn] = useState(
    String((initial?.description as { en?: string })?.en || ""),
  );
  const [lat, setLat] = useState(String(initial?.latitude ?? ""));
  const [lng, setLng] = useState(String(initial?.longitude ?? ""));
  const [statusId, setStatusId] = useState(
    String((initial?.status as EvLookup)?.id ?? 1),
  );
  const [accessTypeId, setAccessTypeId] = useState(
    String((initial?.accessType as EvLookup)?.id ?? 1),
  );
  const [locationTypeId, setLocationTypeId] = useState(
    String((initial?.locationType as EvLookup)?.id ?? ""),
  );
  const [accessRestrictionId, setAccessRestrictionId] = useState(
    String((initial?.accessRestriction as EvLookup)?.id ?? ""),
  );
  const [alwaysOpen, setAlwaysOpen] = useState(Boolean(initial?.alwaysOpen));
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(initial);
  const [connectorTypes, setConnectorTypes] = useState<
    { id: string; nameEn: string; nameAr: string; nameKu: string }[]
  >([]);
  const [amenities, setAmenities] = useState<{ en: string; ar: string; ku: string }[]>([]);
  const [hours, setHours] = useState<
    { dayOfWeekId: number; startTime: string; endTime: string }[]
  >(() =>
    [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      dayOfWeekId: d,
      startTime: "08:00",
      endTime: "22:00",
    })),
  );
  const [contacts, setContacts] = useState<
    { contactTypeId: string; contactValue: string }[]
  >([]);
  const [images, setImages] = useState<{ imageRole: string; url: string }[]>([]);

  const hydrate = useCallback((d: Record<string, unknown>) => {
    setDetail(d);
    setAmenities(
      ((d.amenities as { en?: string; ar?: string; ku?: string }[]) ?? []).map((a) => ({
        en: String(a.en ?? ""),
        ar: String(a.ar ?? ""),
        ku: String(a.ku ?? ""),
      })),
    );
    const existingHours =
      (d.openingHours as { dayOfWeekId?: number; startTime?: string; endTime?: string }[]) ??
      [];
    setHours(
      [0, 1, 2, 3, 4, 5, 6].map((day) => {
        const row = existingHours.find((h) => Number(h.dayOfWeekId) === day);
        return {
          dayOfWeekId: day,
          startTime: String(row?.startTime ?? "08:00"),
          endTime: String(row?.endTime ?? "22:00"),
        };
      }),
    );
    setContacts(
      (
        (d.operatorContacts as {
          contactType?: { id?: number };
          contactValue?: string;
        }[]) ?? []
      ).map((c) => ({
        contactTypeId: String(c.contactType?.id ?? 1),
        contactValue: String(c.contactValue ?? ""),
      })),
    );
    setImages(
      ((d.images as { role?: string; url?: string }[]) ?? []).map((img) => ({
        imageRole: String(img.role || "gallery"),
        url: String(img.url ?? ""),
      })),
    );
  }, []);

  useEffect(() => {
    if (!id) return;
    void api
      .get<Record<string, unknown>>(`/admin/ev/stations/${id}`)
      .then(hydrate)
      .catch(() => undefined);
  }, [hydrate, id]);

  useEffect(() => {
    void api
      .get<{ items: { id: string; nameEn: string; nameAr: string; nameKu: string }[] }>(
        "/admin/ev/connector-types",
      )
      .then((d) => setConnectorTypes(d.items ?? []))
      .catch(() => undefined);
  }, []);

  async function save() {
    setBusy(true);
    try {
      const body = {
        operatorEn,
        operatorAr,
        operatorKu,
        cityEn,
        cityAr,
        cityKu,
        addressEn,
        addressAr,
        addressKu,
        districtEn,
        districtAr,
        districtKu,
        neighborhoodEn,
        neighborhoodAr,
        neighborhoodKu,
        descriptionEn,
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
        statusId: Number(statusId),
        accessTypeId: Number(accessTypeId),
        locationTypeId: locationTypeId ? Number(locationTypeId) : null,
        accessRestrictionId: accessRestrictionId
          ? Number(accessRestrictionId)
          : null,
        alwaysOpen,
      };
      const saved = id
        ? await api.patch<Record<string, unknown>>(`/admin/ev/stations/${id}`, body)
        : await api.post<Record<string, unknown>>("/admin/ev/stations", body);
      const stationId = String(saved.id || saved.stationId || id);
      if (stationId) {
        await Promise.all([
          api.put(`/admin/ev/stations/${stationId}/amenities`, {
            items: amenities
              .filter((a) => a.en.trim())
              .map((a) => ({ amenityEn: a.en, amenityAr: a.ar, amenityKu: a.ku })),
          }),
          api.put(`/admin/ev/stations/${stationId}/hours`, {
            items: alwaysOpen
              ? []
              : hours.filter((h) => h.startTime && h.endTime),
          }),
          api.put(`/admin/ev/stations/${stationId}/contacts`, {
            items: contacts
              .filter((c) => c.contactValue.trim())
              .map((c) => ({
                contactTypeId: Number(c.contactTypeId) || 1,
                contactValue: c.contactValue,
              })),
          }),
          api.put(`/admin/ev/stations/${stationId}/images`, {
            items: images
              .filter((img) => img.url.trim())
              .map((img) => ({ imageRole: img.imageRole, url: img.url })),
          }),
        ]);
      }
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    } finally {
      setBusy(false);
    }
  }

  const ports = (detail?.ports as Record<string, unknown>[] | undefined) ?? [];

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[20px] bg-card p-5 shadow-xl md:rounded-[16px]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {id ? operatorEn : t(locale, "adminEvNewStation")}
          </h2>
          <button type="button" className="text-sm font-semibold" onClick={onClose}>
            {t(locale, "close")}
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`${t(locale, "evMapOperator")} EN`} value={operatorEn} onChange={setOperatorEn} />
          <Field label="AR" value={operatorAr} onChange={setOperatorAr} />
          <Field label="KU" value={operatorKu} onChange={setOperatorKu} />
          <Field label={`${t(locale, "evMapCity")} EN`} value={cityEn} onChange={setCityEn} />
          <Field label="AR" value={cityAr} onChange={setCityAr} />
          <Field label="KU" value={cityKu} onChange={setCityKu} />
          <Field label={`${t(locale, "evMapAddress")} EN`} value={addressEn} onChange={setAddressEn} />
          <Field label="AR" value={addressAr} onChange={setAddressAr} />
          <Field label="KU" value={addressKu} onChange={setAddressKu} />
          <Field label={`${t(locale, "adminEvDistrict")} EN`} value={districtEn} onChange={setDistrictEn} />
          <Field label="AR" value={districtAr} onChange={setDistrictAr} />
          <Field label="KU" value={districtKu} onChange={setDistrictKu} />
          <Field
            label={`${t(locale, "adminEvNeighborhood")} EN`}
            value={neighborhoodEn}
            onChange={setNeighborhoodEn}
          />
          <Field label="AR" value={neighborhoodAr} onChange={setNeighborhoodAr} />
          <Field label="KU" value={neighborhoodKu} onChange={setNeighborhoodKu} />
          <Field
            label={`${t(locale, "adminEvDescription")} EN`}
            value={descriptionEn}
            onChange={setDescriptionEn}
          />
          <Field label="Lat" value={lat} onChange={setLat} />
          <Field label="Lng" value={lng} onChange={setLng} />
          <label className="text-sm">
            <span className="mb-1 block text-muted">{t(locale, "adminEvStatus")}</span>
            <select
              className="w-full rounded-[12px] bg-input px-3 py-2"
              value={statusId}
              onChange={(e) => setStatusId(e.target.value)}
            >
              {(lookups.stationStatusValues ?? []).map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {locText(locale, s)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">{t(locale, "adminEvLocationType")}</span>
            <select
              className="w-full rounded-[12px] bg-input px-3 py-2"
              value={locationTypeId}
              onChange={(e) => setLocationTypeId(e.target.value)}
            >
              <option value="" />
              {(lookups.locationTypeValues ?? []).map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {locText(locale, s)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">{t(locale, "evMapAccess")}</span>
            <select
              className="w-full rounded-[12px] bg-input px-3 py-2"
              value={accessTypeId}
              onChange={(e) => setAccessTypeId(e.target.value)}
            >
              {(lookups.accessTypeValues ?? []).map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {locText(locale, s)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">{t(locale, "adminEvRestriction")}</span>
            <select
              className="w-full rounded-[12px] bg-input px-3 py-2"
              value={accessRestrictionId}
              onChange={(e) => setAccessRestrictionId(e.target.value)}
            >
              <option value="" />
              {(lookups.accessRestrictionValues ?? []).map((s) => (
                <option key={String(s.id)} value={String(s.id)}>
                  {locText(locale, s)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alwaysOpen}
              onChange={(e) => setAlwaysOpen(e.target.checked)}
            />
            {t(locale, "evMapAlwaysOpen")}
          </label>
        </div>
        {id ? (
          <div className="mt-5 space-y-3">
            <h3 className="font-bold">{t(locale, "adminEvPorts")}</h3>
            {ports.map((p) => (
              <PortEditor
                key={String(p.id)}
                stationId={id}
                port={p}
                locale={locale}
                lookups={lookups}
                connectorTypes={connectorTypes}
                onChanged={hydrate}
                onError={onError}
              />
            ))}
            <button
              type="button"
              className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold"
              onClick={() =>
                void api
                  .post(`/admin/ev/stations/${id}/ports`, { portLabel: "Port" })
                  .then((d) => hydrate(d as Record<string, unknown>))
              }
            >
              + {t(locale, "adminEvPorts")}
            </button>
          </div>
        ) : null}
        <div className="mt-5 space-y-2">
          <h3 className="font-bold">{t(locale, "evMapAmenities")}</h3>
          {amenities.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-3">
              <Field
                label="EN"
                value={row.en}
                onChange={(v) =>
                  setAmenities((prev) => prev.map((a, j) => (j === i ? { ...a, en: v } : a)))
                }
              />
              <Field
                label="AR"
                value={row.ar}
                onChange={(v) =>
                  setAmenities((prev) => prev.map((a, j) => (j === i ? { ...a, ar: v } : a)))
                }
              />
              <div className="flex items-end gap-2">
                <Field
                  label="KU"
                  value={row.ku}
                  onChange={(v) =>
                    setAmenities((prev) => prev.map((a, j) => (j === i ? { ...a, ku: v } : a)))
                  }
                />
                <button
                  type="button"
                  className="mb-1 text-xs font-semibold text-red-700"
                  onClick={() => setAmenities((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold"
            onClick={() => setAmenities((prev) => [...prev, { en: "", ar: "", ku: "" }])}
          >
            + {t(locale, "evMapAmenities")}
          </button>
        </div>
        {!alwaysOpen ? (
          <div className="mt-5 space-y-2">
            <h3 className="font-bold">{t(locale, "adminEvHours")}</h3>
            {(hours.length
              ? hours
              : [0, 1, 2, 3, 4, 5, 6].map((d) => ({
                  dayOfWeekId: d,
                  startTime: "08:00",
                  endTime: "22:00",
                }))
            ).map((row) => (
              <div
                key={row.dayOfWeekId}
                className="grid grid-cols-[1fr_1fr_1fr] items-end gap-2 text-sm"
              >
                <span className="pb-2 font-semibold">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][row.dayOfWeekId]}
                </span>
                <Field
                  label="Start"
                  value={row.startTime}
                  onChange={(v) =>
                    setHours((prev) => {
                      const base = prev.length
                        ? prev
                        : [0, 1, 2, 3, 4, 5, 6].map((d) => ({
                            dayOfWeekId: d,
                            startTime: "08:00",
                            endTime: "22:00",
                          }));
                      return base.map((h) =>
                        h.dayOfWeekId === row.dayOfWeekId ? { ...h, startTime: v } : h,
                      );
                    })
                  }
                />
                <Field
                  label="End"
                  value={row.endTime}
                  onChange={(v) =>
                    setHours((prev) => {
                      const base = prev.length
                        ? prev
                        : [0, 1, 2, 3, 4, 5, 6].map((d) => ({
                            dayOfWeekId: d,
                            startTime: "08:00",
                            endTime: "22:00",
                          }));
                      return base.map((h) =>
                        h.dayOfWeekId === row.dayOfWeekId ? { ...h, endTime: v } : h,
                      );
                    })
                  }
                />
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-5 space-y-2">
          <h3 className="font-bold">{t(locale, "evMapContacts")}</h3>
          {contacts.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Type</span>
                <select
                  className="w-full rounded-[12px] bg-input px-3 py-2"
                  value={row.contactTypeId}
                  onChange={(e) =>
                    setContacts((prev) =>
                      prev.map((c, j) =>
                        j === i ? { ...c, contactTypeId: e.target.value } : c,
                      ),
                    )
                  }
                >
                  {(lookups.operatorContactTypeValues ?? []).map((ct) => (
                    <option key={String(ct.id)} value={String(ct.id)}>
                      {locText(locale, ct)}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label={t(locale, "evMapContacts")}
                value={row.contactValue}
                onChange={(v) =>
                  setContacts((prev) =>
                    prev.map((c, j) => (j === i ? { ...c, contactValue: v } : c)),
                  )
                }
              />
              <button
                type="button"
                className="self-end pb-2 text-xs font-semibold text-red-700"
                onClick={() => setContacts((prev) => prev.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold"
            onClick={() =>
              setContacts((prev) => [...prev, { contactTypeId: "1", contactValue: "" }])
            }
          >
            + {t(locale, "evMapContacts")}
          </button>
        </div>
        <div className="mt-5 space-y-2">
          <h3 className="font-bold">{t(locale, "adminEvImages")}</h3>
          {images.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Role</span>
                <select
                  className="w-full rounded-[12px] bg-input px-3 py-2"
                  value={row.imageRole}
                  onChange={(e) =>
                    setImages((prev) =>
                      prev.map((img, j) =>
                        j === i ? { ...img, imageRole: e.target.value } : img,
                      ),
                    )
                  }
                >
                  <option value="cover">{t(locale, "adminEvCover")}</option>
                  <option value="gallery">{t(locale, "adminEvGallery")}</option>
                </select>
              </label>
              <Field
                label="URL"
                value={row.url}
                onChange={(v) =>
                  setImages((prev) =>
                    prev.map((img, j) => (j === i ? { ...img, url: v } : img)),
                  )
                }
              />
              <button
                type="button"
                className="self-end pb-2 text-xs font-semibold text-red-700"
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </div>
          ))}
          <label className="inline-flex cursor-pointer rounded-[12px] bg-input px-3 py-2 text-xs font-semibold">
            {t(locale, "adminEvUpload")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void api
                  .upload<{ url: string }>("/uploads", file)
                  .then((res) => {
                    if (res.url) {
                      setImages((prev) => [
                        ...prev,
                        {
                          imageRole: prev.some((img) => img.imageRole === "cover")
                            ? "gallery"
                            : "cover",
                          url: res.url,
                        },
                      ]);
                    }
                  })
                  .catch((err: unknown) =>
                    onError(err instanceof Error ? err.message : t(locale, "loadFailed")),
                  );
              }}
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-[12px] px-4 py-2 text-sm" onClick={onClose}>
            {t(locale, "close")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-[12px] bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
          >
            {t(locale, "save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PortEditor({
  stationId,
  port,
  locale,
  lookups,
  connectorTypes,
  onChanged,
  onError,
}: {
  stationId: string;
  port: Record<string, unknown>;
  locale: Locale;
  lookups: Record<string, EvLookup[]>;
  connectorTypes: { id: string; nameEn: string; nameAr: string; nameKu: string }[];
  onChanged: (d: Record<string, unknown>) => void;
  onError: (s: string | null) => void;
}) {
  const portId = Number(port.id);
  const portIndex = Number(port.portIndex);
  const [label, setLabel] = useState(String(port.portLabel ?? ""));
  const [statusId, setStatusId] = useState(
    String((port.status as EvLookup | undefined)?.id ?? ""),
  );
  const connectors = (port.connectors as Record<string, unknown>[] | undefined) ?? [];

  useEffect(() => {
    setLabel(String(port.portLabel ?? ""));
    setStatusId(String((port.status as EvLookup | undefined)?.id ?? ""));
  }, [port]);

  async function savePort() {
    try {
      const d = await api.patch<Record<string, unknown>>(
        `/admin/ev/stations/${stationId}/ports/${portId}`,
        { portLabel: label, statusId: statusId ? Number(statusId) : null },
      );
      onChanged(d);
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    }
  }

  return (
    <div className="space-y-2 rounded-[12px] bg-input/50 p-3 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <Field label={t(locale, "adminEvPorts")} value={label} onChange={setLabel} />
        <label className="text-sm">
          <span className="mb-1 block text-muted">{t(locale, "adminEvStatus")}</span>
          <select
            className="rounded-[12px] bg-card px-3 py-2"
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
          >
            <option value="" />
            {(lookups.portStatusValues ?? []).map((s) => (
              <option key={String(s.id)} value={String(s.id)}>
                {locText(locale, s)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="rounded-[12px] bg-card px-3 py-2 text-xs font-semibold"
          onClick={() => void savePort()}
        >
          {t(locale, "save")}
        </button>
        <button
          type="button"
          className="text-xs font-semibold text-red-700"
          onClick={() =>
            void api
              .delete(`/admin/ev/stations/${stationId}/ports/${portId}`)
              .then(() =>
                api
                  .get<Record<string, unknown>>(`/admin/ev/stations/${stationId}`)
                  .then(onChanged),
              )
              .catch((e: unknown) =>
                onError(e instanceof Error ? e.message : t(locale, "loadFailed")),
              )
          }
        >
          {t(locale, "adminEvDelete")}
        </button>
      </div>
      {connectors.map((c) => (
        <PlugEditor
          key={String(c.id)}
          stationId={stationId}
          portIndex={portIndex}
          plug={c}
          locale={locale}
          lookups={lookups}
          connectorTypes={connectorTypes}
          onChanged={onChanged}
          onError={onError}
        />
      ))}
      <button
        type="button"
        className="rounded-[12px] bg-card px-3 py-2 text-xs font-semibold"
        onClick={() =>
          void api
            .post(`/admin/ev/stations/${stationId}/connectors`, {
              portIndex,
              connectorTypeId: connectorTypes[0]?.id,
            })
            .then((d) => onChanged(d as Record<string, unknown>))
            .catch((e: unknown) =>
              onError(e instanceof Error ? e.message : t(locale, "loadFailed")),
            )
        }
      >
        + {t(locale, "adminEvPlug")}
      </button>
    </div>
  );
}

function PlugEditor({
  stationId,
  portIndex,
  plug,
  locale,
  lookups,
  connectorTypes,
  onChanged,
  onError,
}: {
  stationId: string;
  portIndex: number;
  plug: Record<string, unknown>;
  locale: Locale;
  lookups: Record<string, EvLookup[]>;
  connectorTypes: { id: string; nameEn: string; nameAr: string; nameKu: string }[];
  onChanged: (d: Record<string, unknown>) => void;
  onError: (s: string | null) => void;
}) {
  const plugId = Number(plug.id);
  const [typeId, setTypeId] = useState(String(plug.connectorTypeId ?? ""));
  const [powerKw, setPowerKw] = useState(
    plug.powerKw == null ? "" : String(plug.powerKw),
  );
  const [price, setPrice] = useState(plug.price == null ? "" : String(plug.price));
  const [pricingId, setPricingId] = useState(
    String((plug.pricingModel as EvLookup | undefined)?.id ?? ""),
  );
  const [currencyId, setCurrencyId] = useState(
    String((plug.currency as EvLookup | undefined)?.id ?? ""),
  );
  const [statusId, setStatusId] = useState(
    String((plug.status as EvLookup | undefined)?.id ?? ""),
  );

  useEffect(() => {
    setTypeId(String(plug.connectorTypeId ?? ""));
    setPowerKw(plug.powerKw == null ? "" : String(plug.powerKw));
    setPrice(plug.price == null ? "" : String(plug.price));
    setPricingId(String((plug.pricingModel as EvLookup | undefined)?.id ?? ""));
    setCurrencyId(String((plug.currency as EvLookup | undefined)?.id ?? ""));
    setStatusId(String((plug.status as EvLookup | undefined)?.id ?? ""));
  }, [plug]);

  async function savePlug() {
    try {
      const d = await api.patch<Record<string, unknown>>(
        `/admin/ev/stations/${stationId}/connectors/${plugId}`,
        {
          portIndex,
          connectorTypeId: typeId || undefined,
          powerKw: powerKw ? Number(powerKw) : null,
          price: price ? Number(price) : null,
          pricingModelId: pricingId ? Number(pricingId) : null,
          currencyId: currencyId ? Number(currencyId) : null,
          connectorStatusId: statusId ? Number(statusId) : null,
        },
      );
      onChanged(d);
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    }
  }

  return (
    <div className="grid gap-2 rounded-[10px] bg-card p-2 sm:grid-cols-2">
      <label className="text-sm">
        <span className="mb-1 block text-muted">{t(locale, "adminEvPlug")}</span>
        <select
          className="w-full rounded-[12px] bg-input px-3 py-2"
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
        >
          <option value="" />
          {connectorTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {locale === "ar" ? ct.nameAr || ct.nameEn : locale === "ku" ? ct.nameKu || ct.nameEn : ct.nameEn}
            </option>
          ))}
        </select>
      </label>
      <Field label="kW" value={powerKw} onChange={setPowerKw} />
      <label className="text-sm">
        <span className="mb-1 block text-muted">{t(locale, "evMapPricing")}</span>
        <select
          className="w-full rounded-[12px] bg-input px-3 py-2"
          value={pricingId}
          onChange={(e) => setPricingId(e.target.value)}
        >
          <option value="" />
          {(lookups.pricingModelValues ?? []).map((s) => (
            <option key={String(s.id)} value={String(s.id)}>
              {locText(locale, s)}
            </option>
          ))}
        </select>
      </label>
      <Field label={t(locale, "evMapPrice")} value={price} onChange={setPrice} />
      <label className="text-sm">
        <span className="mb-1 block text-muted">IQD / USD</span>
        <select
          className="w-full rounded-[12px] bg-input px-3 py-2"
          value={currencyId}
          onChange={(e) => setCurrencyId(e.target.value)}
        >
          <option value="" />
          {(lookups.currencyValues ?? []).map((s) => (
            <option key={String(s.id)} value={String(s.id)}>
              {locText(locale, s)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-muted">{t(locale, "adminEvStatus")}</span>
        <select
          className="w-full rounded-[12px] bg-input px-3 py-2"
          value={statusId}
          onChange={(e) => setStatusId(e.target.value)}
        >
          <option value="" />
          {(lookups.portConnectorStatusValues ?? []).map((s) => (
            <option key={String(s.id)} value={String(s.id)}>
              {locText(locale, s)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2 sm:col-span-2">
        <button
          type="button"
          className="rounded-[12px] bg-input px-3 py-2 text-xs font-semibold"
          onClick={() => void savePlug()}
        >
          {t(locale, "save")}
        </button>
        <button
          type="button"
          className="text-xs font-semibold text-red-700"
          onClick={() =>
            void api
              .delete(`/admin/ev/stations/${stationId}/connectors/${plugId}`)
              .then((d) => onChanged(d as Record<string, unknown>))
              .catch((e: unknown) =>
                onError(e instanceof Error ? e.message : t(locale, "loadFailed")),
              )
          }
        >
          {t(locale, "adminEvDelete")}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[12px] bg-input px-3 py-2 outline-none"
      />
    </label>
  );
}

function ReviewsTab({
  onToast,
  onError,
}: {
  onToast: (s: string) => void;
  onError: (s: string | null) => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.get<{ items: Record<string, unknown>[] }>(
        "/admin/ev/reviews",
        { status: "all", pageSize: "100" },
      );
      setItems(d.items ?? []);
      onError(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [locale, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(id: string, moderationStatus: "approved" | "rejected") {
    try {
      await api.patch(`/admin/ev/reviews/${id}`, { moderationStatus });
      onToast(t(locale, "adminEvSaved"));
      void load();
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    }
  }

  if (loading) return <div className="h-32 animate-pulse rounded-[16px] bg-input" />;
  if (!items.length) {
    return (
      <p className="rounded-[16px] bg-card p-8 text-center text-muted ring-1 ring-outline">
        {t(locale, "adminEvEmptyReviews")}
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={String(r.id)} className="rounded-[16px] bg-card p-4 ring-1 ring-outline">
          <p className="font-semibold">
            {String(r.publicUserFullName || r.publicUserName || "—")} · {String(r.rate ?? "")}★
          </p>
          <p className="text-sm text-muted">
            {String(r.operatorEn || "")} · {String(r.cityEn || "")} · {String(r.moderationStatus || "")}
          </p>
          <p className="mt-1 text-sm">{String(r.comment || "")}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="rounded-[10px] bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700"
              onClick={() => void moderate(String(r.id), "approved")}
            >
              {t(locale, "adminEvApprove")}
            </button>
            <button
              type="button"
              className="rounded-[10px] bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-700"
              onClick={() => void moderate(String(r.id), "rejected")}
            >
              {t(locale, "adminEvReject")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CitiesTab({
  onToast,
  onError,
}: {
  onToast: (s: string) => void;
  onError: (s: string | null) => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameKu, setNameKu] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ items: Record<string, unknown>[] }>("/admin/ev/cities");
      setItems(d.items ?? []);
      onError(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    }
  }, [locale, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void api
            .post("/admin/ev/cities", { nameEn, nameAr, nameKu })
            .then(() => {
              setNameEn("");
              setNameAr("");
              setNameKu("");
              onToast(t(locale, "adminEvSaved"));
              void load();
            })
            .catch((err: unknown) =>
              onError(err instanceof Error ? err.message : t(locale, "loadFailed")),
            );
        }}
      >
        <input className="rounded-[12px] bg-input px-3 py-2 text-sm" placeholder="EN" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
        <input className="rounded-[12px] bg-input px-3 py-2 text-sm" placeholder="AR" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
        <input className="rounded-[12px] bg-input px-3 py-2 text-sm" placeholder="KU" value={nameKu} onChange={(e) => setNameKu(e.target.value)} />
        <button type="submit" className="rounded-[12px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary">
          {t(locale, "save")}
        </button>
      </form>
      <ul className="divide-y divide-outline rounded-[16px] ring-1 ring-outline">
        {items.map((c) => (
          <li key={String(c.id)} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              {String(c.nameEn)} · {String(c.nameAr)} · {String(c.nameKu)} ({String(c.stationsOnMap ?? 0)})
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-red-700"
              onClick={() =>
                void api.delete(`/admin/ev/cities/${c.id}`).then(() => {
                  onToast(t(locale, "adminEvDeleted"));
                  void load();
                })
              }
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OperatorsTab({
  onToast,
  onError,
}: {
  onToast: (s: string) => void;
  onError: (s: string | null) => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [operatorEn, setOperatorEn] = useState("");
  const [operatorAr, setOperatorAr] = useState("");
  const [operatorKu, setOperatorKu] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ items: Record<string, unknown>[] }>("/admin/ev/operators");
      setItems(d.items ?? []);
      onError(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    }
  }, [locale, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void api
            .post("/admin/ev/operators", { operatorEn, operatorAr, operatorKu })
            .then(() => {
              setOperatorEn("");
              setOperatorAr("");
              setOperatorKu("");
              onToast(t(locale, "adminEvSaved"));
              void load();
            });
        }}
      >
        <input className="rounded-[12px] bg-input px-3 py-2 text-sm" placeholder="EN" value={operatorEn} onChange={(e) => setOperatorEn(e.target.value)} required />
        <input className="rounded-[12px] bg-input px-3 py-2 text-sm" placeholder="AR" value={operatorAr} onChange={(e) => setOperatorAr(e.target.value)} />
        <input className="rounded-[12px] bg-input px-3 py-2 text-sm" placeholder="KU" value={operatorKu} onChange={(e) => setOperatorKu(e.target.value)} />
        <button type="submit" className="rounded-[12px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary">
          {t(locale, "save")}
        </button>
      </form>
      <ul className="divide-y divide-outline rounded-[16px] ring-1 ring-outline">
        {items.map((o) => (
          <li key={String(o.operatorEn)} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              {String(o.operatorEn)} · {String(o.stations ?? 0)} {t(locale, "adminEvStations").toLowerCase()}
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-red-700"
              onClick={() =>
                void api
                  .delete(`/admin/ev/operators/${encodeURIComponent(String(o.operatorEn))}`)
                  .then(() => {
                    onToast(t(locale, "adminEvDeleted"));
                    void load();
                  })
              }
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TypesTab({
  onToast,
  onError,
}: {
  onToast: (s: string) => void;
  onError: (s: string | null) => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [nameEn, setNameEn] = useState("");
  const [chargerTypeId, setChargerTypeId] = useState("1");

  const load = useCallback(async () => {
    try {
      const d = await api.get<{ items: Record<string, unknown>[] }>(
        "/admin/ev/connector-types",
      );
      setItems(d.items ?? []);
      onError(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : t(locale, "loadFailed"));
    }
  }, [locale, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void api
            .post("/admin/ev/connector-types", {
              nameEn,
              chargerTypeId: Number(chargerTypeId),
            })
            .then(() => {
              setNameEn("");
              onToast(t(locale, "adminEvSaved"));
              void load();
            });
        }}
      >
        <input className="rounded-[12px] bg-input px-3 py-2 text-sm" placeholder="Type 2" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
        <select className="rounded-[12px] bg-input px-3 py-2 text-sm" value={chargerTypeId} onChange={(e) => setChargerTypeId(e.target.value)}>
          <option value="1">AC</option>
          <option value="2">DC</option>
        </select>
        <button type="submit" className="rounded-[12px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary">
          {t(locale, "save")}
        </button>
      </form>
      <ul className="divide-y divide-outline rounded-[16px] ring-1 ring-outline">
        {items.map((ct) => (
          <li key={String(ct.id)} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              {String(ct.nameEn)} · {String((ct.chargerType as EvLookup)?.nameEn || "")}
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-red-700"
              onClick={() =>
                void api.delete(`/admin/ev/connector-types/${ct.id}`).then(() => {
                  onToast(t(locale, "adminEvDeleted"));
                  void load();
                })
              }
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AmenitiesTab({ onError }: { onError: (s: string | null) => void }) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    void api
      .get<{ items: Record<string, unknown>[] }>("/admin/ev/amenities")
      .then((d) => setItems(d.items ?? []))
      .catch((e: unknown) =>
        onError(e instanceof Error ? e.message : t(locale, "loadFailed")),
      );
  }, [locale, onError]);
  return (
    <ul className="divide-y divide-outline rounded-[16px] ring-1 ring-outline">
      {items.map((a) => (
        <li key={String(a.amenityEn)} className="px-4 py-3 text-sm">
          {String(a.amenityEn)} · {String(a.amenityAr)} · {String(a.amenityKu)} ({String(a.stations ?? 0)})
        </li>
      ))}
    </ul>
  );
}
