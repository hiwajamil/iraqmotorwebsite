"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { MoreHorizontal } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdminToast } from "@/components/admin-toast";
import { t, type Locale } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";
import {
  localizeBrandName,
  localizeModelName,
  localizeTrimName,
} from "@/lib/vehicle-names";

type Brand = {
  id: string;
  name?: string;
  nameAr?: string;
  nameKu?: string;
};

type Model = {
  id: string;
  key?: string;
  name?: string;
  nameAr?: string;
  nameKu?: string;
  trims?: string[];
};

type Toast = { message: string; tone: "success" | "error" };

type Pending =
  | { kind: "brand"; id: string }
  | { kind: "model"; id: string }
  | { kind: "trim"; id: string }
  | { kind: "rename-trim"; from: string; next: string };

type EditTarget =
  | { kind: "brand"; id: string }
  | { kind: "model"; id: string }
  | { kind: "trim"; id: string };

const MENU_ITEM =
  "flex w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-xs font-semibold data-focus:bg-input disabled:opacity-50";

function slugifyBrandId(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function listingCountOf(e: unknown): number | null {
  if (!(e instanceof ApiError) || e.status !== 409) return null;
  const d = e.details;
  if (d && typeof d === "object" && d !== null && "listingCount" in d) {
    const n = Number((d as { listingCount: unknown }).listingCount);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function brandLabel(b: Brand, locale: Locale): string {
  if (locale === "ar" && b.nameAr) return b.nameAr;
  if (locale === "ku" && b.nameKu) return b.nameKu;
  return localizeBrandName(b.name || b.id, locale);
}

function modelLabel(m: Model, locale: Locale): string {
  const key = String(m.key ?? m.id ?? m.name ?? "");
  if (locale === "ar" && m.nameAr) return m.nameAr;
  if (locale === "ku" && m.nameKu) return m.nameKu;
  return localizeModelName(m.name || key, locale);
}

function modelKeyOf(m: Model): string {
  return String(m.key ?? m.id ?? m.name ?? "");
}

function CatalogInner() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandId = searchParams.get("brand") || "";
  const modelKey = searchParams.get("model") || "";

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [trimQuery, setTrimQuery] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newTrim, setNewTrim] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [edit, setEdit] = useState<EditTarget | null>(null);
  const [editValue, setEditValue] = useState("");

  const writeNav = useCallback(
    (next: { brand?: string | null; model?: string | null }) => {
      const params = new URLSearchParams();
      const b = next.brand !== undefined ? next.brand || "" : brandId;
      const m = next.model !== undefined ? next.model || "" : modelKey;
      if (b) params.set("brand", b);
      if (b && m) params.set("model", m);
      const qs = params.toString();
      router.replace(qs ? `/admin/catalog?${qs}` : "/admin/catalog", {
        scroll: false,
      });
    },
    [brandId, modelKey, router],
  );

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true);
    try {
      const d = await api.get<{ items: Brand[] }>("/catalog/brands");
      setBrands(d.items ?? []);
    } finally {
      setBrandsLoading(false);
    }
  }, []);

  const loadModels = useCallback(async (id: string) => {
    setModelsLoading(true);
    try {
      const d = await api.get<{ items: Model[] }>(
        `/catalog/brands/${encodeURIComponent(id)}/models`,
      );
      setModels(d.items ?? []);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrands().catch((e) =>
      setToast({
        tone: "error",
        message:
          e instanceof Error ? e.message : t(locale, "failedToLoadBrands"),
      }),
    );
  }, [loadBrands, locale]);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    void loadModels(brandId).catch((e) =>
      setToast({
        tone: "error",
        message: e instanceof Error ? e.message : t(locale, "failedToLoad"),
      }),
    );
  }, [brandId, loadModels, locale]);

  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) =>
      [b.id, b.name, b.nameAr, b.nameKu, brandLabel(b, locale)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [brands, brandQuery, locale]);

  const filteredModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) =>
      [modelKeyOf(m), m.name, m.nameAr, m.nameKu, modelLabel(m, locale)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [models, modelQuery, locale]);

  const selectedModel = models.find((m) => modelKeyOf(m) === modelKey);
  const trims = Array.isArray(selectedModel?.trims)
    ? selectedModel!.trims!
    : [];
  const filteredTrims = useMemo(() => {
    const q = trimQuery.trim().toLowerCase();
    if (!q) return trims;
    return trims.filter((trim) =>
      [trim, localizeTrimName(trim, locale)].join(" ").toLowerCase().includes(q),
    );
  }, [trims, trimQuery, locale]);

  const brandSlug = slugifyBrandId(newBrand);
  const modelSlug = slugifyBrandId(newModel);

  function failMessage(e: unknown, fallback: string): string {
    const count = listingCountOf(e);
    if (count != null) return t(locale, "catalogInUse", { count });
    return e instanceof Error ? e.message : fallback;
  }

  async function run(action: () => Promise<void>, ok: string) {
    setBusy(true);
    try {
      await action();
      setToast({ tone: "success", message: ok });
    } catch (e) {
      setToast({
        tone: "error",
        message: failMessage(e, t(locale, "actionFailed")),
      });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(target: EditTarget, current: string) {
    setEdit(target);
    setEditValue(current);
  }

  async function saveBrandName(id: string) {
    const name = editValue.trim();
    if (!name) return;
    await run(async () => {
      await api.patch(`/admin/catalog/brands/${encodeURIComponent(id)}`, {
        name,
      });
      setEdit(null);
      await loadBrands();
    }, t(locale, "catalogNameUpdated"));
  }

  async function saveModelName(key: string) {
    if (!brandId) return;
    const name = editValue.trim();
    if (!name) return;
    await run(async () => {
      await api.patch(
        `/admin/catalog/brands/${encodeURIComponent(brandId)}/models/${encodeURIComponent(key)}`,
        { name },
      );
      setEdit(null);
      await loadModels(brandId);
    }, t(locale, "catalogNameUpdated"));
  }

  function requestTrimRename(from: string) {
    const next = editValue.trim();
    if (!next || next === from) {
      setEdit(null);
      return;
    }
    setPending({ kind: "rename-trim", from, next });
  }

  async function confirmPending() {
    if (!pending) return;
    if (pending.kind === "rename-trim") {
      if (!brandId || !modelKey) return;
      await run(async () => {
        await api.patch(
          `/admin/catalog/brands/${encodeURIComponent(brandId)}/models/${encodeURIComponent(modelKey)}/trims/${encodeURIComponent(pending.from)}`,
          { newName: pending.next },
        );
        setEdit(null);
        await loadModels(brandId);
      }, t(locale, "trimRenamed"));
      setPending(null);
      return;
    }
    await run(async () => {
      if (pending.kind === "brand") {
        await api.delete(
          `/admin/catalog/brands/${encodeURIComponent(pending.id)}`,
        );
        if (brandId === pending.id) writeNav({ brand: null, model: null });
        await loadBrands();
      } else if (pending.kind === "model" && brandId) {
        await api.delete(
          `/admin/catalog/brands/${encodeURIComponent(brandId)}/models/${encodeURIComponent(pending.id)}`,
        );
        if (modelKey === pending.id) writeNav({ model: null });
        await loadModels(brandId);
      } else if (pending.kind === "trim" && brandId && modelKey) {
        await api.delete(
          `/admin/catalog/brands/${encodeURIComponent(brandId)}/models/${encodeURIComponent(modelKey)}/trims/${encodeURIComponent(pending.id)}`,
        );
        await loadModels(brandId);
      }
    }, t(locale, pending.kind === "brand" ? "brandDeleted" : pending.kind === "model" ? "modelDeleted" : "trimDeleted"));
    setPending(null);
  }

  const confirmCopy = pending
    ? pending.kind === "brand"
      ? {
          title: t(locale, "catalogDeleteBrandTitle"),
          description: t(locale, "catalogDeleteBrandBody", { id: pending.id }),
        }
      : pending.kind === "model"
        ? {
            title: t(locale, "catalogDeleteModelTitle"),
            description: t(locale, "catalogDeleteModelBody", {
              id: pending.id,
            }),
          }
        : pending.kind === "trim"
          ? {
              title: t(locale, "catalogDeleteTrimTitle"),
              description: t(locale, "catalogDeleteTrimBody"),
            }
          : {
              title: t(locale, "catalogRenameTrimTitle"),
              description: t(locale, "catalogRenameTrimBody"),
            }
    : { title: "", description: "" };

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">{t(locale, "adminCatalogTitle")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(locale, "adminCatalogSubtitle")}
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
          <h2 className="font-semibold">
            {t(locale, "specBrand")} ({brands.length})
          </h2>
          <input
            value={brandQuery}
            onChange={(e) => setBrandQuery(e.target.value)}
            placeholder={t(locale, "searchBrands")}
            className="mt-3 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
          />
          <form
            className="mt-2 space-y-1"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newBrand.trim() || !brandSlug) {
                setToast({
                  tone: "error",
                  message: t(locale, "catalogInvalidSlug"),
                });
                return;
              }
              void run(async () => {
                await api.post("/admin/catalog/brands", {
                  name: newBrand.trim(),
                  id: brandSlug,
                });
                setNewBrand("");
                await loadBrands();
              }, t(locale, "brandCreated"));
            }}
          >
            <div className="flex gap-2">
              <input
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder={t(locale, "catalogDisplayName")}
                className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !brandSlug}
                className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
              >
                {t(locale, "add")}
              </button>
            </div>
            {newBrand.trim() ? (
              <p className="px-1 text-[11px] text-muted">
                {t(locale, "catalogSlugPreview", {
                  id: brandSlug || "—",
                })}
                {" · "}
                {t(locale, "catalogIdHint")}
              </p>
            ) : null}
          </form>
          <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            {brandsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-lg bg-input"
                />
              ))
            ) : filteredBrands.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted">
                {t(locale, "noBrandsFound")}
              </p>
            ) : (
              filteredBrands.map((b) => {
                const active = brandId === b.id;
                const editing = edit?.kind === "brand" && edit.id === b.id;
                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm ${
                      active ? "bg-primary/10" : "hover:bg-input"
                    }`}
                  >
                    {editing ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveBrandName(b.id);
                          }
                          if (e.key === "Escape") setEdit(null);
                        }}
                        className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-input px-2 py-1 text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => writeNav({ brand: b.id, model: null })}
                      >
                        <span className="block truncate font-medium">
                          {brandLabel(b, locale)}
                        </span>
                        <span className="block truncate text-[11px] text-muted">
                          {b.id}
                        </span>
                      </button>
                    )}
                    <RowMenu
                      locale={locale}
                      busy={busy}
                      onEdit={() => startEdit({ kind: "brand", id: b.id }, b.name || b.id)}
                      onDelete={() => setPending({ kind: "brand", id: b.id })}
                    />
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
          <h2 className="font-semibold">
            {t(locale, "specModel")}
            {brandId ? ` (${models.length})` : ""}
          </h2>
          {!brandId ? (
            <p className="mt-4 text-sm text-muted">
              {t(locale, "catalogSelectBrand")}
            </p>
          ) : (
            <>
              <input
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                placeholder={t(locale, "catalogSearchModels")}
                className="mt-3 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              />
              <form
                className="mt-2 space-y-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newModel.trim() || !modelSlug) {
                    setToast({
                      tone: "error",
                      message: t(locale, "catalogInvalidSlug"),
                    });
                    return;
                  }
                  void run(async () => {
                    await api.post(
                      `/admin/catalog/brands/${encodeURIComponent(brandId)}/models`,
                      { name: newModel.trim() },
                    );
                    setNewModel("");
                    await loadModels(brandId);
                  }, t(locale, "modelCreated"));
                }}
              >
                <div className="flex gap-2">
                  <input
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder={t(locale, "catalogDisplayName")}
                    className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy || !modelSlug}
                    className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                  >
                    {t(locale, "add")}
                  </button>
                </div>
                {newModel.trim() ? (
                  <p className="px-1 text-[11px] text-muted">
                    {t(locale, "catalogSlugPreview", {
                      id: modelSlug || "—",
                    })}
                  </p>
                ) : null}
              </form>
              <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
                {modelsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-lg bg-input"
                    />
                  ))
                ) : filteredModels.length === 0 ? (
                  <p className="text-sm text-muted">
                    {models.length === 0
                      ? t(locale, "noModelsYet")
                      : t(locale, "catalogNoModelsFound")}
                  </p>
                ) : (
                  filteredModels.map((m) => {
                    const key = modelKeyOf(m);
                    const active = modelKey === key;
                    const editing = edit?.kind === "model" && edit.id === key;
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm ${
                          active ? "bg-primary/10" : "hover:bg-input"
                        }`}
                      >
                        {editing ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void saveModelName(key);
                              }
                              if (e.key === "Escape") setEdit(null);
                            }}
                            className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-input px-2 py-1 text-sm"
                          />
                        ) : (
                          <button
                            type="button"
                            className="min-w-0 flex-1 truncate text-left"
                            onClick={() => writeNav({ model: key })}
                          >
                            <span className="block truncate font-medium">
                              {modelLabel(m, locale)}
                              <span className="ms-2 text-xs font-normal text-muted">
                                ({Array.isArray(m.trims) ? m.trims.length : 0})
                              </span>
                            </span>
                            <span className="block truncate text-[11px] text-muted">
                              {key}
                            </span>
                          </button>
                        )}
                        <RowMenu
                          locale={locale}
                          busy={busy}
                          onEdit={() =>
                            startEdit(
                              { kind: "model", id: key },
                              m.name || key,
                            )
                          }
                          onDelete={() => setPending({ kind: "model", id: key })}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>

        <section className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
          <h2 className="font-semibold">
            {t(locale, "sellTrim")}
            {modelKey ? ` (${trims.length})` : ""}
          </h2>
          {!brandId || !modelKey ? (
            <p className="mt-4 text-sm text-muted">
              {t(locale, "catalogSelectModel")}
            </p>
          ) : (
            <>
              <input
                value={trimQuery}
                onChange={(e) => setTrimQuery(e.target.value)}
                placeholder={t(locale, "catalogSearchTrims")}
                className="mt-3 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
              />
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTrim.trim()) return;
                  void run(async () => {
                    await api.post(
                      `/admin/catalog/brands/${encodeURIComponent(brandId)}/models/${encodeURIComponent(modelKey)}/trims`,
                      { name: newTrim.trim() },
                    );
                    setNewTrim("");
                    await loadModels(brandId);
                  }, t(locale, "trimCreated"));
                }}
              >
                <input
                  value={newTrim}
                  onChange={(e) => setNewTrim(e.target.value)}
                  placeholder={t(locale, "newTrim")}
                  className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                >
                  {t(locale, "add")}
                </button>
              </form>
              <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
                {modelsLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 animate-pulse rounded-lg bg-input"
                    />
                  ))
                ) : filteredTrims.length === 0 ? (
                  <p className="text-sm text-muted">
                    {trims.length === 0
                      ? t(locale, "noTrimsYet")
                      : t(locale, "catalogNoTrimsFound")}
                  </p>
                ) : (
                  filteredTrims.map((trim) => {
                    const editing = edit?.kind === "trim" && edit.id === trim;
                    return (
                      <div
                        key={trim}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-input"
                      >
                        {editing ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                requestTrimRename(trim);
                              }
                              if (e.key === "Escape") setEdit(null);
                            }}
                            className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-input px-2 py-1 text-sm"
                          />
                        ) : (
                          <span className="min-w-0 flex-1 truncate">
                            {localizeTrimName(trim, locale)}
                          </span>
                        )}
                        <RowMenu
                          locale={locale}
                          busy={busy}
                          onEdit={() =>
                            startEdit({ kind: "trim", id: trim }, trim)
                          }
                          onDelete={() => setPending({ kind: "trim", id: trim })}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <AdminConfirmDialog
        open={Boolean(pending)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        danger={pending?.kind !== "rename-trim"}
        busy={busy}
        confirmLabel={
          pending?.kind === "rename-trim"
            ? t(locale, "save")
            : t(locale, "dashDelete")
        }
        onConfirm={() => void confirmPending()}
        onCancel={() => {
          if (!busy) setPending(null);
        }}
      />
      <AdminToast
        message={toast?.message ?? null}
        tone={toast?.tone ?? "success"}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}

function RowMenu({
  locale,
  busy,
  onEdit,
  onDelete,
}: {
  locale: Locale;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Menu>
      <MenuButton
        disabled={busy}
        aria-label={t(locale, "openMenu")}
        className="rounded-[var(--radius-control)] p-1.5 text-muted hover:bg-input hover:text-foreground disabled:opacity-50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-30 w-36 origin-top-end rounded-[var(--radius-card)] bg-card p-1 shadow-lg ring-1 ring-outline [--anchor-gap:4px]"
      >
        <MenuItem>
          <button type="button" className={MENU_ITEM} onClick={onEdit}>
            {t(locale, "edit")}
          </button>
        </MenuItem>
        <MenuItem>
          <button
            type="button"
            className={`${MENU_ITEM} text-red-600`}
            onClick={onDelete}
          >
            {t(locale, "dashDelete")}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}

export default function AdminCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded bg-input" />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-[var(--radius-card)] bg-card ring-1 ring-outline"
              />
            ))}
          </div>
        </div>
      }
    >
      <CatalogInner />
    </Suspense>
  );
}
