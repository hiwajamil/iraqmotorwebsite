"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import {
  AD_CREATIVE_SLOTS,
  AD_TARGET_CITIES,
  AD_TYPE_LABELS,
  type AdvertiseAdmin,
  type AdvertiseTypeId,
} from "@/lib/ads";

type FormState = {
  advertiseTypeId: AdvertiseTypeId;
  locationIds: string[];
  titleEn: string;
  titleAr: string;
  titleKu: string;
  phone: string;
  url: string;
  carId: string;
  showroomSellerId: string;
  creatives: {
    webLandscape: string;
    landscape: string;
    webSquare: string;
    portrait: string;
  };
  priority: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  advertiseTypeId: 1,
  locationIds: ["*"],
  titleEn: "",
  titleAr: "",
  titleKu: "",
  phone: "",
  url: "",
  carId: "",
  showroomSellerId: "",
  creatives: {
    webLandscape: "",
    landscape: "",
    webSquare: "",
    portrait: "",
  },
  priority: "50",
  active: true,
});

function fromAd(ad: AdvertiseAdmin): FormState {
  return {
    advertiseTypeId: ad.advertiseTypeId,
    locationIds: ad.locationIds?.length ? ad.locationIds : ["*"],
    titleEn: ad.title?.en ?? "",
    titleAr: ad.title?.ar ?? "",
    titleKu: ad.title?.ku ?? "",
    phone: ad.phone ?? "",
    url: ad.url ?? "",
    carId: ad.carId ?? "",
    showroomSellerId: ad.showroomSellerId ?? "",
    creatives: {
      webLandscape: ad.creatives?.webLandscape ?? "",
      landscape: ad.creatives?.landscape ?? "",
      webSquare: ad.creatives?.webSquare ?? "",
      portrait: ad.creatives?.portrait ?? "",
    },
    priority: String(ad.priority ?? 0),
    active: ad.active !== false,
  };
}

function toPayload(form: FormState) {
  return {
    advertiseTypeId: form.advertiseTypeId,
    locationIds: form.locationIds.length ? form.locationIds : ["*"],
    title: {
      en: form.titleEn.trim() || undefined,
      ar: form.titleAr.trim() || undefined,
      ku: form.titleKu.trim() || undefined,
    },
    phone: form.phone.trim() || null,
    url: form.url.trim() || null,
    carId: form.carId.trim() || null,
    showroomSellerId: form.showroomSellerId.trim() || null,
    creatives: form.creatives,
    priority: Number(form.priority) || 0,
    active: form.active,
  };
}

function previewUrl(ad: AdvertiseAdmin): string | null {
  return (
    ad.creatives?.webLandscape ||
    ad.creatives?.landscape ||
    ad.creatives?.webSquare ||
    ad.creatives?.portrait ||
    null
  );
}

function titleOf(ad: AdvertiseAdmin): string {
  return ad.title?.en || ad.title?.ar || ad.title?.ku || ad.id;
}

export default function AdminBannersPage() {
  const [items, setItems] = useState<AdvertiseAdmin[]>([]);
  const [usingSeed, setUsingSeed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  async function load() {
    const d = await api.get<{ items: AdvertiseAdmin[]; usingSeed: boolean }>(
      "/admin/ads",
    );
    setItems(d.items ?? []);
    setUsingSeed(Boolean(d.usingSeed));
  }

  useEffect(() => {
    void load().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load banners"),
    );
  }, []);

  const editing = useMemo(
    () => items.find((a) => a.id === editingId) ?? null,
    [items, editingId],
  );

  async function run(action: () => Promise<void>, ok: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setMessage(null);
    setError(null);
  }

  function startEdit(ad: AdvertiseAdmin) {
    setEditingId(ad.id);
    setForm(fromAd(ad));
    setMessage(null);
    setError(null);
  }

  function toggleCity(key: string) {
    setForm((prev) => {
      if (key === "*") return { ...prev, locationIds: ["*"] };
      const withoutAll = prev.locationIds.filter((c) => c !== "*");
      const next = withoutAll.includes(key)
        ? withoutAll.filter((c) => c !== key)
        : [...withoutAll, key];
      return { ...prev, locationIds: next.length ? next : ["*"] };
    });
  }

  async function uploadSlot(
    slot: keyof FormState["creatives"],
    file: File | undefined,
  ) {
    if (!file) return;
    setUploading(slot);
    setError(null);
    try {
      const res = await api.upload<{ url: string }>("/uploads", file);
      if (!res.url) throw new Error("Upload returned no URL");
      setForm((prev) => ({
        ...prev,
        creatives: { ...prev.creatives, [slot]: res.url },
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Sponsor banners</h1>
          <p className="mt-1 text-sm text-muted">
            Home and in-feed creatives for website and app
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {usingSeed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api.post("/admin/ads/seed");
                  await load();
                }, "Seed banners copied — you can edit them now")
              }
              className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-xs font-semibold"
            >
              Copy seed banners
            </button>
          ) : null}
          <button
            type="button"
            onClick={startCreate}
            className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary"
          >
            New banner
          </button>
        </div>
      </div>

      {usingSeed ? (
        <p className="mt-4 rounded-[var(--radius-card)] bg-amber-500/10 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-500/20">
          Public ads are still using built-in seed banners. Create a banner or
          copy the seed set to start managing them.
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-primary">{message}</p> : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-[var(--radius-card)] bg-card p-8 text-center ring-1 ring-outline">
              <p className="font-semibold">No sponsor banners yet</p>
              <p className="mt-1 text-sm text-muted">
                Add a banner to show on home and listing grids.
              </p>
            </div>
          ) : (
            items.map((ad) => {
              const img = previewUrl(ad);
              const selected = editingId === ad.id;
              return (
                <article
                  key={ad.id}
                  className={`flex flex-wrap gap-4 rounded-[var(--radius-card)] bg-card p-4 ring-1 ${
                    selected ? "ring-primary" : "ring-outline"
                  }`}
                >
                  <div className="h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-input">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{titleOf(ad)}</h2>
                      <span className="rounded-full bg-input px-2 py-0.5 text-[11px] font-medium">
                        {AD_TYPE_LABELS[ad.advertiseTypeId]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          ad.active !== false
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "bg-slate-500/15 text-slate-600"
                        }`}
                      >
                        {ad.active !== false ? "Active" : "Off"}
                      </span>
                      {ad.source === "seed" ? (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Seed
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Priority {ad.priority ?? 0} ·{" "}
                      {(ad.locationIds ?? ["*"]).join(", ")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(ad)}
                        className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api.patch(`/admin/ads/${ad.id}`, {
                              active: ad.active === false,
                            });
                            await load();
                          }, ad.active === false ? "Banner activated" : "Banner turned off")
                        }
                        className="rounded-[var(--radius-control)] bg-input px-3 py-1.5 text-xs font-semibold"
                      >
                        {ad.active === false ? "Activate" : "Deactivate"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (!window.confirm(`Delete “${titleOf(ad)}”?`)) return;
                          void run(async () => {
                            await api.delete(`/admin/ads/${ad.id}`);
                            if (editingId === ad.id) startCreate();
                            await load();
                          }, "Banner deleted");
                        }}
                        className="rounded-[var(--radius-control)] px-3 py-1.5 text-xs font-semibold text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <form
          className="space-y-4 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const body = toPayload(form);
              if (editingId) {
                await api.patch(`/admin/ads/${editingId}`, body);
              } else {
                const created = await api.post<AdvertiseAdmin>(
                  "/admin/ads",
                  body,
                );
                setEditingId(created.id);
              }
              await load();
            }, editingId ? "Banner saved" : "Banner created");
          }}
        >
          <h2 className="font-semibold">
            {editing ? `Edit: ${titleOf(editing)}` : "New banner"}
          </h2>

          <label className="block text-sm">
            <span className="text-muted">Type</span>
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
              <option value={1}>URL / phone</option>
              <option value={2}>Car listing</option>
              <option value={3}>Showroom</option>
            </select>
          </label>

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-muted">Title (EN)</span>
              <input
                value={form.titleEn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, titleEn: e.target.value }))
                }
                className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Title (AR)</span>
              <input
                value={form.titleAr}
                onChange={(e) =>
                  setForm((p) => ({ ...p, titleAr: e.target.value }))
                }
                className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Title (KU)</span>
              <input
                value={form.titleKu}
                onChange={(e) =>
                  setForm((p) => ({ ...p, titleKu: e.target.value }))
                }
                className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              />
            </label>
          </div>

          {form.advertiseTypeId === 1 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">URL</span>
                <input
                  value={form.url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, url: e.target.value }))
                  }
                  placeholder="/sell or https://…"
                  className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
              </label>
            </div>
          ) : null}

          {form.advertiseTypeId === 2 ? (
            <label className="block text-sm">
              <span className="text-muted">Car listing ID</span>
              <input
                value={form.carId}
                onChange={(e) =>
                  setForm((p) => ({ ...p, carId: e.target.value }))
                }
                className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              />
            </label>
          ) : null}

          {form.advertiseTypeId === 3 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">Showroom seller ID</span>
                <input
                  value={form.showroomSellerId}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      showroomSellerId: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">Fallback URL</span>
                <input
                  value={form.url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, url: e.target.value }))
                  }
                  className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
              </label>
            </div>
          ) : null}

          <div>
            <p className="text-sm text-muted">Cities</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {AD_TARGET_CITIES.map((city) => {
                const on = form.locationIds.includes(city.key);
                return (
                  <button
                    key={city.key}
                    type="button"
                    onClick={() => toggleCity(city.key)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      on
                        ? "bg-primary text-on-primary"
                        : "bg-input text-muted"
                    }`}
                  >
                    {city.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {AD_CREATIVE_SLOTS.map((slot) => {
              const url = form.creatives[slot.key];
              return (
                <label key={slot.key} className="block text-sm">
                  <span className="text-muted">
                    {slot.label}{" "}
                    <span className="font-normal opacity-70">{slot.size}</span>
                  </span>
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt=""
                      className="mt-1 h-16 w-full rounded-lg object-cover ring-1 ring-outline"
                    />
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={Boolean(uploading)}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      void uploadSlot(slot.key, file);
                    }}
                    className="mt-1 w-full text-xs"
                  />
                  {uploading === slot.key ? (
                    <p className="mt-1 text-xs text-muted">Uploading…</p>
                  ) : null}
                </label>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="block text-sm">
              <span className="text-muted">Priority</span>
              <input
                type="number"
                value={form.priority}
                onChange={(e) =>
                  setForm((p) => ({ ...p, priority: e.target.value }))
                }
                className="mt-1 w-24 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-5 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((p) => ({ ...p, active: e.target.checked }))
                }
              />
              Active
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || Boolean(uploading)}
              className="rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {busy ? "Saving…" : editingId ? "Save changes" : "Create banner"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={startCreate}
                className="rounded-[var(--radius-control)] bg-input px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
