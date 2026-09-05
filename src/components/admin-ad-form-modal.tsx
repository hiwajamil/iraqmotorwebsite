"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { api } from "@/lib/api";
import {
  AD_CREATIVE_SLOTS,
  AD_SLOTS,
  AD_TARGET_CITIES,
  AdvertiseType,
  adImageUrl,
  adIsEnabled,
  formatAdDateIraq,
  formatAdDateUtc,
  liveAdsInSlot,
  type AdvertiseAdmin,
  type AdvertiseTypeId,
} from "@/lib/ads";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const LANGS = ["en", "ar", "ku"] as const;
type FormLang = (typeof LANGS)[number];
type CreativeKey = (typeof AD_CREATIVE_SLOTS)[number]["key"];

export type AdFormState = {
  titleEn: string;
  titleAr: string;
  titleKu: string;
  actionLinkEn: string;
  actionLinkAr: string;
  actionLinkKu: string;
  url: string;
  description: string;
  advertiseTypeId: AdvertiseTypeId;
  phone: string;
  carId: string;
  showroomSellerId: string;
  showroomUserName: string;
  locationIds: string[];
  targetLink: string;
  slotPosition: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  impressionLimit: string;
  forceExternalUrl: boolean;
};

type CreativeUrls = Record<FormLang, Record<CreativeKey, string>>;
type CreativeFiles = Partial<Record<`${FormLang}:${CreativeKey}`, File>>;
type CreativePreviews = Partial<Record<`${FormLang}:${CreativeKey}`, string>>;

const emptyCreatives = (): CreativeUrls => ({
  en: { webLandscape: "", landscape: "", webSquare: "", portrait: "" },
  ar: { webLandscape: "", landscape: "", webSquare: "", portrait: "" },
  ku: { webLandscape: "", landscape: "", webSquare: "", portrait: "" },
});

export const emptyAdForm = (): AdFormState => ({
  titleEn: "",
  titleAr: "",
  titleKu: "",
  actionLinkEn: "",
  actionLinkAr: "",
  actionLinkKu: "",
  url: "",
  description: "",
  advertiseTypeId: AdvertiseType.UrlAndPhone,
  phone: "",
  carId: "",
  showroomSellerId: "",
  showroomUserName: "",
  locationIds: ["*"],
  targetLink: "",
  slotPosition: "home_banner",
  startDate: "",
  endDate: "",
  isActive: true,
  impressionLimit: "",
  forceExternalUrl: false,
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

function locValue(
  map: { en?: string | null; ar?: string | null; ku?: string | null } | undefined,
  lang: FormLang,
): string {
  const value = map?.[lang];
  return typeof value === "string" ? value : "";
}

function formFromAd(ad: AdvertiseAdmin): AdFormState {
  const titles = ad.titleLocalized ?? {};
  const action =
    ad.actionLink && typeof ad.actionLink === "object" ? ad.actionLink : {};
  const actionStr = typeof ad.actionLink === "string" ? ad.actionLink : "";
  return {
    titleEn: locValue(titles, "en") || ad.title || "",
    titleAr: locValue(titles, "ar"),
    titleKu: locValue(titles, "ku"),
    actionLinkEn: locValue(action, "en") || actionStr,
    actionLinkAr: locValue(action, "ar"),
    actionLinkKu: locValue(action, "ku"),
    url: ad.url || ad.targetLink || "",
    description: ad.description || "",
    advertiseTypeId: ad.advertiseTypeId ?? AdvertiseType.UrlAndPhone,
    phone: ad.phone || "",
    carId: ad.carId || "",
    showroomSellerId: ad.showroomSellerId || ad.showroomId || "",
    showroomUserName: ad.showroomUserName || "",
    locationIds: ad.locationIds?.length ? ad.locationIds : ["*"],
    targetLink: ad.targetLink || ad.url || "",
    slotPosition: ad.slotPosition || "home_banner",
    startDate: toLocalInput(ad.startDate),
    endDate: toLocalInput(ad.endDate),
    isActive: adIsEnabled(ad),
    impressionLimit:
      ad.impressionLimit == null ? "" : String(ad.impressionLimit),
    forceExternalUrl: Boolean(ad.forceExternalUrl),
  };
}

function creativesFromAd(ad: AdvertiseAdmin | null): CreativeUrls {
  const next = emptyCreatives();
  if (!ad) return next;
  const localized = ad.creativesLocalized;
  for (const lang of LANGS) {
    const set = localized?.[lang] ?? (lang === "en" ? ad.creatives : undefined);
    if (!set) continue;
    next[lang] = {
      webLandscape: set.webLandscape || "",
      landscape: set.landscape || "",
      webSquare: set.webSquare || "",
      portrait: set.portrait || "",
    };
  }
  if (!next.en.webLandscape && ad.creatives?.webLandscape) {
    next.en.webLandscape = ad.creatives.webLandscape;
  }
  if (!next.en.landscape && ad.creatives?.landscape) {
    next.en.landscape = ad.creatives.landscape;
  }
  if (!next.en.webSquare && ad.creatives?.webSquare) {
    next.en.webSquare = ad.creatives.webSquare;
  }
  if (!next.en.portrait && (ad.creatives?.portrait || ad.imageUrl)) {
    next.en.portrait = ad.creatives?.portrait || ad.imageUrl || "";
  }
  return next;
}

function compactLocalized(values: {
  en: string;
  ar: string;
  ku: string;
}): { en?: string; ar?: string; ku?: string } {
  return {
    ...(values.en.trim() ? { en: values.en.trim() } : {}),
    ...(values.ar.trim() ? { ar: values.ar.trim() } : {}),
    ...(values.ku.trim() ? { ku: values.ku.trim() } : {}),
  };
}

function compactCreatives(urls: CreativeUrls) {
  const out: Record<string, Record<string, string>> = {};
  for (const lang of LANGS) {
    const set: Record<string, string> = {};
    for (const slot of AD_CREATIVE_SLOTS) {
      const value = urls[lang][slot.key]?.trim();
      if (value) set[slot.key] = value;
    }
    if (Object.keys(set).length) out[lang] = set;
  }
  return out;
}

function toPayload(form: AdFormState, urls: CreativeUrls) {
  const titles = compactLocalized({
    en: form.titleEn,
    ar: form.titleAr,
    ku: form.titleKu,
  });
  const actionLink = compactLocalized({
    en: form.actionLinkEn,
    ar: form.actionLinkAr,
    ku: form.actionLinkKu,
  });
  const limit = form.impressionLimit.trim();
  return {
    title: titles,
    actionLink,
    url: form.url.trim() || null,
    targetLink:
      form.actionLinkEn.trim() ||
      form.url.trim() ||
      form.targetLink.trim() ||
      null,
    description: form.description.trim() || null,
    advertiseTypeId: form.advertiseTypeId,
    phone: form.phone.trim() || null,
    carId: form.carId.trim() || null,
    showroomSellerId: form.showroomSellerId.trim() || null,
    showroomUserName: form.showroomUserName.trim() || null,
    locationIds: form.locationIds.length ? form.locationIds : ["*"],
    slotPosition: form.slotPosition,
    startDate: toIsoOrNull(form.startDate),
    endDate: toIsoOrNull(form.endDate),
    isActive: form.isActive,
    impressionLimit: limit ? Number(limit) : null,
    forceExternalUrl: form.forceExternalUrl,
    creativesLocalized: compactCreatives(urls),
    creatives: compactCreatives(urls).en,
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
  const [urls, setUrls] = useState<CreativeUrls>(emptyCreatives);
  const [files, setFiles] = useState<CreativeFiles>({});
  const [previews, setPreviews] = useState<CreativePreviews>({});
  const [langTab, setLangTab] = useState<FormLang>("en");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNoImage, setPendingNoImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(ad ? formFromAd(ad) : emptyAdForm());
    setUrls(creativesFromAd(ad));
    setFiles({});
    setPreviews({});
    setLangTab("en");
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
      Object.values(previews).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [previews]);

  const competing = useMemo(
    () => liveAdsInSlot(existingAds, form.slotPosition, ad?.id),
    [existingAds, form.slotPosition, ad?.id],
  );

  const startIso = toIsoOrNull(form.startDate);
  const endIso = toIsoOrNull(form.endDate);

  const hasCreative =
    Object.values(files).some(Boolean) ||
    LANGS.some((lang) =>
      AD_CREATIVE_SLOTS.some((slot) => urls[lang][slot.key]?.trim()),
    ) ||
    Boolean(ad && adImageUrl(ad));

  if (!open) return null;

  const editing = Boolean(ad?.id);

  function toggleCity(key: string) {
    setForm((prev) => {
      if (key === "*") return { ...prev, locationIds: ["*"] };
      const next = prev.locationIds.filter((id) => id !== "*");
      if (next.includes(key)) {
        const filtered = next.filter((id) => id !== key);
        return { ...prev, locationIds: filtered.length ? filtered : ["*"] };
      }
      return { ...prev, locationIds: [...next, key] };
    });
  }

  async function uploadPending(id: string, current: AdvertiseAdmin) {
    let saved = current;
    const entries = Object.entries(files).filter(([, file]) => file);
    if (!entries.length) return saved;
    setUploading(true);
    try {
      for (const [key, file] of entries) {
        if (!file) continue;
        const [lang, slot] = key.split(":") as [FormLang, CreativeKey];
        saved = await api.upload<AdvertiseAdmin>(
          `/admin/ads/${id}/image?slot=${slot}&lang=${lang}`,
          file,
        );
      }
    } finally {
      setUploading(false);
    }
    return saved;
  }

  async function save() {
    const body = toPayload(form, urls);
    setBusy(true);
    setError(null);
    try {
      let saved: AdvertiseAdmin;
      if (ad?.id) {
        saved = await api.patch<AdvertiseAdmin>(`/admin/ads/${ad.id}`, body);
      } else {
        saved = await api.post<AdvertiseAdmin>("/admin/ads", body);
      }
      saved = await uploadPending(saved.id, saved);
      onSaved(saved, !ad?.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, "couldNotSaveAd"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = toPayload(form, urls);
    if (!body.title.en && !body.title.ar && !body.title.ku) {
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

  const localeLabel = {
    en: "adLocaleEn",
    ar: "adLocaleAr",
    ku: "adLocaleKu",
  } as const;

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
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-card)] bg-card p-5 shadow-xl ring-1 ring-outline"
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
            <span className="font-medium">{t(locale, "adFieldType")}</span>
            <select
              value={form.advertiseTypeId}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  advertiseTypeId: Number(e.target.value) as AdvertiseTypeId,
                }))
              }
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
            >
              <option value={AdvertiseType.UrlAndPhone}>
                {t(locale, "adTypeUrlPhone")}
              </option>
              <option value={AdvertiseType.Car}>{t(locale, "adTypeCar")}</option>
              <option value={AdvertiseType.Showroom}>
                {t(locale, "adTypeShowroom")}
              </option>
            </select>
          </label>

          {form.advertiseTypeId === AdvertiseType.UrlAndPhone ? (
            <>
              <label className="block text-sm">
                <span className="font-medium">{t(locale, "adFieldPhone")}</span>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                  placeholder={t(locale, "adPhonePlaceholder")}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">{t(locale, "adFieldUrl")}</span>
                <input
                  value={form.url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, url: e.target.value }))
                  }
                  className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                  placeholder={t(locale, "adTargetLinkPlaceholder")}
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm">
                <span className="font-medium">
                  {t(locale, "adFieldForceExternal")}
                </span>
                <input
                  type="checkbox"
                  checked={form.forceExternalUrl}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      forceExternalUrl: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[var(--primary)]"
                />
              </label>
            </>
          ) : null}

          {form.advertiseTypeId === AdvertiseType.Car ? (
            <label className="block text-sm">
              <span className="font-medium">{t(locale, "adFieldCarId")}</span>
              <input
                value={form.carId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, carId: e.target.value }))
                }
                className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                placeholder={t(locale, "adCarIdPlaceholder")}
              />
            </label>
          ) : null}

          {form.advertiseTypeId === AdvertiseType.Showroom ? (
            <>
              <label className="block text-sm">
                <span className="font-medium">
                  {t(locale, "adFieldShowroomId")}
                </span>
                <input
                  value={form.showroomSellerId}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      showroomSellerId: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                  placeholder={t(locale, "adShowroomIdPlaceholder")}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">
                  {t(locale, "adFieldShowroomUsername")}
                </span>
                <input
                  value={form.showroomUserName}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      showroomUserName: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
              </label>
            </>
          ) : null}

          <div>
            <p className="text-sm font-medium">{t(locale, "adFieldLocations")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {AD_TARGET_CITIES.map((city) => (
                <button
                  key={city.key}
                  type="button"
                  onClick={() => toggleCity(city.key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    form.locationIds.includes(city.key)
                      ? "bg-primary-fill text-on-primary"
                      : "bg-input text-muted"
                  }`}
                >
                  {city.label}
                </button>
              ))}
            </div>
          </div>

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
          </label>

          <div className="flex flex-wrap gap-1.5">
            {LANGS.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLangTab(lang)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  langTab === lang
                    ? "bg-primary-fill text-on-primary"
                    : "bg-input text-muted"
                }`}
              >
                {t(locale, localeLabel[lang])}
              </button>
            ))}
          </div>

          <label className="block text-sm">
            <span className="font-medium">{t(locale, "adFieldTitle")}</span>
            <input
              value={
                langTab === "en"
                  ? form.titleEn
                  : langTab === "ar"
                    ? form.titleAr
                    : form.titleKu
              }
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) =>
                  langTab === "en"
                    ? { ...p, titleEn: value }
                    : langTab === "ar"
                      ? { ...p, titleAr: value }
                      : { ...p, titleKu: value },
                );
              }}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              placeholder={t(locale, "adTitlePlaceholder")}
              required={langTab === "en"}
            />
          </label>

          {form.advertiseTypeId === AdvertiseType.UrlAndPhone ? (
            <label className="block text-sm">
              <span className="font-medium">{t(locale, "adFieldActionLink")}</span>
              <input
                value={
                  langTab === "en"
                    ? form.actionLinkEn
                    : langTab === "ar"
                      ? form.actionLinkAr
                      : form.actionLinkKu
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((p) =>
                    langTab === "en"
                      ? { ...p, actionLinkEn: value }
                      : langTab === "ar"
                        ? { ...p, actionLinkAr: value }
                        : { ...p, actionLinkKu: value },
                  );
                }}
                className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                placeholder={t(locale, "adTargetLinkPlaceholder")}
              />
              <p className="mt-1 text-xs text-muted">
                {t(locale, "adActionLinkHint")}
              </p>
            </label>
          ) : null}

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

          <div>
            <p className="text-sm font-medium">{t(locale, "adCreativesTitle")}</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {AD_CREATIVE_SLOTS.map((slot) => {
                const key = `${langTab}:${slot.key}` as const;
                const preview =
                  previews[key] || urls[langTab][slot.key] || "";
                return (
                  <label key={slot.key} className="block text-sm">
                    <span className="font-medium">
                      {slot.label}{" "}
                      <span className="text-muted">({slot.size})</span>
                    </span>
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt=""
                        className="mt-2 h-20 w-full rounded-xl object-cover ring-1 ring-outline"
                      />
                    ) : (
                      <div className="mt-2 flex h-20 items-center justify-center rounded-xl bg-input text-xs text-muted ring-1 ring-outline">
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
                        if (!next) return;
                        setFiles((p) => ({ ...p, [key]: next }));
                        setPreviews((p) => {
                          const prev = p[key];
                          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
                          return { ...p, [key]: URL.createObjectURL(next) };
                        });
                      }}
                      className="mt-2 w-full text-xs"
                    />
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-muted">
              {t(locale, "adImageUploadHint")}
            </p>
            {form.isActive && !hasCreative ? (
              <p className="mt-2 text-xs font-medium text-amber-700">
                {t(locale, "adsNoImageWarning")}
              </p>
            ) : null}
          </div>

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

          <label className="block text-sm">
            <span className="font-medium">
              {t(locale, "adFieldImpressionLimit")}
            </span>
            <input
              type="number"
              min={0}
              value={form.impressionLimit}
              onChange={(e) =>
                setForm((p) => ({ ...p, impressionLimit: e.target.value }))
              }
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted">
              {t(locale, "adImpressionLimitHint")}
            </p>
          </label>

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
            className="rounded-[var(--radius-control)] bg-primary-fill px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
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
