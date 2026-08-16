"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api, type UserPreferences } from "@/lib/api";
import { IRAQ_PROVINCE_ORDER, localizeProvince } from "@/lib/iraq-locations";
import {
  EmailAuthProvider,
  getFirebaseAuth,
  reauthenticateWithCredential,
  updatePassword,
} from "@/lib/firebase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { refreshMe } from "@/store/slices/authSlice";
import { t } from "@/lib/i18n";

export default function DashboardSettingsPage() {
  const { user, me, signOut } = useAuth();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((s) => s.preferences.locale);
  const profile = (me?.profile ?? {}) as Record<string, unknown>;
  const isShowroom = profile.accountType === "showroom";

  const [displayName, setDisplayName] = useState("");
  const [showroomName, setShowroomName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity] = useState("");
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [newMatchAlerts, setNewMatchAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const hasPassword = useMemo(() => {
    const auth = getFirebaseAuth()?.currentUser;
    return Boolean(
      auth?.providerData.some((p) => p.providerId === "password"),
    );
  }, [user]);

  useEffect(() => {
    setDisplayName(String(profile.displayName ?? ""));
    setShowroomName(String(profile.showroomName ?? ""));
    setOwnerName(String(profile.ownerName ?? ""));
    setCity(String(profile.city ?? ""));
    const prefs = (me?.preferences ??
      (profile.preferences as UserPreferences | undefined) ??
      {}) as UserPreferences;
    setPriceAlerts(prefs.priceAlerts !== false);
    setNewMatchAlerts(prefs.newMatchAlerts !== false);
  }, [me, profile.displayName, profile.showroomName, profile.ownerName, profile.city, profile.preferences]);

  async function saveProfile() {
    if (!displayName.trim()) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.patch("/users/me", {
        displayName: displayName.trim(),
        city: city || undefined,
        showroomName: isShowroom ? showroomName.trim() : undefined,
        ownerName: isShowroom ? ownerName.trim() : undefined,
        preferences: { priceAlerts, newMatchAlerts },
      });
      await dispatch(refreshMe()).unwrap();
      setMessage(t(locale, "dashProfileSaved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "dashFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      setError(t(locale, "dashPasswordMismatch"));
      return;
    }
    const authUser = getFirebaseAuth()?.currentUser;
    const email = authUser?.email;
    if (!authUser || !email) {
      setError(t(locale, "dashNoPassword"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const cred = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(authUser, cred);
      await updatePassword(authUser, newPassword);
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(t(locale, "dashPasswordUpdated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "dashFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t(locale, "dashSettings")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t(locale, "dashSubtitle")}</p>
      </div>

      {error ? (
        <p className="text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-emerald-600">{message}</p> : null}

      <section className="rounded-[16px] bg-card p-6 ring-1 ring-outline">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-input text-lg font-bold">
            {(displayName || "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="font-bold">{displayName || t(locale, "dashboard")}</p>
            <p className="text-sm text-muted">
              {isShowroom
                ? t(locale, "dashShowroomAccount")
                : t(locale, "dashPersonalAccount")}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[16px] bg-card p-6 ring-1 ring-outline">
        <h2 className="text-lg font-semibold">{t(locale, "dashProfileInfo")}</h2>
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-medium">
            {t(locale, "dashDisplayName")}
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-[12px] bg-input px-3 py-2.5 text-sm"
            />
          </label>
          {isShowroom ? (
            <>
              <label className="block text-sm font-medium">
                {t(locale, "dashShowroomName")}
                <input
                  value={showroomName}
                  onChange={(e) => setShowroomName(e.target.value)}
                  className="mt-1 w-full rounded-[12px] bg-input px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                {t(locale, "dashOwnerName")}
                <input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="mt-1 w-full rounded-[12px] bg-input px-3 py-2.5 text-sm"
                />
              </label>
            </>
          ) : null}
          <label className="block text-sm font-medium">
            {t(locale, "dashSelectCity")}
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-[12px] bg-input px-3 py-2.5 text-sm"
            >
              <option value="">{t(locale, "dashSelectCity")}</option>
              {IRAQ_PROVINCE_ORDER.map((province) => (
                <option key={province} value={province}>
                  {localizeProvince(locale, province)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveProfile()}
              className="rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {saving ? "…" : t(locale, "dashSaveProfile")}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[16px] bg-card p-6 ring-1 ring-outline">
        <h2 className="text-lg font-semibold">{t(locale, "dashSecurity")}</h2>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{t(locale, "dashPassword")}</p>
            <p className="text-sm text-muted">{t(locale, "dashPasswordHint")}</p>
          </div>
          {hasPassword ? (
            <button
              type="button"
              onClick={() => setPasswordOpen((v) => !v)}
              className="rounded-[12px] bg-input px-3 py-2 text-sm font-semibold"
            >
              {t(locale, "dashChangePassword")}
            </button>
          ) : (
            <p className="text-xs text-muted">{t(locale, "dashNoPassword")}</p>
          )}
        </div>

        {passwordOpen ? (
          <div className="mt-4 grid gap-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t(locale, "dashCurrentPassword")}
              className="rounded-[12px] bg-input px-3 py-2.5 text-sm"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t(locale, "dashNewPassword")}
              className="rounded-[12px] bg-input px-3 py-2.5 text-sm"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t(locale, "dashConfirmPassword")}
              className="rounded-[12px] bg-input px-3 py-2.5 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="rounded-[12px] px-3 py-2 text-sm font-semibold"
              >
                {t(locale, "dashCancel")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void changePassword()}
                className="rounded-[12px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
              >
                {t(locale, "dashUpdatePassword")}
              </button>
            </div>
          </div>
        ) : null}

        <label className="mt-6 flex cursor-pointer items-start justify-between gap-4 border-t border-outline pt-4">
          <span>
            <span className="block font-medium">{t(locale, "dashPriceAlerts")}</span>
            <span className="text-sm text-muted">
              {t(locale, "dashPriceAlertsHint")}
            </span>
          </span>
          <input
            type="checkbox"
            checked={priceAlerts}
            onChange={(e) => {
              setPriceAlerts(e.target.checked);
              void api.patch("/users/me", {
                preferences: {
                  priceAlerts: e.target.checked,
                  newMatchAlerts,
                },
              });
            }}
            className="mt-1 h-4 w-4"
          />
        </label>
        <label className="mt-4 flex cursor-pointer items-start justify-between gap-4">
          <span>
            <span className="block font-medium">{t(locale, "dashMatchAlerts")}</span>
            <span className="text-sm text-muted">
              {t(locale, "dashMatchAlertsHint")}
            </span>
          </span>
          <input
            type="checkbox"
            checked={newMatchAlerts}
            onChange={(e) => {
              setNewMatchAlerts(e.target.checked);
              void api.patch("/users/me", {
                preferences: {
                  priceAlerts,
                  newMatchAlerts: e.target.checked,
                },
              });
            }}
            className="mt-1 h-4 w-4"
          />
        </label>
      </section>

      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-[12px] px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/10 lg:hidden"
      >
        {t(locale, "signOut")}
      </button>
    </div>
  );
}
