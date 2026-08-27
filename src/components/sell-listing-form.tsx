"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  listingDraftFromCar,
  listingDraftToPayload,
  validateListingDraft,
  type ListingDraft,
  type ListingField,
} from "@/lib/listing-form";
import {
  NGENIUS_PENDING_PUBLISH_KEY,
  PAYMENT_DEBIT_CARD,
  type CatalogPackagePrices,
} from "@/lib/listing-packages";
import { SellPackagePaymentSection } from "@/components/sell-package-payment-section";
import {
  Armchair,
  Banknote,
  Camera,
  Car,
  Cog,
  Fuel,
  IdCard,
  MapPin,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

type Brand = { id: string; name?: string };
type Model = { id: string; key?: string; name?: string; trims?: string[] };
type Trim = { id: string; name?: string };

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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex w-fit items-center gap-2">
      <span className="size-1 shrink-0 rounded-full bg-primary" aria-hidden />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {children}
      </span>
    </span>
  );
}

function SectionCard({
  title,
  icon: Icon,
  field,
  children,
}: {
  title: string;
  icon: LucideIcon;
  field?: ListingField;
  children: React.ReactNode;
}) {
  return (
    <section
      data-field={field}
      className="overflow-hidden rounded-[var(--radius-card)] bg-card ring-1 ring-outline"
    >
      <div className="relative border-b border-primary/20 bg-primary/[0.07] px-5 py-3.5 md:px-6">
        <span
          className="absolute inset-y-2 start-0 w-[3px] rounded-e-full bg-primary"
          aria-hidden
        />
        <div className="flex items-center gap-3 ps-2.5">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            aria-hidden
          >
            <Icon className="size-4" strokeWidth={2} aria-hidden />
          </span>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="mt-5 space-y-4 px-5 pb-5 md:px-6 md:pb-6">{children}</div>
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
  label,
  labelFor,
}: {
  options: readonly string[];
  value: string;
  onChange: (key: string) => void;
  locale: Locale;
  error?: string;
  field?: ListingField;
  label?: string;
  labelFor?: (key: string) => string;
}) {
  return (
    <div data-field={field}>
      {label ? (
        <div className="mb-2">
          <FieldLabel>{label}</FieldLabel>
        </div>
      ) : null}
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
  const searchParams = useSearchParams();
  const editId = (searchParams.get("id") || "").trim();
  const locale = useAppSelector((s) => s.preferences.locale);
  const [draft, setDraft] = useState<ListingDraft>(emptyListingDraft);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [listingStatus, setListingStatus] = useState<string>("draft");
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ListingField, DictKey>>>(
    {},
  );
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [trims, setTrims] = useState<Trim[]>([]);
  const [packagePrices, setPackagePrices] = useState<CatalogPackagePrices | null>(
    null,
  );
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
    let cancelled = false;
    void api
      .get<{ config?: { packagePrices?: CatalogPackagePrices } | null }>(
        "/catalog/config",
      )
      .then((data) => {
        if (!cancelled) setPackagePrices(data.config?.packagePrices ?? null);
      })
      .catch(() => {
        if (!cancelled) setPackagePrices(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editId || !user) {
      setLoadingEdit(false);
      return;
    }
    let cancelled = false;
    setLoadingEdit(true);
    void (async () => {
      try {
        const car = await api.get<Record<string, unknown>>(
          `/cars/${encodeURIComponent(editId)}`,
        );
        if (cancelled) return;
        const sellerId = String(car.sellerId ?? "");
        if (sellerId && sellerId !== user.uid) {
          setError(label("sellLoadForbidden"));
          setLoadingEdit(false);
          return;
        }
        setDraft(listingDraftFromCar(car));
        setDraftId(String(car.id ?? editId));
        setListingStatus(String(car.status ?? "draft").toLowerCase());
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : label("sellLoadFailed"));
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, user]);

  useEffect(() => {
    if (!draft.brandId) {
      setModels([]);
      return;
    }
    let cancelled = false;
    void api
      .get<{ items: Model[] }>(`/catalog/brands/${encodeURIComponent(draft.brandId)}/models`)
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

  useEffect(() => {
    if (!draft.brandId || !draft.modelKey) {
      setTrims([]);
      return;
    }
    let cancelled = false;
    const brandId = encodeURIComponent(draft.brandId);
    const modelKey = encodeURIComponent(draft.modelKey);
    void api
      .get<{ items: Trim[] }>(`/catalog/brands/${brandId}/models/${modelKey}/trims`)
      .then((d) => {
        if (cancelled) return;
        const items = d.items ?? [];
        if (items.length) {
          setTrims(items);
          return;
        }
        const nested = models.find((m) => (m.key || m.id) === draft.modelKey)?.trims ?? [];
        setTrims(nested.map((name) => ({ id: name, name })));
      })
      .catch(() => {
        if (cancelled) return;
        const nested = models.find((m) => (m.key || m.id) === draft.modelKey)?.trims ?? [];
        setTrims(nested.map((name) => ({ id: name, name })));
      });
    return () => {
      cancelled = true;
    };
  }, [draft.brandId, draft.modelKey, models]);

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

  async function saveDraftPayload(): Promise<string> {
    const payload = listingDraftToPayload(draft);
    let id = draftId;
    if (id) {
      if (listingStatus === "draft") {
        await api.put(`/cars/drafts/${id}`, payload);
      }
      await api.patch(`/cars/${id}`, payload);
    } else {
      const created = await api.post<{ id: string }>("/cars/drafts", payload);
      id = created.id;
      setDraftId(id);
      setListingStatus("draft");
      await api.patch(`/cars/${id}`, payload);
    }
    return id;
  }

  async function publishListing(carId: string) {
    if (listingStatus === "draft" || listingStatus === "rejected") {
      await api.post(`/cars/${carId}/publish`);
      setListingStatus("pending");
    }
  }

  async function checkoutAndPublish(carId: string) {
    if (draft.paymentMethodKey === PAYMENT_DEBIT_CARD) {
      const order = await api.post<{
        id: string;
        paymentUrl?: string;
        alreadyPaid?: boolean;
        status?: string;
      }>("/payments/ngenius/orders", {
        carId,
        packageKey: draft.packageKey,
        language: locale,
      });
      if (order.alreadyPaid || order.status === "paid") {
        await publishListing(carId);
        router.push("/dashboard/listings");
        return;
      }
      if (!order.paymentUrl) {
        throw new Error(label("paymentLoadFailed"));
      }
      try {
        sessionStorage.setItem(NGENIUS_PENDING_PUBLISH_KEY, carId);
      } catch {
        // ignore storage failures
      }
      window.location.href = order.paymentUrl;
      return;
    }
    await publishListing(carId);
    router.push("/dashboard/listings");
  }

  async function submit() {
    const showPackagePayment =
      listingStatus !== "active" && listingStatus !== "pending";
    const validation = validateListingDraft(draft, {
      requirePackagePayment: showPackagePayment,
    });
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
      const id = await saveDraftPayload();
      if (showPackagePayment) {
        await checkoutAndPublish(id);
        return;
      }
      router.push("/dashboard/listings");
    } catch (e) {
      setError(e instanceof Error ? e.message : label("sellSubmit"));
    } finally {
      setBusy(false);
    }
  }

  async function publishOnly() {
    if (!draftId || listingStatus !== "draft") return;
    const validation = validateListingDraft(draft, {
      requirePackagePayment: true,
    });
    if (validation.length) {
      const next: Partial<Record<ListingField, DictKey>> = {};
      for (const item of validation) next[item.field] = item.messageKey;
      setFieldErrors(next);
      setError(label("sellFixErrors"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveDraftPayload();
      await checkoutAndPublish(draftId);
    } catch (e) {
      setError(e instanceof Error ? e.message : label("sellSubmit"));
    } finally {
      setBusy(false);
    }
  }

  const photoSlots = Array.from({ length: PHOTO_SLOT_COUNT }, (_, i) => draft.imageUrls[i] ?? null);
  const isEditingActive = listingStatus === "active";
  const isEditingPending = listingStatus === "pending";
  const showPackagePayment =
    listingStatus !== "active" && listingStatus !== "pending";
  const canPublishDraft = listingStatus === "draft" && Boolean(draftId);

  if (loadingEdit) {
    return (
      <p className="mx-auto max-w-3xl px-[4%] pt-28 text-center text-muted">
        {label("loading")}
      </p>
    );
  }

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
        <p className="mt-1 text-sm text-muted">
          {isEditingPending ? label("sellPendingHint") : label("sellSubtitle")}
        </p>
      </div>

      <SectionCard title={label("sellSectionLocation")} icon={MapPin} field="province">
        <label className="block">
          <FieldLabel>{label("sellProvince")}</FieldLabel>
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
        <label className="block" data-field="city">
          <FieldLabel>{label("sellCity")}</FieldLabel>
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

      <SectionCard title={label("sellSectionPhotos")} icon={Camera} field="imageUrls">
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

      <SectionCard title={label("sellSectionBasic")} icon={Car} field="brandId">
        <label className="block">
          <FieldLabel>{label("sellBrand")}</FieldLabel>
          <select
            value={draft.brandId}
            onChange={(e) =>
              patch({ brandId: e.target.value, modelKey: "", trim: "" })
            }
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
        <label className="block" data-field="modelKey">
          <FieldLabel>{label("sellModel")}</FieldLabel>
          <select
            value={draft.modelKey}
            onChange={(e) => patch({ modelKey: e.target.value, trim: "" })}
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
        <label className="block" data-field="trim">
          <FieldLabel>{label("sellTrim")}</FieldLabel>
          <select
            value={draft.trim}
            onChange={(e) => patch({ trim: e.target.value })}
            className={selectClass}
            disabled={!draft.modelKey}
          >
            <option value="">{label("sellSelectTrim")}</option>
            {trims.map((trim) => {
              const key = trim.name || trim.id;
              return (
                <option key={trim.id || key} value={key}>
                  {key}
                </option>
              );
            })}
          </select>
          <FieldError message={err("trim")} />
        </label>
        <label className="block" data-field="colorKey">
          <FieldLabel>{label("sellColor")}</FieldLabel>
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
        <label className="block" data-field="year">
          <FieldLabel>{label("sellYear")}</FieldLabel>
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

      <SectionCard title={label("sellSectionPlate")} icon={IdCard}>
        <ChipRow
          label={label("sellPlateType")}
          field="plateTypeKey"
          options={PLATE_TYPE_KEYS}
          value={draft.plateTypeKey}
          onChange={(plateTypeKey) => patch({ plateTypeKey })}
          locale={locale}
          error={err("plateTypeKey")}
        />
        <ChipRow
          label={label("sellPlateCity")}
          field="plateCityKey"
          options={PLATE_CITY_KEYS}
          value={draft.plateCityKey}
          onChange={(plateCityKey) => patch({ plateCityKey })}
          locale={locale}
          error={err("plateCityKey")}
          labelFor={(key) => localizeCity(locale, key)}
        />
      </SectionCard>

      <SectionCard title={label("sellSectionUsage")} icon={Fuel} field="mileageValue">
        <label className="block">
          <FieldLabel>{label("sellMileage")}</FieldLabel>
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
        <ChipRow
          label={label("sellFuel")}
          field="fuelKey"
          options={FUEL_KEYS}
          value={draft.fuelKey}
          onChange={(fuelKey) => patch({ fuelKey })}
          locale={locale}
          error={err("fuelKey")}
        />
      </SectionCard>

      <SectionCard title={label("sellSectionTechnical")} icon={Cog}>
        <ChipRow
          label={label("sellImportOrigin")}
          field="importCountryKey"
          options={IMPORT_ORIGIN_KEYS}
          value={draft.importCountryKey}
          onChange={(importCountryKey) => patch({ importCountryKey })}
          locale={locale}
          error={err("importCountryKey")}
        />
        <ChipRow
          label={label("sellTransmission")}
          field="transmissionKey"
          options={TRANSMISSION_KEYS}
          value={draft.transmissionKey}
          onChange={(transmissionKey) => patch({ transmissionKey })}
          locale={locale}
          error={err("transmissionKey")}
        />
        <ChipRow
          label={label("sellDrivetrain")}
          field="drivetrainKey"
          options={DRIVETRAIN_KEYS}
          value={draft.drivetrainKey}
          onChange={(drivetrainKey) => patch({ drivetrainKey })}
          locale={locale}
          error={err("drivetrainKey")}
        />
        <ChipRow
          label={label("sellCylinders")}
          field="cylindersKey"
          options={CYLINDER_KEYS}
          value={draft.cylindersKey}
          onChange={(cylindersKey) => patch({ cylindersKey })}
          locale={locale}
          error={err("cylindersKey")}
        />
        <ChipRow
          label={label("sellEngineSize")}
          field="engineSizeKey"
          options={ENGINE_SIZE_KEYS}
          value={draft.engineSizeKey}
          onChange={(engineSizeKey) => patch({ engineSizeKey })}
          locale={locale}
          error={err("engineSizeKey")}
        />
      </SectionCard>

      <SectionCard title={label("sellSectionInterior")} icon={Armchair}>
        <ChipRow
          label={label("sellSeatMaterial")}
          field="seatMaterialKey"
          options={SEAT_MATERIAL_KEYS}
          value={draft.seatMaterialKey}
          onChange={(seatMaterialKey) => patch({ seatMaterialKey })}
          locale={locale}
          error={err("seatMaterialKey")}
        />
        <ChipRow
          label={label("sellSeatCount")}
          field="seatCountKey"
          options={SEAT_COUNT_KEYS}
          value={draft.seatCountKey}
          onChange={(seatCountKey) => patch({ seatCountKey })}
          locale={locale}
          error={err("seatCountKey")}
        />
      </SectionCard>

      <SectionCard title={label("sellSectionCondition")} icon={ShieldCheck}>
        <ChipRow
          label={label("sellPaintedParts")}
          field="paintedPartsKey"
          options={PAINTED_PARTS_KEYS}
          value={draft.paintedPartsKey}
          onChange={(paintedPartsKey) => patch({ paintedPartsKey })}
          locale={locale}
          error={err("paintedPartsKey")}
        />
        {isDamagePaintedParts(draft.paintedPartsKey) ? (
          <div data-field="damagePhotoUrl">
            <FieldLabel>{label("sellDamagePhoto")}</FieldLabel>
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
            <FieldLabel>{label("sellExtraFeatures")}</FieldLabel>
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

      <SectionCard title={label("sellSectionPrice")} icon={Banknote} field="priceValue">
        <label className="block">
          <FieldLabel>{label("sellDescription")}</FieldLabel>
          <textarea
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            rows={4}
            className="mt-1 w-full rounded-[12px] bg-input px-3 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
          />
        </label>
        <label className="block">
          <FieldLabel>{label("sellPrice")}</FieldLabel>
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

      {showPackagePayment ? (
        <SellPackagePaymentSection
          locale={locale}
          packageKey={draft.packageKey}
          paymentMethodKey={draft.paymentMethodKey}
          packagePrices={packagePrices}
          onPackageChange={(key) => patch({ packageKey: key })}
          onPaymentMethodChange={(key) => patch({ paymentMethodKey: key })}
          packageError={err("packageKey")}
          paymentError={err("paymentMethodKey")}
        />
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={busy || uploading}
          className="w-full rounded-[12px] bg-primary px-5 py-3.5 text-sm font-semibold text-on-primary disabled:opacity-60"
        >
          {busy
            ? label("sellSubmitting")
            : isEditingActive || isEditingPending
              ? label("sellSaveChanges")
              : label("sellSubmit")}
        </button>
        {canPublishDraft ? (
          <button
            type="button"
            disabled={busy || uploading}
            onClick={() => void publishOnly()}
            className="w-full rounded-[12px] bg-input px-5 py-3.5 text-sm font-semibold disabled:opacity-60 sm:max-w-[220px]"
          >
            {label("dashPublish")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
