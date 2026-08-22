"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getFirebaseAuth,
  multiFactor,
  TotpMultiFactorGenerator,
  type TotpSecret,
} from "@/lib/firebase";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

type Props = {
  onEnrolled: () => Promise<void>;
};

export function AdminMfaEnroll({ onEnrolled }: Props) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const secretRef = useRef<TotpSecret | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const startEnroll = useCallback(async () => {
    setError(null);
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!user) {
      setError(t(locale, "adminMfaSignInAgain"));
      return;
    }
    try {
      const session = await multiFactor(user).getSession();
      const totpSecret = await TotpMultiFactorGenerator.generateSecret(session);
      secretRef.current = totpSecret;
      const otpauth = totpSecret.generateQrCodeUrl(
        user.email || "admin",
        "Iraq Motors",
      );
      setManualKey(totpSecret.secretKey);
      const qrcode = await import("qrcode");
      setQrDataUrl(await qrcode.toDataURL(otpauth, { margin: 1, width: 220 }));
    } catch {
      secretRef.current = null;
      setError(t(locale, "adminMfaEnrollFailed"));
    }
  }, [locale]);

  useEffect(() => {
    void startEnroll();
  }, [startEnroll]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    const secret = secretRef.current;
    if (!user || !secret) {
      setError(t(locale, "adminMfaSignInAgain"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
        secret,
        code.trim(),
      );
      await multiFactor(user).enroll(assertion, "Authenticator");
      await user.getIdToken(true);
      const result = await api.post<{ codes: string[] }>(
        "/auth/admin/mfa/recovery",
        { action: "issue" },
      );
      setRecoveryCodes(Array.isArray(result.codes) ? result.codes : []);
    } catch {
      setError(t(locale, "adminMfaInvalidCode"));
    } finally {
      setBusy(false);
    }
  }

  if (recoveryCodes) {
    return (
      <div className="mx-auto max-w-lg px-[4%] pb-16 pt-24">
        <h1 className="text-2xl font-bold">{t(locale, "adminMfaRecoveryTitle")}</h1>
        <p className="mt-2 text-sm text-muted">
          {t(locale, "adminMfaRecoveryHint")}
        </p>
        <ul className="mt-4 space-y-1 rounded-[12px] bg-input p-4 font-mono text-sm">
          {recoveryCodes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => void onEnrolled()}
          className="mt-6 w-full rounded-[var(--radius-control)] bg-primary py-3 text-sm font-semibold text-on-primary"
        >
          {t(locale, "adminMfaRecoverySaved")}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-[4%] pb-16 pt-24">
      <h1 className="text-2xl font-bold">{t(locale, "adminMfaEnrollTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t(locale, "adminMfaEnrollHint")}</p>
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt={t(locale, "adminMfaQrAlt")}
          className="mx-auto mt-6 h-[220px] w-[220px] rounded-lg bg-white p-2"
        />
      ) : (
        <p className="mt-6 text-center text-sm text-muted">
          {t(locale, "loading")}
        </p>
      )}
      {manualKey ? (
        <p className="mt-3 break-all text-center font-mono text-xs text-muted">
          {manualKey}
        </p>
      ) : null}
      <form onSubmit={(e) => void onVerify(e)} className="mt-6 space-y-3">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder={t(locale, "adminMfaCodePlaceholder")}
          className="w-full rounded-[12px] bg-input px-4 py-3.5 text-center text-lg tracking-[0.4em] outline-none ring-1 ring-transparent focus:ring-primary"
        />
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="w-full rounded-[var(--radius-control)] bg-primary py-3 text-sm font-semibold text-on-primary disabled:opacity-60"
        >
          {busy ? t(locale, "pleaseWait") : t(locale, "adminMfaVerify")}
        </button>
      </form>
    </div>
  );
}
