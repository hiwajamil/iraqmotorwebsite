"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useAppSelector } from "@/store/hooks";
import { t, type DictKey, type Locale } from "@/lib/i18n";
import { localizeCity, localizeOption } from "@/lib/listing-labels";
import {
  citiesForProvince,
  IRAQ_PROVINCE_ORDER,
  localizeIraqPlace,
  localizeProvince,
} from "@/lib/iraq-locations";
import {
  COLOR_KEYS,
  CYLINDER_KEYS,
  DRIVETRAIN_KEYS,
  ENGINE_SIZE_KEYS,
  FEATURE_KEYS,
  FUEL_KEYS,
  IMPORT_ORIGIN_KEYS,
  PAINTED_PARTS_KEYS,
  PHOTO_SLOT_COUNT,
  PLATE_CITY_KEYS,
  PLATE_TYPE_KEYS,
  SEAT_COUNT_KEYS,
  SEAT_MATERIAL_KEYS,
  TRANSMISSION_KEYS,
  YEAR_OPTIONS,
  colorSwatch,
  isDamagePaintedParts,
} from "@/lib/listing-form-options";
import {
  emptyListingDraft,
  listingDraftToPayload,
  validateListingDraft,
  type ListingDraft,
  type ListingField,
} from "@/lib/listing-form";

type Brand = { id: string; name?: string };
type Model = { id: string; key?: string; name?: string };

const selectClass =
  "mt-1 w-full rounded-[12px] bg-input px-3 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-primary disabled:opacity-50";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}

function SectionCard({
  title,
  field,
  children,
}: {
  title: string;
  field?: ListingField;
  children: React.ReactNode;
}) {
  return (
    <section
      data-field={field}
      className="rounded-[16px] bg-card p-5 ring-1 ring-outline md:p-6"
    >
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ChipRow({
  options,
  value,
  onChange,
  locale,
  error,
  field,
  labelFor,
}: {
  options: readonly string[];
  value: string;
  onChange: (key: string) => void;
  locale: Locale;
  error?: string;
  field?: ListingField;
  labelFor?: (key: string) => string;
}) {
  return (
    <div data-field={field}>
      <div className="flex flex-wrap gap-2">
        {options.map((key) => {
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                selected
                  ? "bg-primary text-on-primary"
                  : "bg-input text-foreground ring-1 ring-outline hover:ring-primary/40"
              }`}
            >
              {labelFor ? labelFor(key) : localizeOption(locale, key)}
            </button>
          );
        })}
      </div>
      <FieldError message={error} />
    </div>
  );
}

export function SellListingForm() {
  const { user } = useAuth();
  const router = useRouter();
  const locale = useAppSelector((s) => s.preferences.locale);
  const [draft, setDraft] = useState<ListingDraft>(emptyListingDraft);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ListingField, DictKey>>>(
    {},
  );
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const damageInputRef = useRef<HTMLInputElement>(null);
  const photoTargetSlot = useRef<number | null>(null);

  const label = (key: DictKey) => t(locale, key);
  const err = (field: ListingField) =>
    fieldErrors[field] ? t(locale, fieldErrors[field]!) : undefined;

  useEffect(() => {
    void api
      .get<{ items: Brand[] }>("/catalog/brands")
      .then((d) => setBrands(d.items ?? []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (!draft.brandId) {
      setModels([]);
      return;
    }
    let cancelled = false;
    void api
      .get<{ items: Model[] }>(`/catalog/brands/${draft.brandId}/models`)
      .then((d) => {
        if (!cancelled) setModels(d.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.brandId]);

  const cityOptions = useMemo(
    () => (draft.province ? citiesForProvince(draft.province) : []),
    [draft.province],
  );

  const allFeaturesSelected =
    FEATURE_KEYS.length > 0 &&
    FEATURE_KEYS.every((key) => draft.extraFeatures.includes(key));

  function patch(partial: Partial<ListingDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  async function uploadFiles(files: FileList | null, kind: "photos" | "damage") {
    if (!files?.length) return;
    if (!user) {
      router.push("/auth?next=/sell");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      if (kind === "damage") {
        const file = files[0];
        if (!file) return;
        const res = await api.upload<{ url: string }>("/uploads", file);
        if (res.url) patch({ damagePhotoUrl: res.url });
        return;
      }
      const remaining = PHOTO_SLOT_COUNT - draft.imageUrls.length;
      const urls = [...draft.imageUrls];
      const slot = photoTargetSlot.current;
      photoTargetSlot.current = null;
      for (const file of Array.from(files).slice(0, Math.max(remaining, 1))) {
        const res = await api.upload<{ url: string }>("/uploads", file);
        if (!res.url) continue;
        if (slot != null && slot < urls.length) {
          urls[slot] = res.url;
        } else if (urls.length < PHOTO_SLOT_COUNT) {
          urls.push(res.url);
        }
      }
      patch({ imageUrls: urls });
    } catch (e) {
      setError(e instanceof Error ? e.message : label("sellUploading"));
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
      if (damageInputRef.current) damageInputRef.current.value = "";
    }
  }

  async function submit() {
    const validation = validateListingDraft(draft);
    if (validation.length) {
      const next: Partial<Record<ListingField, DictKey>> = {};
      for (const item of validation) next[item.field] = item.messageKey;
      setFieldErrors(next);
      setError(label("sellFixErrors"));
      const first = validation[0]?.field;
      if (first) {
        document
          .querySelector(`[data-field="${first}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setFieldErrors({});
    setBusy(true);
    setError(null);
    try {
      if (!user) {
        router.push("/auth?next=/sell");
        return;
      }
      const payload = listingDraftToPayload(draft);
      let id = draftId;
      if (id) {
        await api.put(`/cars/drafts/${id}`, payload);
      } else {
        const created = await api.post<{ id: string }>("/cars/drafts", payload);
        id = created.id;
        setDraftId(id);
      }
      await api.patch(`/cars/${id}`, payload);
      await api.post(`/cars/${id}/publish`);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : label("sellSubmit"));
    } finally {
      setBusy(false);
    }
  }

  const photoSlots = Array.from({ length: PHOTO_SLOT_COUNT }, (_, i) => draft.imageUrls[i] ?? null);

  return (
    <form
      className="mx-auto max-w-3xl space-y-5 px-[4%] pb-28 pt-24"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{label("sellTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{label("sellSubtitle")}</p>
      </div>

      <SectionCard title={label("sellSectionLocation")} field="province">
        <label className="block text-sm font-medium">
          {label("sellProvince")}
          <select
            value={draft.province}
            onChange={(e) => patch({ province: e.target.value, city: "" })}
            className={selectClass}
          >
            <option value="">{label("sellSelectProvince")}</option>
            {IRAQ_PROVINCE_ORDER.map((province) => (
              <option key={province} value={province}>
                {localizeProvince(locale, province)}
              </option>
            ))}
          </select>
          <FieldError message={err("province")} />
        </label>
        <label className="block text-sm font-medium" data-field="city">
          {label("sellCity")}
          <select
            value={draft.city}
            onChange={(e) => patch({ city: e.target.value })}
            className={selectClass}
            disabled={!draft.province}
          >
            <option value="">{label("sellSelectCity")}</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {localizeIraqPlace(locale, city)}
              </option>
            ))}
          </select>
          <FieldError message={err("city")} />
        </label>
      </SectionCard>

      <SectionCard title={label("sellSectionPhotos")} field="imageUrls">
        <p className="text-sm text-muted">{label("sellPhotosHint")}</p>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void uploadFiles(e.target.files, "photos")}
        />
        <div className="flex gap-3 overflow-x-auto pb-1">
          {photoSlots.map((url, index) => (
            <div
              key={url ?? `empty-${index}`}
              className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[12px] bg-input ring-1 ring-outline"
            >
              {url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        imageUrls: draft.imageUrls.filter((_, i) => i !== index),
                      })
                    }
                    className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 text-sm font-bold"
                    aria-label={label("sellRemovePhoto")}
                  >
                    ×
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => {
                    photoTargetSlot.current = index;
                    photoInputRef.current?.click();
                  }}
                  className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted"
                >
                  <span className="text-lg leading-none">+</span>
                  {label("sellAddPhoto")}
                </button>
              )}
            </div>
          ))}
        </div>
        {uploading ? (
          <p className="text-xs text-muted">{label("sellUploading")}</p>
        ) : null}
        <FieldError message={err("imageUrls")} />
      </SectionCard>

      <SectionCard title={label("sellSectionBasic")} field="brandId">
        <label className="block text-sm font-medium">
          {label("sellBrand")}
          <select
            value={draft.brandId}
            onChange={(e) => patch({ brandId: e.target.value, modelKey: "" })}
            className={selectClass}
          >
            <option value="">{label("sellSelectBrand")}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name || brand.id}
              </option>
            ))}
          </select>
          <FieldError message={err("brandId")} />
        </label>
        <label className="block text-sm font-medium" data-field="modelKey">
          {label("sellModel")}
          <select
            value={draft.modelKey}
            onChange={(e) => patch({ modelKey: e.target.value })}
            className={selectClass}
            disabled={!draft.brandId}
          >
            <option value="">{label("sellSelectModel")}</option>
            {models.map((model) => {
              const key = model.key || model.id;
              return (
                <option key={key} value={key}>
                  {model.name || key}
                </option>
              );
            })}
          </select>
          <FieldError message={err("modelKey")} />
        </label>
        <label className="block text-sm font-medium" data-field="colorKey">
          {label("sellColor")}
          <select
            value={draft.colorKey}
            onChange={(e) => patch({ colorKey: e.target.value })}
            className={selectClass}
          >
            <option value="">{label("sellSelectColor")}</option>
            {COLOR_KEYS.map((key) => (
              <option key={key} value={key}>
                {localizeOption(locale, key)}
              </option>
            ))}
          </select>
          {draft.colorKey ? (
            <span
              className="mt-2 inline-block h-4 w-4 rounded-full ring-1 ring-outline"
              style={{ background: colorSwatch(draft.colorKey) }}
              aria-hidden
            />
          ) : null}
          <FieldError message={err("colorKey")} />
        </label>
        <label className="block text-sm font-medium" data-field="year">
          {label("sellYear")}
          <select
            value={draft.year}
            onChange={(e) => patch({ year: e.target.value })}
            className={selectClass}
          >
            <option value="">{label("sellSelectYear")}</option>
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <FieldError message={err("year")} />
        </label>
      </SectionCard>

      <SectionCard title={label("sellSectionPlate")}>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellPlateType")}</p>
          <ChipRow
            field="plateTypeKey"
            options={PLATE_TYPE_KEYS}
            value={draft.plateTypeKey}
            onChange={(plateTypeKey) => patch({ plateTypeKey })}
            locale={locale}
            error={err("plateTypeKey")}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellPlateCity")}</p>
          <ChipRow
            field="plateCityKey"
            options={PLATE_CITY_KEYS}
            value={draft.plateCityKey}
            onChange={(plateCityKey) => patch({ plateCityKey })}
            locale={locale}
            error={err("plateCityKey")}
            labelFor={(key) => localizeCity(locale, key)}
          />
        </div>
      </SectionCard>

      <SectionCard title={label("sellSectionUsage")} field="mileageValue">
        <label className="block text-sm font-medium">
          {label("sellMileage")}
          <div className="mt-1 flex overflow-hidden rounded-[12px] bg-input ring-1 ring-outline focus-within:ring-primary">
            <input
              value={draft.mileageValue}
              onChange={(e) =>
                patch({ mileageValue: e.target.value.replace(/[^\d]/g, "") })
              }
              inputMode="numeric"
              dir="ltr"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
            />
            <div className="flex p-1">
              {(["km", "mi"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => patch({ mileageUnit: unit })}
                  className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold ${
                    draft.mileageUnit === unit
                      ? "bg-primary text-on-primary"
                      : "text-muted"
                  }`}
                >
                  {t(locale, unit)}
                </button>
              ))}
            </div>
          </div>
          <FieldError message={err("mileageValue")} />
        </label>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellFuel")}</p>
          <ChipRow
            field="fuelKey"
            options={FUEL_KEYS}
            value={draft.fuelKey}
            onChange={(fuelKey) => patch({ fuelKey })}
            locale={locale}
            error={err("fuelKey")}
          />
        </div>
      </SectionCard>

      <SectionCard title={label("sellSectionTechnical")}>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellImportOrigin")}</p>
          <ChipRow
            field="importCountryKey"
            options={IMPORT_ORIGIN_KEYS}
            value={draft.importCountryKey}
            onChange={(importCountryKey) => patch({ importCountryKey })}
            locale={locale}
            error={err("importCountryKey")}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellTransmission")}</p>
          <ChipRow
            field="transmissionKey"
            options={TRANSMISSION_KEYS}
            value={draft.transmissionKey}
            onChange={(transmissionKey) => patch({ transmissionKey })}
            locale={locale}
            error={err("transmissionKey")}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellDrivetrain")}</p>
          <ChipRow
            field="drivetrainKey"
            options={DRIVETRAIN_KEYS}
            value={draft.drivetrainKey}
            onChange={(drivetrainKey) => patch({ drivetrainKey })}
            locale={locale}
            error={err("drivetrainKey")}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellCylinders")}</p>
          <ChipRow
            field="cylindersKey"
            options={CYLINDER_KEYS}
            value={draft.cylindersKey}
            onChange={(cylindersKey) => patch({ cylindersKey })}
            locale={locale}
            error={err("cylindersKey")}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellEngineSize")}</p>
          <ChipRow
            field="engineSizeKey"
            options={ENGINE_SIZE_KEYS}
            value={draft.engineSizeKey}
            onChange={(engineSizeKey) => patch({ engineSizeKey })}
            locale={locale}
            error={err("engineSizeKey")}
          />
        </div>
      </SectionCard>

      <SectionCard title={label("sellSectionInterior")}>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellSeatMaterial")}</p>
          <ChipRow
            field="seatMaterialKey"
            options={SEAT_MATERIAL_KEYS}
            value={draft.seatMaterialKey}
            onChange={(seatMaterialKey) => patch({ seatMaterialKey })}
            locale={locale}
            error={err("seatMaterialKey")}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellSeatCount")}</p>
          <ChipRow
            field="seatCountKey"
            options={SEAT_COUNT_KEYS}
            value={draft.seatCountKey}
            onChange={(seatCountKey) => patch({ seatCountKey })}
            locale={locale}
            error={err("seatCountKey")}
          />
        </div>
      </SectionCard>

      <SectionCard title={label("sellSectionCondition")}>
        <div>
          <p className="mb-2 text-sm font-medium">{label("sellPaintedParts")}</p>
          <ChipRow
            field="paintedPartsKey"
            options={PAINTED_PARTS_KEYS}
            value={draft.paintedPartsKey}
            onChange={(paintedPartsKey) => patch({ paintedPartsKey })}
            locale={locale}
            error={err("paintedPartsKey")}
          />
        </div>
        {isDamagePaintedParts(draft.paintedPartsKey) ? (
          <div data-field="damagePhotoUrl">
            <p className="text-sm font-medium">{label("sellDamagePhoto")}</p>
            <p className="mt-0.5 text-xs text-muted">{label("sellDamagePhotoHint")}</p>
            <input
              ref={damageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void uploadFiles(e.target.files, "damage")}
            />
            {draft.damagePhotoUrl ? (
              <div className="relative mt-2 h-32 w-44 overflow-hidden rounded-[12px] ring-1 ring-outline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.damagePhotoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => patch({ damagePhotoUrl: "" })}
                  className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 text-sm font-bold"
                  aria-label={label("sellRemovePhoto")}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploading}
                onClick={() => damageInputRef.current?.click()}
                className="mt-2 flex h-32 w-full items-center justify-center rounded-[12px] border border-dashed border-outline bg-input text-sm font-medium text-muted"
              >
                {label("sellAddPhoto")}
              </button>
            )}
            <FieldError message={err("damagePhotoUrl")} />
          </div>
        ) : null}
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">{label("sellExtraFeatures")}</p>
            <label className="flex items-center gap-2 text-xs font-medium text-muted">
              {label("sellSelectAll")}
              <button
                type="button"
                role="switch"
                aria-checked={allFeaturesSelected}
                onClick={() =>
                  patch({
                    extraFeatures: allFeaturesSelected ? [] : [...FEATURE_KEYS],
                  })
                }
                className={`relative h-6 w-10 rounded-full transition ${
                  allFeaturesSelected ? "bg-primary" : "bg-input ring-1 ring-outline"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    allFeaturesSelected ? "end-0.5" : "start-0.5"
                  }`}
                />
              </button>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FEATURE_KEYS.map((key) => {
              const selected = draft.extraFeatures.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    patch({
                      extraFeatures: selected
                        ? draft.extraFeatures.filter((item) => item !== key)
                        : [...draft.extraFeatures, key],
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-start text-sm font-medium transition ${
                    selected
                      ? "bg-primary text-on-primary"
                      : "bg-input text-foreground ring-1 ring-outline hover:ring-primary/40"
                  }`}
                >
                  {localizeOption(locale, key)}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={label("sellSectionPrice")} field="priceValue">
        <label className="block text-sm font-medium">
          {label("sellDescription")}
          <textarea
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={4}
            className="mt-1 w-full rounded-[12px] bg-input px-3 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
          />
        </label>
        <label className="block text-sm font-medium">
          {label("sellPrice")}
          <div className="mt-1 flex overflow-hidden rounded-[12px] bg-input ring-1 ring-outline focus-within:ring-primary">
            <input
              value={draft.priceValue}
              onChange={(e) =>
                patch({ priceValue: e.target.value.replace(/[^\d]/g, "") })
              }
              inputMode="numeric"
              dir="ltr"
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none"
            />
            <div className="flex p-1">
              {(
                [
                  ["currency_iqd", "IQD"],
                  ["currency_usd", "USD"],
                ] as const
              ).map(([key, text]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => patch({ currencyKey: key })}
                  className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold ${
                    draft.currencyKey === key
                      ? "bg-primary text-on-primary"
                      : "text-muted"
                  }`}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
          <FieldError message={err("priceValue")} />
        </label>
      </SectionCard>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || uploading}
        className="w-full rounded-[12px] bg-primary px-5 py-3.5 text-sm font-semibold text-on-primary disabled:opacity-60"
      >
        {busy ? label("sellSubmitting") : label("sellSubmit")}
      </button>
    </form>
  );
}
