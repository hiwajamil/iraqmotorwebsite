"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { IRAQ_CITIES } from "@/lib/i18n";
import { formatCarTitle } from "@/lib/listing-display";

const steps = [
  "Location",
  "Photos",
  "Basic",
  "Plate",
  "Mileage",
  "Technical",
  "Condition",
  "Price",
  "Review",
] as const;

const FUEL_OPTIONS = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Electric" },
  { value: "gas", label: "Gas / LPG" },
] as const;

const TRANSMISSION_OPTIONS = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
] as const;

const CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "brand_new", label: "Brand new" },
] as const;

type Draft = {
  province: string;
  city: string;
  brandId: string;
  modelKey: string;
  year: string;
  colorKey: string;
  plateTypeKey: string;
  plateCityKey: string;
  mileageValue: string;
  fuelKey: string;
  transmissionKey: string;
  conditionKey: string;
  priceValue: string;
  currencyKey: string;
  description: string;
  imageUrls: string[];
};

const empty: Draft = {
  province: "",
  city: "",
  brandId: "",
  modelKey: "",
  year: "",
  colorKey: "",
  plateTypeKey: "",
  plateCityKey: "",
  mileageValue: "",
  fuelKey: "",
  transmissionKey: "",
  conditionKey: "",
  priceValue: "",
  currencyKey: "IQD",
  description: "",
  imageUrls: [],
};

function validateStep(step: number, draft: Draft): string | null {
  switch (step) {
    case 0:
      if (!draft.province.trim()) return "Province is required";
      if (!draft.city.trim()) return "City is required";
      return null;
    case 1:
      if (draft.imageUrls.length < 1) return "Add at least one photo";
      return null;
    case 2: {
      if (!draft.brandId.trim()) return "Select a brand";
      if (!draft.modelKey.trim()) return "Select a model";
      const year = Number(draft.year);
      if (!year || year < 1980 || year > new Date().getFullYear() + 1) {
        return "Enter a valid year";
      }
      return null;
    }
    case 4: {
      if (draft.mileageValue === "" || Number(draft.mileageValue) < 0) {
        return "Enter mileage";
      }
      if (!draft.fuelKey) return "Select fuel type";
      return null;
    }
    case 5:
      if (!draft.transmissionKey) return "Select transmission";
      return null;
    case 6:
      if (!draft.conditionKey) return "Select condition";
      return null;
    case 7: {
      const price = Number(draft.priceValue);
      if (!price || price <= 0) return "Enter a valid price";
      return null;
    }
    default:
      return null;
  }
}

export default function SellPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(empty);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brands, setBrands] = useState<{ id: string; name?: string }[]>([]);
  const [models, setModels] = useState<{ id: string; key?: string; name?: string }[]>(
    [],
  );

  useEffect(() => {
    void api
      .get<{ items: { id: string; name?: string }[] }>("/catalog/brands")
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
      .get<{ items: { id: string; key?: string; name?: string }[] }>(
        `/catalog/brands/${draft.brandId}/models`,
      )
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

  const progress = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step],
  );

  function patch(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  async function saveDraft(lastStep = step) {
    if (!user) throw new Error("Sign in required");
    const payload = {
      province: draft.province,
      city: draft.city,
      brandId: draft.brandId,
      modelKey: draft.modelKey,
      year: draft.year ? Number(draft.year) : null,
      colorKey: draft.colorKey,
      plateTypeKey: draft.plateTypeKey,
      plateCityKey: draft.plateCityKey,
      mileageValue: draft.mileageValue ? Number(draft.mileageValue) : null,
      fuelKey: draft.fuelKey,
      transmissionKey: draft.transmissionKey,
      conditionKey: draft.conditionKey,
      priceValue: draft.priceValue ? Number(draft.priceValue) : null,
      currencyKey: draft.currencyKey,
      description: draft.description,
      imageUrls: draft.imageUrls,
      imageUrl: draft.imageUrls[0] || null,
      draftLastStep: lastStep,
    };

    if (draftId) {
      await api.put(`/cars/drafts/${draftId}`, payload);
      return draftId;
    }
    const created = await api.post<{ id: string }>("/cars/drafts", payload);
    setDraftId(created.id);
    return created.id;
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [...draft.imageUrls];
      for (const file of Array.from(files).slice(0, 9 - urls.length)) {
        const res = await api.upload<{ url: string }>("/uploads", file);
        if (res.url) urls.push(res.url);
      }
      patch({ imageUrls: urls });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function removePhoto(url: string) {
    patch({ imageUrls: draft.imageUrls.filter((u) => u !== url) });
  }

  async function next() {
    const validation = validateStep(step, draft);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!user) {
        router.push("/auth?next=/sell");
        return;
      }
      await saveDraft(step);
      if (step < steps.length - 1) setStep(step + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    const validation = validateStep(7, draft) || validateStep(1, draft);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!user) {
        router.push("/auth?next=/sell");
        return;
      }
      const id = await saveDraft(step);
      await api.patch(`/cars/${id}`, {
        province: draft.province,
        city: draft.city,
        brandId: draft.brandId,
        modelKey: draft.modelKey,
        year: Number(draft.year) || null,
        colorKey: draft.colorKey,
        plateTypeKey: draft.plateTypeKey,
        plateCityKey: draft.plateCityKey,
        mileageValue: Number(draft.mileageValue) || null,
        fuelKey: draft.fuelKey,
        transmissionKey: draft.transmissionKey,
        conditionKey: draft.conditionKey,
        imageUrls: draft.imageUrls,
        imageUrl: draft.imageUrls[0],
        priceValue: Number(draft.priceValue) || 0,
        currencyKey: draft.currencyKey,
        description: draft.description,
      });
      await api.post(`/cars/${id}/publish`);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-[4%] pt-28 pb-16 text-center">
        <h1 className="text-2xl font-bold">Sell your car</h1>
        <p className="mt-2 text-muted">Sign in to start the listing wizard.</p>
        <button
          type="button"
          onClick={() => router.push("/auth?next=/sell")}
          className="mt-6 rounded-[12px] bg-primary px-6 py-3 text-sm font-semibold text-on-primary"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-[4%] pb-16 pt-24">
      <h1 className="text-3xl font-bold tracking-tight">Sell your car</h1>
      <p className="mt-1 text-sm text-muted">
        Step {step + 1} of {steps.length}: {steps[step]}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-input">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-8 space-y-4 rounded-[16px] bg-card p-6 ring-1 ring-outline md:p-8">
        {step === 0 && (
          <>
            <label className="block text-sm font-medium">
              Province / City
              <select
                value={draft.city}
                onChange={(e) => {
                  const city = e.target.value;
                  patch({ city, province: city || draft.province });
                }}
                className="mt-1 w-full rounded-[12px] bg-input px-3 py-2 text-sm"
              >
                <option value="">Select city</option>
                {IRAQ_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Province (optional detail)"
              value={draft.province}
              onChange={(v) => patch({ province: v })}
            />
          </>
        )}
        {step === 1 && (
          <div>
            <label className="text-sm font-medium">Photos (up to 9)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="mt-2 block w-full text-sm"
              onChange={(e) => void onUpload(e.target.files)}
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              {draft.imageUrls.map((url) => (
                <div key={url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="aspect-square rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute end-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-xs font-bold"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <>
            <label className="block text-sm font-medium">
              Brand
              <select
                value={draft.brandId}
                onChange={(e) =>
                  patch({ brandId: e.target.value, modelKey: "" })
                }
                className="mt-1 w-full rounded-[12px] bg-input px-3 py-2 text-sm"
              >
                <option value="">Select brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || b.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Model
              <select
                value={draft.modelKey}
                onChange={(e) => patch({ modelKey: e.target.value })}
                className="mt-1 w-full rounded-[12px] bg-input px-3 py-2 text-sm"
                disabled={!draft.brandId}
              >
                <option value="">Select model</option>
                {models.map((m) => {
                  const key = m.key || m.id;
                  return (
                    <option key={key} value={key}>
                      {m.name || key}
                    </option>
                  );
                })}
              </select>
            </label>
            {!brands.length ? (
              <Field
                label="Brand id (fallback)"
                value={draft.brandId}
                onChange={(v) => patch({ brandId: v })}
              />
            ) : null}
            <Field
              label="Year"
              value={draft.year}
              onChange={(v) => patch({ year: v.replace(/[^\d]/g, "").slice(0, 4) })}
              inputMode="numeric"
            />
            <Field
              label="Color"
              value={draft.colorKey}
              onChange={(v) => patch({ colorKey: v })}
            />
          </>
        )}
        {step === 3 && (
          <>
            <Field
              label="Plate type"
              value={draft.plateTypeKey}
              onChange={(v) => patch({ plateTypeKey: v })}
            />
            <Field
              label="Plate city"
              value={draft.plateCityKey}
              onChange={(v) => patch({ plateCityKey: v })}
            />
          </>
        )}
        {step === 4 && (
          <>
            <Field
              label="Mileage (km)"
              value={draft.mileageValue}
              onChange={(v) =>
                patch({ mileageValue: v.replace(/[^\d]/g, "") })
              }
              inputMode="numeric"
            />
            <label className="block text-sm font-medium">
              Fuel
              <select
                value={draft.fuelKey}
                onChange={(e) => patch({ fuelKey: e.target.value })}
                className="mt-1 w-full rounded-[12px] bg-input px-3 py-2 text-sm"
              >
                <option value="">Select fuel</option>
                {FUEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {step === 5 && (
          <label className="block text-sm font-medium">
            Transmission
            <select
              value={draft.transmissionKey}
              onChange={(e) => patch({ transmissionKey: e.target.value })}
              className="mt-1 w-full rounded-[12px] bg-input px-3 py-2 text-sm"
            >
              <option value="">Select transmission</option>
              {TRANSMISSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {step === 6 && (
          <label className="block text-sm font-medium">
            Condition
            <select
              value={draft.conditionKey}
              onChange={(e) => patch({ conditionKey: e.target.value })}
              className="mt-1 w-full rounded-[12px] bg-input px-3 py-2 text-sm"
            >
              <option value="">Select condition</option>
              {CONDITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {step === 7 && (
          <>
            <Field
              label="Price"
              value={draft.priceValue}
              onChange={(v) =>
                patch({ priceValue: v.replace(/[^\d]/g, "") })
              }
              inputMode="numeric"
            />
            <label className="block text-sm font-medium">
              Currency
              <select
                value={draft.currencyKey}
                onChange={(e) => patch({ currencyKey: e.target.value })}
                className="mt-1 w-full rounded-[12px] bg-input px-3 py-2 text-sm"
              >
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Description
              <textarea
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
                className="mt-1 w-full rounded-[12px] bg-input px-3 py-2 text-sm"
                rows={4}
              />
            </label>
          </>
        )}
        {step === 8 && (
          <div className="space-y-2 text-sm">
            <p>
              <strong className="capitalize">
                {formatCarTitle({
                  brandId: draft.brandId,
                  modelKey: draft.modelKey,
                  year: draft.year,
                }) || "Listing"}
              </strong>
            </p>
            <p>
              {draft.city}
              {draft.province ? `, ${draft.province}` : ""}
            </p>
            <p>
              {Number(draft.priceValue || 0).toLocaleString()} {draft.currencyKey}
            </p>
            <p className="capitalize">
              {[draft.fuelKey, draft.transmissionKey, draft.conditionKey]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p>{draft.imageUrls.length} photo(s)</p>
            <p className="text-muted">{draft.description}</p>
          </div>
        )}
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex justify-between gap-3">
        <button
          type="button"
          disabled={step === 0 || busy}
          onClick={() => {
            setError(null);
            setStep((s) => Math.max(0, s - 1));
          }}
          className="rounded-[12px] bg-input px-5 py-3 text-sm font-semibold disabled:opacity-40"
        >
          Back
        </button>
        {step < steps.length - 1 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void next()}
            className="rounded-[12px] bg-primary px-5 py-3 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {busy ? "Saving…" : "Continue"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void publish()}
            className="rounded-[12px] bg-primary px-5 py-3 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {busy ? "Publishing…" : "Submit for review"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        className="mt-1 w-full rounded-[12px] bg-input px-3 py-2 text-sm"
      />
    </label>
  );
}
