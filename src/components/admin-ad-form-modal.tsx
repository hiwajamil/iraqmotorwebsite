"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { api } from "@/lib/api";
import {
  AD_CREATIVE_SIZES,
  AD_SLOTS,
  adImageUrl,
  adIsEnabled,
  formatAdDateIraq,
  formatAdDateUtc,
  liveAdsInSlot,
  type AdSlotKey,
  type AdvertiseAdmin,
} from "@/lib/ads";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export type AdFormState = {
  title: string;
  description: string;
  targetLink: string;
  slotPosition: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export const emptyAdForm = (): AdFormState => ({
  title: "",
  description: "",
  targetLink: "",
  slotPosition: "home_banner",
  startDate: "",
  endDate: "",
  isActive: true,
});

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrNull(local: string): string | null {
  if (!local.trim()) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isSlotKey(value: string): value is AdSlotKey {
  return AD_SLOTS.some((s) => s.key === value);
}

export function formFromAd(ad: AdvertiseAdmin): AdFormState {
  return {
    title: ad.title || "",
    description: ad.description || "",
    targetLink: ad.targetLink || ad.url || "",
    slotPosition: ad.slotPosition || "home_banner",
    startDate: toLocalInput(ad.startDate),
    endDate: toLocalInput(ad.endDate),
    isActive: adIsEnabled(ad),
  };
}

function toPayload(form: AdFormState) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    targetLink: form.targetLink.trim() || null,
    slotPosition: form.slotPosition,
    startDate: toIsoOrNull(form.startDate),
    endDate: toIsoOrNull(form.endDate),
    isActive: form.isActive,
  };
}

export function AdminAdFormModal({
  open,
  ad,
  existingAds = [],
  onClose,
  onSaved,
}: {
  open: boolean;
  ad: AdvertiseAdmin | null;
  existingAds?: AdvertiseAdmin[];
  onClose: () => void;
  onSaved: (ad: AdvertiseAdmin, created: boolean) => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [form, setForm] = useState<AdFormState>(emptyAdForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNoImage, setPendingNoImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(ad ? formFromAd(ad) : emptyAdForm());
    setFile(null);
    setPreview(ad ? adImageUrl(ad) : null);
    setError(null);
    setBusy(false);
    setUploading(false);
    setPendingNoImage(false);
  }, [open, ad]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy && !uploading && !pendingNoImage) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, uploading, pendingNoImage, onClose]);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const slotKey: AdSlotKey = isSlotKey(form.slotPosition)
    ? form.slotPosition
    : "home_banner";
  const creative = AD_CREATIVE_SIZES[slotKey];
  const bannerPreview = slotKey === "home_banner";

  const competing = useMemo(
    () => liveAdsInSlot(existingAds, form.slotPosition, ad?.id),
    [existingAds, form.slotPosition, ad?.id],
  );

  const startIso = toIsoOrNull(form.startDate);
  const endIso = toIsoOrNull(form.endDate);

  const hasCreative = Boolean(file) || Boolean(ad && adImageUrl(ad));

  if (!open) return null;

  const editing = Boolean(ad?.id);

  async function uploadImage(id: string, nextFile: File) {
    setUploading(true);
    try {
      return await api.upload<AdvertiseAdmin>(`/admin/ads/${id}/image`, nextFile);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const body = toPayload(form);
    setBusy(true);
    setError(null);
    try {
      let saved: AdvertiseAdmin;
      if (ad?.id) {
        saved = await api.patch<AdvertiseAdmin>(`/admin/ads/${ad.id}`, body);
      } else {
        saved = await api.post<AdvertiseAdmin>("/admin/ads", body);
      }
      if (file) {
        saved = await uploadImage(saved.id, file);
      }
      onSaved(saved, !ad?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "couldNotSaveAd"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = toPayload(form);
    if (!body.title) {
      setError(t(locale, "adTitleRequired"));
      return;
    }
    if (body.startDate && body.endDate) {
      if (new Date(body.endDate).getTime() < new Date(body.startDate).getTime()) {
        setError(t(locale, "adEndDateInvalid"));
        return;
      }
    }
    if (form.isActive && !hasCreative) {
      setPendingNoImage(true);
      return;
    }
    await save();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        onClick={() => {
          if (!busy && !uploading && !pendingNoImage) onClose();
        }}
        role="presentation"
      />
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] bg-card p-5 shadow-xl ring-1 ring-outline"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              {editing
                ? t(locale, "editAdvertisement")
                : t(locale, "newAdvertisement")}
            </h2>
            <p className="mt-1 text-xs text-muted">{t(locale, "adFormHint")}</p>
          </div>
          <button
            type="button"
            disabled={busy || uploading}
            onClick={onClose}
            className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
          >
            {t(locale, "close")}
          </button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {competing.length > 0 ? (
          <p className="mt-4 rounded-[var(--radius-control)] bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-800">
            {t(locale, "adsSlotConflict")}
          </p>
        ) : null}

        <div className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="font-medium">{t(locale, "adFieldTitle")}</span>
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              placeholder={t(locale, "adTitlePlaceholder")}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">{t(locale, "adFieldDescription")}</span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={2}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              placeholder={t(locale, "adDescriptionPlaceholder")}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">{t(locale, "adFieldTargetLink")}</span>
            <input
              value={form.targetLink}
              onChange={(e) =>
                setForm((p) => ({ ...p, targetLink: e.target.value }))
              }
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              placeholder={t(locale, "adTargetLinkPlaceholder")}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">{t(locale, "adFieldSlot")}</span>
            <select
              value={form.slotPosition}
              onChange={(e) =>
                setForm((p) => ({ ...p, slotPosition: e.target.value }))
              }
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
            >
              {AD_SLOTS.map((slot) => (
                <option key={slot.key} value={slot.key}>
                  {t(locale, slot.labelKey)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              {t(locale, "adsCreativeSizeHint", { size: creative.size })}
            </p>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">{t(locale, "adFieldStartDate")}</span>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, startDate: e.target.value }))
                }
                className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t(locale, "adFieldEndDate")}</span>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, endDate: e.target.value }))
                }
                className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              />
            </label>
          </div>
          <p className="text-xs text-muted">{t(locale, "adDatesHint")}</p>
          {startIso ? (
            <p className="text-xs text-muted">
              {t(locale, "adsGoesLiveAt", {
                iraq: formatAdDateIraq(startIso),
                utc: formatAdDateUtc(startIso).replace(/ UTC$/, ""),
              })}
            </p>
          ) : endIso ? (
            <p className="text-xs text-muted">
              {t(locale, "adsEndsAt", {
                iraq: formatAdDateIraq(endIso),
                utc: formatAdDateUtc(endIso).replace(/ UTC$/, ""),
              })}
            </p>
          ) : (
            <p className="text-xs text-muted">{t(locale, "adsOpenEnded")}</p>
          )}
          {startIso && endIso ? (
            <p className="text-xs text-muted">
              {t(locale, "adsEndsAt", {
                iraq: formatAdDateIraq(endIso),
                utc: formatAdDateUtc(endIso).replace(/ UTC$/, ""),
              })}
            </p>
          ) : null}

          <div>
            <p className="text-sm font-medium">{t(locale, "adFieldBannerImage")}</p>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                style={{ aspectRatio: creative.aspect }}
                className={
                  bannerPreview
                    ? "mt-2 w-full min-h-16 rounded-xl object-cover ring-1 ring-outline"
                    : "mt-2 w-40 rounded-xl object-cover ring-1 ring-outline"
                }
              />
            ) : (
              <div
                style={{ aspectRatio: creative.aspect }}
                className={
                  bannerPreview
                    ? "mt-2 flex min-h-16 w-full items-center justify-center rounded-xl bg-input text-xs text-muted ring-1 ring-outline"
                    : "mt-2 flex w-40 items-center justify-center rounded-xl bg-input text-xs text-muted ring-1 ring-outline"
                }
              >
                {t(locale, "noImageSelected")}
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={busy || uploading}
              onChange={(e) => {
                const next = e.target.files?.[0] ?? null;
                e.target.value = "";
                setFile(next);
                setPreview((current) => {
                  if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
                  return next ? URL.createObjectURL(next) : current;
                });
              }}
              className="mt-2 w-full text-xs"
            />
            <p className="mt-1 text-xs text-muted">
              {t(locale, "adImageUploadHint")}
            </p>
            {form.isActive && !hasCreative ? (
              <p className="mt-2 text-xs font-medium text-amber-700">
                {t(locale, "adsNoImageWarning")}
              </p>
            ) : null}
          </div>

          <label className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm">
            <span className="font-medium">{t(locale, "adFieldActive")}</span>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((p) => ({ ...p, isActive: e.target.checked }))
              }
              className="h-4 w-4 accent-[var(--primary)]"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={busy || uploading}
            onClick={onClose}
            className="rounded-[var(--radius-control)] bg-input px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {t(locale, "dashCancel")}
          </button>
          <button
            type="submit"
            disabled={busy || uploading}
            className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {uploading
              ? t(locale, "uploadingImage")
              : busy
                ? t(locale, "saving")
                : editing
                  ? t(locale, "saveChanges")
                  : t(locale, "createAd")}
          </button>
        </div>
      </form>

      <AdminConfirmDialog
        open={pendingNoImage}
        title={t(locale, "adsSaveWithoutImageTitle")}
        description={t(locale, "adsSaveWithoutImage")}
        confirmLabel={t(locale, "confirm")}
        busy={busy}
        onCancel={() => setPendingNoImage(false)}
        onConfirm={() => {
          setPendingNoImage(false);
          void save();
        }}
      />
    </div>
  );
}
