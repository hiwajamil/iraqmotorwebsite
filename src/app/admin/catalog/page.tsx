"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Brand = { id: string; name?: string };
type Model = { id: string; key?: string; name?: string; trims?: string[] };

export default function AdminCatalogPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [modelKey, setModelKey] = useState<string | null>(null);
  const [brandQuery, setBrandQuery] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newTrim, setNewTrim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadBrands() {
    const d = await api.get<{ items: Brand[] }>("/catalog/brands");
    setBrands(d.items ?? []);
  }

  async function loadModels(id: string) {
    const d = await api.get<{ items: Model[] }>(
      `/catalog/brands/${encodeURIComponent(id)}/models`,
    );
    setModels(d.items ?? []);
  }

  useEffect(() => {
    void loadBrands().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load brands"),
    );
  }, []);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setModelKey(null);
      return;
    }
    void loadModels(brandId).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load models"),
    );
  }, [brandId]);

  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) =>
      [b.id, b.name].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [brands, brandQuery]);

  const selectedModel = models.find(
    (m) => String(m.key ?? m.id ?? m.name) === modelKey,
  );
  const trims = Array.isArray(selectedModel?.trims)
    ? selectedModel!.trims!
    : [];

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

  function promptRename(title: string, current: string): string | null {
    const next = window.prompt(title, current);
    if (next == null) return null;
    const trimmed = next.trim();
    if (!trimmed || trimmed === current) return null;
    return trimmed;
  }

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">Catalog</h1>
        <p className="mt-1 text-sm text-muted">
          Create, rename, and delete brands, models, and trims
        </p>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-primary">{message}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
          <h2 className="font-semibold">Brands ({brands.length})</h2>
          <input
            value={brandQuery}
            onChange={(e) => setBrandQuery(e.target.value)}
            placeholder="Search brands"
            className="mt-3 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
          />
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newBrand.trim()) return;
              void run(async () => {
                await api.post("/admin/catalog/brands", {
                  id: newBrand.trim(),
                });
                setNewBrand("");
                await loadBrands();
              }, "Brand created");
            }}
          >
            <input
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="New brand id"
              className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
            >
              Add
            </button>
          </form>
          <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            {filteredBrands.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted">
                No brands found.
              </p>
            ) : (
              filteredBrands.map((b) => (
                <div
                  key={b.id}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm ${
                    brandId === b.id ? "bg-primary/10" : "hover:bg-input"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left font-medium"
                    onClick={() => {
                      setBrandId(b.id);
                      setModelKey(null);
                    }}
                  >
                    {b.name || b.id}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs font-semibold text-muted hover:text-foreground disabled:opacity-50"
                    onClick={() => {
                      const next = promptRename(`Rename brand ${b.id}`, b.id);
                      if (!next) return;
                      void run(async () => {
                        await api.patch(
                          `/admin/catalog/brands/${encodeURIComponent(b.id)}`,
                          { newId: next },
                        );
                        if (brandId === b.id) {
                          setBrandId(next);
                          setModelKey(null);
                        }
                        await loadBrands();
                      }, "Brand renamed");
                    }}
                  >
                    Ren
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="text-xs font-semibold text-red-600 disabled:opacity-50"
                    onClick={() => {
                      if (!window.confirm(`Delete brand ${b.id}?`)) return;
                      void run(async () => {
                        await api.delete(
                          `/admin/catalog/brands/${encodeURIComponent(b.id)}`,
                        );
                        if (brandId === b.id) {
                          setBrandId(null);
                          setModelKey(null);
                        }
                        await loadBrands();
                      }, "Brand deleted");
                    }}
                  >
                    Del
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] bg-card p-4 ring-1 ring-outline">
          <h2 className="font-semibold">
            Models {brandId ? `(${brandId})` : ""}
          </h2>
          {!brandId ? (
            <p className="mt-4 text-sm text-muted">Select a brand.</p>
          ) : (
            <>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newModel.trim()) return;
                  void run(async () => {
                    await api.post(
                      `/admin/catalog/brands/${encodeURIComponent(brandId)}/models`,
                      { name: newModel.trim() },
                    );
                    setNewModel("");
                    await loadModels(brandId);
                  }, "Model created");
                }}
              >
                <input
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="New model name"
                  className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                >
                  Add
                </button>
              </form>
              <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
                {models.length === 0 ? (
                  <p className="text-sm text-muted">No models yet. Add one above.</p>
                ) : (
                  models.map((m) => {
                    const key = String(m.key ?? m.id ?? m.name);
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm ${
                          modelKey === key ? "bg-primary/10" : "hover:bg-input"
                        }`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 truncate text-left font-medium"
                          onClick={() => setModelKey(key)}
                        >
                          {m.name || key}
                          <span className="ml-2 text-xs text-muted">
                            ({Array.isArray(m.trims) ? m.trims.length : 0})
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold text-muted hover:text-foreground disabled:opacity-50"
                          onClick={() => {
                            const next = promptRename(
                              `Rename model ${key}`,
                              key,
                            );
                            if (!next) return;
                            void run(async () => {
                              await api.patch(
                                `/admin/catalog/brands/${encodeURIComponent(brandId)}/models/${encodeURIComponent(key)}`,
                                { newName: next },
                              );
                              if (modelKey === key) setModelKey(next);
                              await loadModels(brandId);
                            }, "Model renamed");
                          }}
                        >
                          Ren
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs font-semibold text-red-600 disabled:opacity-50"
                          onClick={() => {
                            if (!window.confirm(`Delete model ${key}?`)) return;
                            void run(async () => {
                              await api.delete(
                                `/admin/catalog/brands/${encodeURIComponent(brandId)}/models/${encodeURIComponent(key)}`,
                              );
                              if (modelKey === key) setModelKey(null);
                              await loadModels(brandId);
                            }, "Model deleted");
                          }}
                        >
                          Del
                        </button>
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
            Trims {modelKey ? `(${modelKey})` : ""}
          </h2>
          {!brandId || !modelKey ? (
            <p className="mt-4 text-sm text-muted">Select a model.</p>
          ) : (
            <>
              <form
                className="mt-3 flex gap-2"
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
                  }, "Trim created");
                }}
              >
                <input
                  value={newTrim}
                  onChange={(e) => setNewTrim(e.target.value)}
                  placeholder="New trim"
                  className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
                >
                  Add
                </button>
              </form>
              <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
                {trims.length === 0 ? (
                  <p className="text-sm text-muted">No trims yet. Add one above.</p>
                ) : (
                  trims.map((trim) => (
                    <div
                      key={trim}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-input"
                    >
                      <span className="min-w-0 flex-1 truncate">{trim}</span>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs font-semibold text-muted hover:text-foreground disabled:opacity-50"
                        onClick={() => {
                          const next = promptRename(`Rename trim ${trim}`, trim);
                          if (!next) return;
                          void run(async () => {
                            await api.patch(
                              `/admin/catalog/brands/${encodeURIComponent(brandId)}/models/${encodeURIComponent(modelKey)}/trims/${encodeURIComponent(trim)}`,
                              { newName: next },
                            );
                            await loadModels(brandId);
                          }, "Trim renamed");
                        }}
                      >
                        Ren
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs font-semibold text-red-600 disabled:opacity-50"
                        onClick={() => {
                          if (!window.confirm(`Delete trim ${trim}?`)) return;
                          void run(async () => {
                            await api.delete(
                              `/admin/catalog/brands/${encodeURIComponent(brandId)}/models/${encodeURIComponent(modelKey)}/trims/${encodeURIComponent(trim)}`,
                            );
                            await loadModels(brandId);
                          }, "Trim deleted");
                        }}
                      >
                        Del
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
