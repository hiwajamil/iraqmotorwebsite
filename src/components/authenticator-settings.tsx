"use client";

import { useRef, useState } from "react";
import {
  EmailAuthProvider,
  getFirebaseAuth,
  getMultiFactorResolver,
  multiFactor,
  reauthenticateWithCredential,
  TotpMultiFactorGenerator,
  type TotpSecret,
} from "@/lib/firebase";
import { api } from "@/lib/api";
import { t } from "@/lib/i18n";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { refreshMe } from "@/store/slices/authSlice";

function firebaseErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  if ("code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/auth\/[a-z0-9:-]+/i);
  return match ? match[0].toLowerCase() : null;
}

function formatFirebaseError(err: unknown): string {
  const code = firebaseErrorCode(err);
  const message = err instanceof Error ? err.message : String(err);
  return code ? `${message} (${code})` : message;
}

export function AuthenticatorSettings() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const dispatch = useAppDispatch();
  const secretRef = useRef<TotpSecret | null>(null);
  const [phase, setPhase] = useState<"idle" | "enroll" | "recovery">("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [unenrollOpen, setUnenrollOpen] = useState(false);
  const [unenrollPassword, setUnenrollPassword] = useState("");
  const [unenrollCode, setUnenrollCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  const enrolled =
    Boolean(user) &&
    multiFactor(user!).enrolledFactors.some(
      (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID,
    );

  async function reauthWithPassword(pwd: string) {
    if (!user?.email) throw new Error(t(locale, "dashNoPassword"));
    const cred = EmailAuthProvider.credential(user.email, pwd);
    await reauthenticateWithCredential(user, cred);
  }

  async function generateTotpSecret() {
    if (!user) throw new Error(t(locale, "adminMfaSignInAgain"));
    const session = await multiFactor(user).getSession();
    return TotpMultiFactorGenerator.generateSecret(session);
  }

  async function startEnroll() {
    setError(null);
    setMessage(null);
    if (!user) {
      setError(t(locale, "adminMfaSignInAgain"));
      return;
    }
    if (!password.trim()) {
      setError(t(locale, "dashAuthenticatorNeedPassword"));
      return;
    }
    setBusy(true);
    try {
      let totpSecret: TotpSecret;
      try {
        totpSecret = await generateTotpSecret();
      } catch (err) {
        const codeName = firebaseErrorCode(err);
        if (codeName === "auth/requires-recent-login") {
          await reauthWithPassword(password.trim());
          totpSecret = await generateTotpSecret();
        } else {
          console.error("[authenticator] generateSecret failed", codeName, err);
          setError(formatFirebaseError(err));
          return;
        }
      }
      secretRef.current = totpSecret;
      const otpauth = totpSecret.generateQrCodeUrl(
        user.email || "admin",
        "Iraq Motors",
      );
      setManualKey(totpSecret.secretKey);
      const qrcode = await import("qrcode");
      setQrDataUrl(await qrcode.toDataURL(otpauth, { margin: 1, width: 220 }));
      setPhase("enroll");
    } catch (err) {
      console.error("[authenticator] generateSecret failed", firebaseErrorCode(err), err);
      setError(formatFirebaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError(t(locale, "adminMfaSignInAgain"));
      return;
    }
    const secret = secretRef.current;
    if (!secret) {
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
      setPhase("recovery");
      setMessage(t(locale, "dashAuthenticatorEnrolled"));
      await dispatch(refreshMe()).unwrap();
    } catch (err) {
      console.error("[authenticator] enroll failed", firebaseErrorCode(err), err);
      setError(formatFirebaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function unenroll() {
    const current = getFirebaseAuth()?.currentUser;
    const firebaseAuth = getFirebaseAuth();
    if (!current || !firebaseAuth) {
      setError(t(locale, "adminMfaSignInAgain"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      try {
        await reauthWithPassword(unenrollPassword.trim());
      } catch (err) {
        if (firebaseErrorCode(err) !== "auth/multi-factor-auth-required") {
          throw err;
        }
        const resolver = getMultiFactorResolver(
          firebaseAuth,
          err as Parameters<typeof getMultiFactorResolver>[1],
        );
        const hint = resolver.hints.find(
          (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID,
        );
        if (!hint) throw err;
        const assertion = TotpMultiFactorGenerator.assertionForSignIn(
          hint.uid,
          unenrollCode.trim(),
        );
        await resolver.resolveSignIn(assertion);
      }
      const factor = multiFactor(current).enrolledFactors.find(
        (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID,
      );
      if (factor) {
        await multiFactor(current).unenroll(factor);
      }
      await current.getIdToken(true);
      setUnenrollOpen(false);
      setUnenrollPassword("");
      setUnenrollCode("");
      setMessage(t(locale, "dashAuthenticatorDisabled"));
      await dispatch(refreshMe()).unwrap();
    } catch (err) {
      console.error("[authenticator] unenroll failed", firebaseErrorCode(err), err);
      setError(formatFirebaseError(err));
    } finally {
      setBusy(false);
    }
  }

  if (phase === "recovery" && recoveryCodes) {
    return (
      <section className="rounded-[16px] bg-card p-6 ring-1 ring-outline">
        <h2 className="text-lg font-semibold">{t(locale, "adminMfaRecoveryTitle")}</h2>
        <p className="mt-2 text-sm text-muted">{t(locale, "adminMfaRecoveryHint")}</p>
        <ul className="mt-4 space-y-1 rounded-[12px] bg-input p-4 font-mono text-sm">
          {recoveryCodes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setPhase("idle");
            setRecoveryCodes(null);
            setQrDataUrl(null);
            setManualKey(null);
            setPassword("");
            setCode("");
          }}
          className="mt-6 rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"
        >
          {t(locale, "adminMfaRecoverySaved")}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-[16px] bg-card p-6 ring-1 ring-outline">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {t(locale, "dashAuthenticatorTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "dashAuthenticatorHint")}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            enrolled
              ? "bg-emerald-500/15 text-emerald-700"
              : "bg-input text-muted"
          }`}
        >
          {enrolled
            ? t(locale, "dashAuthenticatorOn")
            : t(locale, "dashAuthenticatorOff")}
        </span>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-emerald-600">{message}</p>
      ) : null}

      {!enrolled && phase === "idle" ? (
        <div className="mt-4 grid gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t(locale, "dashAuthenticatorReauthPassword")}
            className="rounded-[12px] bg-input px-3 py-2.5 text-sm"
          />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void startEnroll()}
              className="rounded-[12px] bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {busy ? t(locale, "pleaseWait") : t(locale, "dashAuthenticatorEnable")}
            </button>
          </div>
        </div>
      ) : null}

      {phase === "enroll" ? (
        <form onSubmit={(e) => void confirmEnroll(e)} className="mt-4 space-y-3">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={t(locale, "adminMfaQrAlt")}
              className="mx-auto h-[220px] w-[220px] rounded-lg bg-white p-2"
            />
          ) : null}
          {manualKey ? (
            <p className="break-all text-center font-mono text-xs text-muted">
              {manualKey}
            </p>
          ) : null}
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
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className="w-full rounded-[12px] bg-primary py-3 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {busy ? t(locale, "pleaseWait") : t(locale, "adminMfaVerify")}
          </button>
        </form>
      ) : null}

      {enrolled ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setUnenrollOpen((v) => !v)}
            className="rounded-[12px] bg-input px-3 py-2 text-sm font-semibold"
          >
            {t(locale, "dashAuthenticatorUnenroll")}
          </button>
          {unenrollOpen ? (
            <div className="mt-3 grid gap-3">
              <p className="text-sm text-muted">
                {t(locale, "dashAuthenticatorUnenrollHint")}
              </p>
              <input
                type="password"
                value={unenrollPassword}
                onChange={(e) => setUnenrollPassword(e.target.value)}
                placeholder={t(locale, "dashAuthenticatorReauthPassword")}
                className="rounded-[12px] bg-input px-3 py-2.5 text-sm"
              />
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={unenrollCode}
                onChange={(e) =>
                  setUnenrollCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder={t(locale, "adminMfaCodePlaceholder")}
                className="rounded-[12px] bg-input px-3 py-2.5 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUnenrollOpen(false)}
                  className="rounded-[12px] px-3 py-2 text-sm font-semibold"
                >
                  {t(locale, "dashCancel")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void unenroll()}
                  className="rounded-[12px] bg-primary px-3 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
                >
                  {busy ? t(locale, "pleaseWait") : t(locale, "dashAuthenticatorUnenroll")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
