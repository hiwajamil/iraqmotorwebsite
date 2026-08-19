"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { AdminToast } from "@/components/admin-toast";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

type AdminEntry = { email: string; phone: string; name: string };

type R2Status = {
  configured?: boolean;
  bucket?: string;
  publicBaseUrl?: string;
  endpoint?: string;
  region?: string;
};

type PlatformConfig = {
  isMaintenanceMode?: boolean;
  packagePrices?: {
    package_boost?: number;
    package_super_boost?: number;
  };
  activeCities?: string[];
  admins?: AdminEntry[];
  r2?: R2Status;
  superAdminEmails?: string[];
};

type Toast = { message: string; tone: "success" | "error" };

export default function AdminSettingsPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [loadedMaintenance, setLoadedMaintenance] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [boost, setBoost] = useState("10000");
  const [superBoost, setSuperBoost] = useState("60000");
  const [citiesText, setCitiesText] = useState("");
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [superAdminEmails, setSuperAdminEmails] = useState<string[]>([]);
  const [r2, setR2] = useState<R2Status>({});
  const [safeJson, setSafeJson] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function applyConfig(raw: PlatformConfig | null) {
    const cfg = raw ?? {};
    const on = cfg.isMaintenanceMode === true;
    setLoadedMaintenance(on);
    setMaintenance(on);
    const prices = cfg.packagePrices ?? {};
    setBoost(String(prices.package_boost ?? 10000));
    setSuperBoost(String(prices.package_super_boost ?? 60000));
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
    setSuperAdminEmails(
      Array.isArray(cfg.superAdminEmails)
        ? cfg.superAdminEmails.map((e) => String(e))
        : [],
    );
    setR2(cfg.r2 && typeof cfg.r2 === "object" ? cfg.r2 : {});
    setSafeJson(JSON.stringify(cfg, null, 2));
  }

  useEffect(() => {
    void api
      .get<{ config: PlatformConfig | null }>("/admin/settings")
      .then((d) => applyConfig(d.config))
      .catch((e) =>
        setError(e instanceof Error ? e.message : t(locale, "failedGeneric")),
      );
  }, [locale]);

  const cityCount = useMemo(
    () =>
      citiesText
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean).length,
    [citiesText],
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch<{ config: PlatformConfig }>(
        "/admin/settings",
        {
          isMaintenanceMode: maintenance,
          packagePrices: {
            package_boost: Number(boost) || 0,
            package_super_boost: Number(superBoost) || 0,
          },
          activeCities: citiesText
            .split("\n")
            .map((c) => c.trim())
            .filter(Boolean),
          admins: admins.filter((a) => a.email.trim() || a.phone.trim()),
        },
      );
      applyConfig(res.config);
      setToast({ message: t(locale, "settingsSaved"), tone: "success" });
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "saveFailed"));
      setToast({
        message: e instanceof Error ? e.message : t(locale, "saveFailed"),
        tone: "error",
      });
    } finally {
      setSaving(false);
      setConfirmMaintenance(false);
    }
  }

  function requestSave() {
    if (maintenance && !loadedMaintenance) {
      setConfirmMaintenance(true);
      return;
    }
    void save();
  }

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold">{t(locale, "adminSettingsTitle")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(locale, "adminSettingsSubtitle")}
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-8 space-y-4 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline">
        <h2 className="text-lg font-semibold">{t(locale, "settingsGeneral")}</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={maintenance}
            disabled={saving}
            onChange={(e) => setMaintenance(e.target.checked)}
          />
          {t(locale, "maintenanceMode")}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted">
            {t(locale, "boostPackagePrice")}
            <span className="ms-1 font-normal">({t(locale, "priceIqd")})</span>
            <input
              type="number"
              min={0}
              step={1}
              value={boost}
              disabled={saving}
              onChange={(e) => setBoost(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs font-semibold text-muted">
            {t(locale, "superBoostPackagePrice")}
            <span className="ms-1 font-normal">({t(locale, "priceIqd")})</span>
            <input
              type="number"
              min={0}
              step={1}
              value={superBoost}
              disabled={saving}
              onChange={(e) => setSuperBoost(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline">
        <h2 className="text-lg font-semibold">
          {t(locale, "activeCities")}{" "}
          <span className="text-sm font-normal text-muted">({cityCount})</span>
        </h2>
        <p className="text-xs text-muted">{t(locale, "activeCitiesHint")}</p>
        <p className="text-xs text-muted">
          {t(locale, "activeCitiesEnglishHint")}
        </p>
        <textarea
          value={citiesText}
          disabled={saving}
          onChange={(e) => setCitiesText(e.target.value)}
          rows={8}
          className="w-full rounded-[var(--radius-control)] bg-input p-3 text-sm"
        />
      </section>

      <section className="mt-6 space-y-3 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline">
        <h2 className="text-lg font-semibold">{t(locale, "adminApiAccess")}</h2>
        <p className="text-xs text-muted">{t(locale, "adminApiAccessHint")}</p>
        {superAdminEmails.length === 0 ? (
          <p className="text-sm text-muted">{t(locale, "noAdminEntries")}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {superAdminEmails.map((email) => (
              <li
                key={email}
                className="rounded-[var(--radius-control)] bg-input px-3 py-2 font-mono text-xs"
              >
                {email}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 space-y-3 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {t(locale, "adminDirectoryLabel")}
          </h2>
          <button
            type="button"
            disabled={saving}
            className="text-xs font-semibold text-primary disabled:opacity-50"
            onClick={() =>
              setAdmins((list) => [...list, { email: "", phone: "", name: "" }])
            }
          >
            {t(locale, "addAdmin")}
          </button>
        </div>
        <p className="text-xs text-muted">{t(locale, "adminAccountsHint")}</p>
        <div className="space-y-3">
          {admins.length === 0 ? (
            <p className="text-sm text-muted">{t(locale, "noAdminEntries")}</p>
          ) : (
            admins.map((admin, index) => (
              <div
                key={`admin-${index}`}
                className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <input
                  value={admin.name}
                  disabled={saving}
                  onChange={(e) =>
                    setAdmins((list) =>
                      list.map((a, i) =>
                        i === index ? { ...a, name: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder={t(locale, "placeholderName")}
                  className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <input
                  value={admin.email}
                  disabled={saving}
                  onChange={(e) =>
                    setAdmins((list) =>
                      list.map((a, i) =>
                        i === index ? { ...a, email: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder={t(locale, "placeholderEmail")}
                  className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <input
                  value={admin.phone}
                  disabled={saving}
                  onChange={(e) =>
                    setAdmins((list) =>
                      list.map((a, i) =>
                        i === index ? { ...a, phone: e.target.value } : a,
                      ),
                    )
                  }
                  placeholder={t(locale, "placeholderPhone")}
                  className="rounded-[var(--radius-control)] bg-input px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={saving}
                  className="text-xs font-semibold text-red-600 disabled:opacity-50"
                  onClick={() =>
                    setAdmins((list) => list.filter((_, i) => i !== index))
                  }
                >
                  {t(locale, "remove")}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-[var(--radius-card)] bg-card p-5 ring-1 ring-outline">
        <h2 className="text-lg font-semibold">{t(locale, "r2Storage")}</h2>
        <p className="text-sm">
          {r2.configured
            ? t(locale, "r2Configured")
            : t(locale, "r2NotConfigured")}
        </p>
        <p className="text-xs text-muted">{t(locale, "r2EnvHint")}</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {r2.bucket ? (
            <div>
              <dt className="text-xs font-semibold text-muted">
                {t(locale, "r2Bucket")}
              </dt>
              <dd className="font-mono text-xs">{r2.bucket}</dd>
            </div>
          ) : null}
          {r2.region ? (
            <div>
              <dt className="text-xs font-semibold text-muted">
                {t(locale, "r2Region")}
              </dt>
              <dd className="font-mono text-xs">{r2.region}</dd>
            </div>
          ) : null}
          {r2.endpoint ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-muted">
                {t(locale, "r2Endpoint")}
              </dt>
              <dd className="break-all font-mono text-xs">{r2.endpoint}</dd>
            </div>
          ) : null}
          {r2.publicBaseUrl ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-muted">
                {t(locale, "r2PublicBaseUrl")}
              </dt>
              <dd className="break-all font-mono text-xs">{r2.publicBaseUrl}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={requestSave}
        className="mt-6 rounded-[var(--radius-control)] bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50"
      >
        {saving ? t(locale, "saving") : t(locale, "saveSettings")}
      </button>

      <div className="mt-10">
        <button
          type="button"
          className="text-sm font-semibold text-primary"
          onClick={() => setShowJson((v) => !v)}
        >
          {showJson
            ? t(locale, "hideAdvancedJson")
            : t(locale, "settingsJsonReadonly")}
        </button>
        {showJson ? (
          <pre className="mt-4 overflow-auto rounded-[var(--radius-card)] bg-card p-4 font-mono text-xs ring-1 ring-outline">
            {safeJson}
          </pre>
        ) : null}
      </div>

      <AdminConfirmDialog
        open={confirmMaintenance}
        title={t(locale, "maintenanceConfirmTitle")}
        description={t(locale, "maintenanceConfirmBody")}
        danger
        busy={saving}
        onConfirm={() => void save()}
        onCancel={() => {
          if (!saving) setConfirmMaintenance(false);
        }}
      />
      <AdminToast
        message={toast?.message ?? null}
        tone={toast?.tone}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
