"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type AdminEntry = { email: string; phone: string; name: string };

type PlatformConfig = {
  isMaintenanceMode?: boolean;
  packagePrices?: Record<string, number>;
  activeCities?: string[];
  admins?: AdminEntry[];
  r2Endpoint?: string;
  r2Bucket?: string;
  r2PublicBaseUrl?: string;
  r2Region?: string;
  r2AccessKey?: string;
  r2SecretKey?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
  [key: string]: unknown;
};

const SECRET_KEYS = new Set([
  "r2AccessKey",
  "r2SecretKey",
  "r2AccessKeyId",
  "r2SecretAccessKey",
]);

function maskSecrets(config: PlatformConfig): PlatformConfig {
  const next = { ...config };
  for (const key of SECRET_KEYS) {
    if (typeof next[key] === "string" && String(next[key]).length > 0) {
      next[key] = "••••••••";
    }
  }
  return next;
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<PlatformConfig>({});
  const [maintenance, setMaintenance] = useState(false);
  const [boost, setBoost] = useState("10000");
  const [superBoost, setSuperBoost] = useState("60000");
  const [citiesText, setCitiesText] = useState("");
  const [r2Endpoint, setR2Endpoint] = useState("");
  const [r2Bucket, setR2Bucket] = useState("");
  const [r2PublicBaseUrl, setR2PublicBaseUrl] = useState("");
  const [r2Region, setR2Region] = useState("auto");
  const [r2AccessKey, setR2AccessKey] = useState("");
  const [r2SecretKey, setR2SecretKey] = useState("");
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [advancedJson, setAdvancedJson] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function applyConfig(raw: PlatformConfig | null) {
    const cfg = raw ?? {};
    setConfig(cfg);
    setMaintenance(cfg.isMaintenanceMode === true);
    const prices = cfg.packagePrices ?? {};
    setBoost(
      String(
        prices.package_boost ??
          prices.packageBoost ??
          prices.boost ??
          10000,
      ),
    );
    setSuperBoost(
      String(
        prices.package_super_boost ??
          prices.packageSuperBoost ??
          prices.superBoost ??
          60000,
      ),
    );
    setCitiesText((cfg.activeCities ?? []).join("\n"));
    setAdmins(
      Array.isArray(cfg.admins)
        ? cfg.admins.map((a) => ({
            email: String(a.email ?? ""),
            phone: String(a.phone ?? ""),
            name: String(a.name ?? ""),
          }))
        : [],
    );
    setR2Endpoint(String(cfg.r2Endpoint ?? ""));
    setR2Bucket(String(cfg.r2Bucket ?? ""));
    setR2PublicBaseUrl(String(cfg.r2PublicBaseUrl ?? ""));
    setR2Region(String(cfg.r2Region ?? "auto"));
    setR2AccessKey("");
    setR2SecretKey("");
    setAdvancedJson(JSON.stringify(maskSecrets(cfg), null, 2));
  }

  useEffect(() => {
    void api
      .get<{ config: PlatformConfig | null }>("/admin/settings")
      .then((d) => applyConfig(d.config))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  const cityCount = useMemo(
    () =>
      citiesText
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean).length,
    [citiesText],
  );

  async function saveStructured() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const packagePrices = {
        ...(config.packagePrices ?? {}),
        package_boost: Number(boost) || 0,
        package_super_boost: Number(superBoost) || 0,
        // Keep legacy keys in sync for older clients.
        packageBoost: Number(boost) || 0,
        packageSuperBoost: Number(superBoost) || 0,
      };
      const activeCities = citiesText
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean);

      const patch: PlatformConfig = {
        isMaintenanceMode: maintenance,
        packagePrices,
        activeCities,
        admins: admins.filter((a) => a.email.trim() || a.phone.trim()),
        r2Endpoint: r2Endpoint.trim(),
        r2Bucket: r2Bucket.trim(),
        r2PublicBaseUrl: r2PublicBaseUrl.trim(),
        r2Region: r2Region.trim() || "auto",
      };

      if (r2AccessKey.trim() && r2AccessKey !== "••••••••") {
        patch.r2AccessKey = r2AccessKey.trim();
        patch.r2AccessKeyId = r2AccessKey.trim();
      }
      if (r2SecretKey.trim() && r2SecretKey !== "••••••••") {
        patch.r2SecretKey = r2SecretKey.trim();
        patch.r2SecretAccessKey = r2SecretKey.trim();
      }

      const res = await api.patch<{ config: PlatformConfig }>(
        "/admin/settings",
        patch,
      );
      applyConfig(res.config);
      setMessage("Settings saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveAdvanced() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const parsed = JSON.parse(advancedJson) as PlatformConfig;
      // Don't overwrite secrets with masked placeholders.
      for (const key of SECRET_KEYS) {
        if (parsed[key] === "••••••••") delete parsed[key];
      }
      const res = await api.patch<{ config: PlatformConfig }>(
        "/admin/settings",
        parsed,
      );
      applyConfig(res.config);
      setMessage("Advanced JSON saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON / save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Platform config stored in `system_config/platform`
        </p>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-primary">{message}</p> : null}

      <section className="mt-8 space-y-4 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline">
        <h2 className="text-lg font-semibold">General</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={maintenance}
            onChange={(e) => setMaintenance(e.target.checked)}
          />
          Maintenance mode
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted">
            Boost package price
            <input
              value={boost}
              onChange={(e) => setBoost(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Super boost package price
            <input
              value={superBoost}
              onChange={(e) => setSuperBoost(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline">
        <h2 className="text-lg font-semibold">
          Active cities{" "}
          <span className="text-sm font-normal text-muted">({cityCount})</span>
        </h2>
        <p className="text-xs text-muted">One city / governorate per line</p>
        <textarea
          value={citiesText}
          onChange={(e) => setCitiesText(e.target.value)}
          rows={8}
          className="w-full rounded-[var(--radius-control)] bg-input p-3 text-sm"
        />
      </section>

      <section className="mt-6 space-y-3 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Admin accounts</h2>
          <button
            type="button"
            className="text-xs font-semibold text-primary"
            onClick={() =>
              setAdmins((list) => [...list, { email: "", phone: "", name: "" }])
            }
          >
            + Add
          </button>
        </div>
        <p className="text-xs text-muted">
          Stored in platform config for reference. Super-admin access still
          comes from `SUPER_ADMIN_EMAILS` on the API.
        </p>
        <div className="space-y-3">
          {admins.length === 0 ? (
            <p className="text-sm text-muted">No admin entries yet.</p>
          ) : (
            admins.map((admin, index) => (
              <div
                key={`admin-${index}`}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <input
                  value={admin.name}
                  onChange={(e) =>
                    setAdmins((list) =>
                      list.map((a, i) =>
                        i === index ? { ...a, name: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder="Name"
                  className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <input
                  value={admin.email}
                  onChange={(e) =>
                    setAdmins((list) =>
                      list.map((a, i) =>
                        i === index ? { ...a, email: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder="Email"
                  className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <input
                  value={admin.phone}
                  onChange={(e) =>
                    setAdmins((list) =>
                      list.map((a, i) =>
                        i === index ? { ...a, phone: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder="Phone"
                  className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  className="text-xs font-semibold text-red-600"
                  onClick={() =>
                    setAdmins((list) => list.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline">
        <h2 className="text-lg font-semibold">R2 storage</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted sm:col-span-2">
            Endpoint
            <input
              value={r2Endpoint}
              onChange={(e) => setR2Endpoint(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Bucket
            <input
              value={r2Bucket}
              onChange={(e) => setR2Bucket(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Region
            <input
              value={r2Region}
              onChange={(e) => setR2Region(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted sm:col-span-2">
            Public base URL
            <input
              value={r2PublicBaseUrl}
              onChange={(e) => setR2PublicBaseUrl(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Access key (leave blank to keep)
            <input
              type="password"
              value={r2AccessKey}
              onChange={(e) => setR2AccessKey(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            Secret key (leave blank to keep)
            <input
              type="password"
              value={r2SecretKey}
              onChange={(e) => setR2SecretKey(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={() => void saveStructured()}
        className="mt-6 rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>

      <div className="mt-10">
        <button
          type="button"
          className="text-sm font-semibold text-primary"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "Hide" : "Show"} advanced JSON
        </button>
        {showAdvanced ? (
          <div className="mt-4">
            <textarea
              value={advancedJson}
              onChange={(e) => setAdvancedJson(e.target.value)}
              rows={16}
              className="w-full rounded-[var(--radius-card)] bg-card p-4 font-mono text-xs ring-1 ring-outline"
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAdvanced()}
              className="mt-3 rounded-[var(--radius-control)] bg-input px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Save JSON
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
