"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/api";
import {
  SERVICE_CITIES,
  serviceCategoryTitle,
  serviceCityLabel,
  type ServiceCategory,
  type UserService,
} from "@/lib/car-services";
import { t } from "@/lib/i18n";
import { emitToast } from "@/components/site-toast";
import { useAppSelector } from "@/store/hooks";

export function OfferServiceModal({
  open,
  categories,
  onClose,
  onCreated,
}: {
  open: boolean;
  categories: ServiceCategory[];
  onClose: () => void;
  onCreated: (item: UserService) => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategoryId("");
    setCity("");
    setTitle("");
    setDescription("");
    setPhone("");
    setBusy(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open || loading) return;
    if (!user) {
      onClose();
      router.push("/auth?next=/services");
    }
  }, [open, loading, user, onClose, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categoryId || !city || title.trim().length < 3 || description.trim().length < 10) {
      setError(t(locale, "servicesFormIncomplete"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ success: boolean; item: UserService }>(
        "/services",
        {
          categoryId: Number(categoryId),
          city,
          title: title.trim(),
          description: description.trim(),
          phone: phone.trim(),
        },
      );
      emitToast(t(locale, "servicesSubmitSuccess"));
      onCreated(res.item);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t(locale, "servicesSubmitFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => (!busy ? onClose() : undefined)} className="relative z-[70]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/45 transition data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-end justify-center p-4 sm:items-center">
        <DialogPanel
          transition
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] bg-card p-5 shadow-xl ring-1 ring-outline transition data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold">
                {t(locale, "servicesOfferTitle")}
              </DialogTitle>
              <p className="mt-1 text-sm text-muted">
                {t(locale, "servicesOfferHint")}
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-[12px] bg-input px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
            >
              {t(locale, "close")}
            </button>
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">
                {t(locale, "servicesCategory")}
              </span>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="lang-select w-full rounded-[12px] bg-input px-3 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
              >
                <option value="">{t(locale, "servicesSelectCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {serviceCategoryTitle(locale, c)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">
                {t(locale, "servicesCity")}
              </span>
              <select
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="lang-select w-full rounded-[12px] bg-input px-3 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
              >
                <option value="">{t(locale, "servicesSelectCity")}</option>
                {SERVICE_CITIES.map((c) => (
                  <option key={c.key} value={c.en}>
                    {serviceCityLabel(locale, c.en)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">
                {t(locale, "servicesTitle")}
              </span>
              <input
                required
                minLength={3}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t(locale, "servicesTitlePlaceholder")}
                className="w-full rounded-[12px] bg-input px-3 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">
                {t(locale, "servicesDescription")}
              </span>
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(locale, "servicesDescriptionPlaceholder")}
                className="w-full resize-y rounded-[12px] bg-input px-3 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">
                {t(locale, "servicesPhone")}
              </span>
              <input
                required
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+964 7XX XXX XXXX"
                className="w-full rounded-[12px] bg-input px-3 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-primary"
              />
            </label>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-[12px] bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-sm transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? t(locale, "servicesSubmitting") : t(locale, "servicesSubmit")}
            </button>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
