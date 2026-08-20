"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IraqMotorsWordmark } from "@/components/iraq-motors-wordmark";
import {
  getFirebaseAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendPhoneSmsCode,
  toIraqE164,
  signOut,
  ensurePhoneAuthRecaptcha,
  clearPhoneRecaptchaVerifier,
  EmailAuthProvider,
  linkWithCredential,
  RECAPTCHA_CONTAINER_ID,
  type ConfirmationResult,
  type User,
} from "@/lib/firebase";
import { api, ApiError } from "@/lib/api";
import {
  TurnstileWidget,
  isTurnstileEnabled,
} from "@/components/turnstile-widget";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/components/auth-provider";
import { LoadingFallback } from "@/components/loading-fallback";
import { t, type Locale } from "@/lib/i18n";
import { IRAQ_PROVINCE_ORDER, localizeProvince } from "@/lib/iraq-locations";
import { useAppSelector } from "@/store/hooks";

const MIN_PASSWORD_LENGTH = 6;

type ResetPhase = "idle" | "otp";
type RegisterStep = "phone" | "otp" | "details";

function cleanPhoneInput(raw: string): string {
  return raw.trim().replace(/[\s-]/g, "");
}

function normalizeIraqPhone(raw: string): string {
  let digits = cleanPhoneInput(raw).replace(/\D/g, "");
  if (digits.startsWith("964")) {
    let local = digits.slice(3);
    if (local.startsWith("0")) local = local.slice(1);
    return `964${local}`;
  }
  if (digits.startsWith("0") && digits.length >= 10) {
    return `964${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("7")) {
    return `964${digits}`;
  }
  return digits;
}

/** Firebase Auth identity for phone+password accounts (matches Flutter). */
function phoneToAuthEmail(phone: string): string {
  return `${normalizeIraqPhone(phone)}@iqmotors.app`;
}

function isValidIraqMobile(phone: string): boolean {
  return /^9647\d{9}$/.test(normalizeIraqPhone(phone));
}

function isCredentialError(err: unknown): boolean {
  const code = firebaseErrorCode(err);
  return (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found"
  );
}

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function firebaseErrorCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  if ("code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/auth\/[a-z0-9-]+/i);
  return match ? match[0].toLowerCase() : null;
}

function mapAuthError(err: unknown, locale: Locale): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return t(locale, "botCheckFailed");
    if (err.status === 409) return t(locale, "authPhoneInUse");
    if (err.status === 429) return t(locale, "authTooManyRequests");
    if (
      err.status === 400 &&
      /session expired|new code/i.test(err.message)
    ) {
      return t(locale, "authResetSessionExpired");
    }
    return err.message || t(locale, "authRequestFailed", { status: err.status });
  }

  const code = firebaseErrorCode(err);
  let message: string | null = null;
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      message = t(locale, "authInvalidCredentials");
      break;
    case "auth/email-already-in-use":
    case "auth/credential-already-in-use":
    case "auth/provider-already-linked":
      message = t(locale, "authPhoneInUse");
      break;
    case "auth/weak-password":
      message = t(locale, "authWeakPassword");
      break;
    case "auth/too-many-requests":
      message = t(locale, "authTooManyRequests");
      break;
    case "auth/quota-exceeded":
      message = t(locale, "authPhoneSmsQuotaExceeded");
      break;
    case "auth/operation-not-allowed":
      message = t(locale, "authPhoneSmsNotAllowed");
      break;
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      message = t(locale, "authInvalidIraqPhone");
      break;
    case "auth/captcha-check-failed":
    case "auth/missing-recaptcha-token":
      message = t(locale, "authPhoneSmsCaptchaFailed");
      break;
    case "auth/invalid-email":
      message = t(locale, "helpInvalidEmail");
      break;
    case "auth/invalid-verification-code":
    case "auth/code-expired":
    case "auth/invalid-verification-id":
      message = t(locale, "authInvalidOtp");
      break;
    case "auth/internal-error":
    case "auth/argument-error":
    case "auth/missing-client-identifier":
      message = t(locale, "authPhoneSmsFailed");
      break;
    case "auth/network-request-failed":
      message = t(locale, "authNetworkError");
      break;
    default:
      message = err instanceof Error ? err.message : t(locale, "authFailed");
      break;
  }

  if (
    process.env.NODE_ENV === "development" &&
    code &&
    message &&
    !message.includes(code)
  ) {
    return `${message} (${code})`;
  }
  return message;
}

async function signInWithPhonePassword(
  auth: NonNullable<ReturnType<typeof getFirebaseAuth>>,
  phone: string,
  password: string,
) {
  await signInWithEmailAndPassword(auth, phoneToAuthEmail(phone), password);
}

async function linkPhonePasswordIfNeeded(
  user: User,
  phone: string,
  password: string,
) {
  const hasPasswordProvider = user.providerData.some(
    (info) => info.providerId === "password",
  );
  if (hasPasswordProvider) return;
  await linkWithCredential(
    user,
    EmailAuthProvider.credential(phoneToAuthEmail(phone), password),
  );
}

const fieldClass =
  "w-full rounded-[12px] bg-input px-4 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-primary";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const { user, me, loading, refreshMe } = useAuth();
  const locale = useAppSelector((s) => s.preferences.locale);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("phone");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showroomName, setShowroomName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "showroom">(
    "individual",
  );
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const [resetPhase, setResetPhase] = useState<ResetPhase>("idle");
  const [resetSessionId, setResetSessionId] = useState<string | null>(null);
  const [resetPhone, setResetPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const verifiedRegisterPhoneRef = useRef<string | null>(null);

  const registerInProgress =
    mode === "register" &&
    (registerStep === "phone" ||
      registerStep === "otp" ||
      registerStep === "details");

  useEffect(() => {
    if (loading || !user || !me) return;
    // During phone OTP reset / register we briefly hold a phone session — stay.
    if (resetPhase !== "idle") return;
    if (registerInProgress) return;
    if (me.isSuperAdmin) {
      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      return;
    }
    router.replace(nextPath);
  }, [loading, user, me, nextPath, router, resetPhase, registerInProgress]);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    void ensurePhoneAuthRecaptcha(auth).catch(() => {
      // surfaced when user actually starts SMS
    });
  }, []);

  async function redirectAfterAuth() {
    await refreshMe();
    const session = await api.get<{ isSuperAdmin?: boolean }>("/users/me");
    if (session.isSuperAdmin) {
      router.push(nextPath.startsWith("/admin") ? nextPath : "/admin");
    } else {
      router.push(nextPath);
    }
  }

  async function assertHuman(action: "login" | "register") {
    if (!isTurnstileEnabled()) return;
    if (!turnstileToken) {
      throw new Error(t(locale, "botCheckFailed"));
    }
    await api.post("/auth/bot-check", {
      turnstileToken,
      action,
    });
  }

  function resetForgotState() {
    setResetPhase("idle");
    setResetSessionId(null);
    setResetPhone("");
    setOtpCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    confirmationRef.current = null;
  }

  function resetRegisterFlow() {
    setRegisterStep("phone");
    setOtpCode("");
    confirmationRef.current = null;
    verifiedRegisterPhoneRef.current = null;
  }

  async function onSendRegisterOtp() {
    setError(null);
    setInfo(null);
    if (!isValidIraqMobile(phone)) {
      setError(t(locale, "authInvalidIraqPhone"));
      return;
    }
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error(t(locale, "authFirebaseInitFailed"));
      }
      await assertHuman("register");

      const normalizedPhone = normalizeIraqPhone(phone);
      // E.164: +9647xxxxxxxxx (normalizeIraqPhone returns digits only).
      const confirmation = await sendPhoneSmsCode(
        auth,
        toIraqE164(normalizedPhone),
      );
      confirmationRef.current = confirmation;
      verifiedRegisterPhoneRef.current = null;
      setRegisterStep("otp");
      setOtpCode("");
      setInfo(t(locale, "authOtpSent"));
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    } catch (err) {
      clearPhoneRecaptchaVerifier();
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
      setError(mapAuthError(err, locale));
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyRegisterOtp() {
    setError(null);
    setInfo(null);
    if (!confirmationRef.current) {
      setError(t(locale, "authResetSessionExpired"));
      setRegisterStep("phone");
      return;
    }
    if (otpCode.trim().length < 4) {
      setError(t(locale, "authInvalidOtp"));
      return;
    }
    setBusy(true);
    try {
      const cred = await confirmationRef.current.confirm(otpCode.trim());
      const normalizedPhone = normalizeIraqPhone(phone);

      // Existing marketplace profile → ask them to sign in.
      try {
        const session = await api.get<{
          profile?: { phone?: string | null; accountType?: string | null } | null;
        }>("/users/me");
        const existingPhone =
          typeof session.profile?.phone === "string"
            ? session.profile.phone.trim()
            : "";
        if (existingPhone || session.profile?.accountType) {
          const auth = getFirebaseAuth();
          if (auth) await signOut(auth);
          confirmationRef.current = null;
          verifiedRegisterPhoneRef.current = null;
          setRegisterStep("phone");
          setError(t(locale, "authAlreadyRegistered"));
          return;
        }
      } catch {
        // No profile yet — continue registration.
      }

      verifiedRegisterPhoneRef.current = normalizedPhone;
      setRegisterStep("details");
      setInfo(null);
      void cred;
    } catch (err) {
      setError(mapAuthError(err, locale));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitRegisterDetails() {
    setError(null);
    setInfo(null);

    const verifiedPhone = verifiedRegisterPhoneRef.current;
    if (!verifiedPhone || !isValidIraqMobile(verifiedPhone)) {
      setError(t(locale, "authResetSessionExpired"));
      setRegisterStep("phone");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t(locale, "authWeakPassword"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t(locale, "authPasswordMismatch"));
      return;
    }
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setError(t(locale, "authCityRequired"));
      return;
    }
    if (accountType === "showroom") {
      if (!showroomName.trim()) {
        setError(t(locale, "authShowroomNameRequired"));
        return;
      }
      if (!ownerName.trim()) {
        setError(t(locale, "authOwnerNameRequired"));
        return;
      }
    }

    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth?.currentUser) {
        throw new Error(t(locale, "authResetSessionExpired"));
      }

      const trimmedEmail = email.trim();
      await linkPhonePasswordIfNeeded(
        auth.currentUser,
        verifiedPhone,
        password,
      );

      try {
        await api.post("/users/register", {
          accountType,
          phone: verifiedPhone,
          displayName:
            displayName.trim() ||
            (accountType === "showroom"
              ? ownerName.trim()
              : verifiedPhone),
          city: trimmedCity,
          registrationPlatform: "web",
          ...(trimmedEmail.includes("@") ? { email: trimmedEmail } : {}),
          ...(accountType === "showroom"
            ? {
                showroomName: showroomName.trim(),
                ownerName: ownerName.trim(),
              }
            : {}),
        });
      } catch (registerErr) {
        try {
          await auth.signOut();
        } catch {
          // ignore
        }
        verifiedRegisterPhoneRef.current = null;
        confirmationRef.current = null;
        setRegisterStep("phone");
        throw registerErr;
      }

      trackEvent("sign_up", { method: accountType });
      setRegisterStep("phone");
      verifiedRegisterPhoneRef.current = null;
      confirmationRef.current = null;
      await redirectAfterAuth();
    } catch (err) {
      setError(mapAuthError(err, locale));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (resetPhase === "otp") {
      await onConfirmPhoneReset();
      return;
    }
    if (mode === "register") {
      if (registerStep === "phone") {
        await onSendRegisterOtp();
        return;
      }
      if (registerStep === "otp") {
        await onVerifyRegisterOtp();
        return;
      }
      await onSubmitRegisterDetails();
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error(t(locale, "authFirebaseInitFailed"));
      }

      await assertHuman("login");

      const trimmedEmail = email.trim();
      const trimmedPhone = phone.trim();

      if (trimmedEmail.includes("@")) {
        try {
          await signInWithEmailAndPassword(auth, trimmedEmail, password);
        } catch (err) {
          if (!isCredentialError(err) || !isValidIraqMobile(trimmedPhone)) {
            throw err;
          }
          await signInWithPhonePassword(auth, trimmedPhone, password);
        }
      } else {
        if (!isValidIraqMobile(trimmedPhone)) {
          throw new Error(t(locale, "authInvalidIraqPhone"));
        }
        await signInWithPhonePassword(auth, trimmedPhone, password);
      }

      trackEvent("login", {
        method: trimmedEmail.includes("@") ? "email" : "phone",
      });

      await redirectAfterAuth();
    } catch (err) {
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
      setError(mapAuthError(err, locale));
    } finally {
      setBusy(false);
    }
  }

  async function onForgotPassword() {
    setError(null);
    setInfo(null);
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (trimmedEmail.includes("@")) {
      setBusy(true);
      try {
        const auth = getFirebaseAuth();
        if (!auth) {
          throw new Error(t(locale, "authFirebaseInitFailed"));
        }
        await assertHuman("login");
        await sendPasswordResetEmail(auth, trimmedEmail);
        setInfo(t(locale, "authResetEmailSent"));
      } catch (err) {
        setTurnstileToken(null);
        setTurnstileKey((k) => k + 1);
        setError(mapAuthError(err, locale));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!isValidIraqMobile(trimmedPhone)) {
      setError(t(locale, "authResetNeedPhoneOrEmail"));
      return;
    }

    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error(t(locale, "authFirebaseInitFailed"));
      }

      if (isTurnstileEnabled() && !turnstileToken) {
        throw new Error(t(locale, "botCheckFailed"));
      }

      const normalizedPhone = normalizeIraqPhone(trimmedPhone);
      const start = await api.post<{ ok: boolean; sessionId: string }>(
        "/auth/password-reset/phone/start",
        {
          phone: normalizedPhone,
          ...(turnstileToken ? { turnstileToken } : {}),
        },
      );

      const confirmation = await sendPhoneSmsCode(
        auth,
        toIraqE164(normalizedPhone),
      );
      confirmationRef.current = confirmation;
      setResetSessionId(start.sessionId);
      setResetPhone(normalizedPhone);
      setResetPhase("otp");
      setOtpCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPassword("");
      setInfo(t(locale, "authResetSmsSent"));
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    } catch (err) {
      clearPhoneRecaptchaVerifier();
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
      setError(mapAuthError(err, locale));
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmPhoneReset() {
    setError(null);
    setInfo(null);

    if (!resetSessionId || !resetPhone || !confirmationRef.current) {
      setError(t(locale, "authResetSessionExpired"));
      resetForgotState();
      return;
    }
    if (otpCode.trim().length < 4) {
      setError(t(locale, "authInvalidOtp"));
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t(locale, "authWeakPassword"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t(locale, "authPasswordMismatch"));
      return;
    }

    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error(t(locale, "authFirebaseInitFailed"));
      }

      const cred = await confirmationRef.current.confirm(otpCode.trim());
      const idToken = await cred.user.getIdToken(true);

      await api.post("/auth/password-reset/phone/confirm", {
        phone: resetPhone,
        sessionId: resetSessionId,
        idToken,
        newPassword,
      });

      const phoneForLogin = resetPhone.replace(/^964/, "");

      try {
        await signOut(auth);
      } catch {
        // ignore
      }

      resetForgotState();
      setPhone(phoneForLogin || phone);
      setInfo(t(locale, "authResetSmsSuccess"));
    } catch (err) {
      setError(mapAuthError(err, locale));
    } finally {
      setBusy(false);
    }
  }

  const showResetOtp = resetPhase === "otp";
  const showRegisterPhone = mode === "register" && registerStep === "phone";
  const showRegisterOtp = mode === "register" && registerStep === "otp";
  const showRegisterDetails = mode === "register" && registerStep === "details";
  const showTurnstile =
    !showResetOtp &&
    !showRegisterOtp &&
    !showRegisterDetails &&
    (mode === "login" || showRegisterPhone);

  const subtitle = showResetOtp
    ? t(locale, "authResetSmsSent")
    : showRegisterOtp
      ? t(locale, "authOtpSent")
      : showRegisterDetails
        ? t(locale, "authRegisterDetailsSubtitle")
        : mode === "login"
          ? t(locale, "authSignInSubtitle")
          : t(locale, "authRegisterSubtitle");

  const submitLabel = busy
    ? t(locale, "pleaseWait")
    : showResetOtp
      ? t(locale, "authConfirmPhoneReset")
      : showRegisterPhone
        ? t(locale, "authSendOtp")
        : showRegisterOtp
          ? t(locale, "authVerifyOtp")
          : showRegisterDetails
            ? t(locale, "authRegisterButton")
            : t(locale, "signIn");

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 pt-28 pb-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(234,88,12,0.12),_transparent_55%)]"
        aria-hidden
      />
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-[24px] bg-card p-8 shadow-[0_8px_40px_rgba(15,23,42,0.08)] ring-1 ring-outline md:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4">
            <IraqMotorsWordmark />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {showResetOtp
              ? t(locale, "authForgotPassword")
              : mode === "login"
                ? t(locale, "signIn")
                : t(locale, "authRegisterTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          {showResetOtp ? (
            <>
              <div className="relative">
                <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                  +964
                </span>
                <input
                  type="tel"
                  value={resetPhone.replace(/^964/, "")}
                  readOnly
                  className={`${fieldClass} ps-16 opacity-80`}
                  aria-label={t(locale, "authPhoneLabel")}
                />
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder={t(locale, "authOtpCode")}
                className={fieldClass}
                maxLength={8}
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t(locale, "authNewPassword")}
                  className={fieldClass}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted"
                >
                  {showPassword ? t(locale, "hide") : t(locale, "show")}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder={t(locale, "authConfirmNewPassword")}
                className={fieldClass}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted">{t(locale, "authPasswordHint")}</p>
            </>
          ) : showRegisterPhone ? (
            <div className="relative">
              <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                +964
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="750 000 0000"
                required
                className={`${fieldClass} ps-16`}
                autoComplete="tel"
                inputMode="tel"
                aria-label={t(locale, "authPhoneLabel")}
              />
            </div>
          ) : showRegisterOtp ? (
            <>
              <div className="relative">
                <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                  +964
                </span>
                <input
                  type="tel"
                  value={normalizeIraqPhone(phone).replace(/^964/, "")}
                  readOnly
                  className={`${fieldClass} ps-16 opacity-80`}
                  aria-label={t(locale, "authPhoneLabel")}
                />
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder={t(locale, "authOtpCode")}
                className={fieldClass}
                maxLength={8}
              />
            </>
          ) : showRegisterDetails ? (
            <>
              <div className="relative">
                <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                  +964
                </span>
                <input
                  type="tel"
                  value={(verifiedRegisterPhoneRef.current || normalizeIraqPhone(phone)).replace(
                    /^964/,
                    "",
                  )}
                  readOnly
                  className={`${fieldClass} ps-16 opacity-80`}
                  aria-label={t(locale, "authPhoneLabel")}
                />
              </div>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t(locale, "dashDisplayName")}
                className={fieldClass}
              />
              <select
                value={accountType}
                onChange={(e) =>
                  setAccountType(e.target.value as "individual" | "showroom")
                }
                className={fieldClass}
              >
                <option value="individual">
                  {t(locale, "accountTypeIndividual")}
                </option>
                <option value="showroom">
                  {t(locale, "accountTypeShowroom")}
                </option>
              </select>
              {accountType === "showroom" ? (
                <>
                  <input
                    value={showroomName}
                    onChange={(e) => setShowroomName(e.target.value)}
                    placeholder={t(locale, "dashShowroomName")}
                    required
                    className={fieldClass}
                    autoComplete="organization"
                  />
                  <input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder={t(locale, "dashOwnerName")}
                    required
                    className={fieldClass}
                    autoComplete="name"
                  />
                </>
              ) : null}
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className={`${fieldClass} ${city ? "" : "text-muted"}`}
                aria-label={t(locale, "authSelectCity")}
              >
                <option value="" disabled>
                  {t(locale, "authSelectCity")}
                </option>
                {IRAQ_PROVINCE_ORDER.map((province) => (
                  <option key={province} value={province}>
                    {localizeProvince(locale, province)}
                  </option>
                ))}
              </select>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(locale, "authEmailOptionalPlaceholder")}
                className={fieldClass}
                autoComplete="email"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t(locale, "authPassword")}
                  className={fieldClass}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted"
                >
                  {showPassword ? t(locale, "hide") : t(locale, "show")}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t(locale, "authConfirmPassword")}
                className={fieldClass}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted">{t(locale, "authPasswordHint")}</p>
            </>
          ) : (
            <>
              <div className="relative">
                <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-sm text-muted">
                  +964
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="750 000 0000"
                  required={!email.trim().includes("@")}
                  className={`${fieldClass} ps-16`}
                  autoComplete="tel"
                  inputMode="tel"
                  aria-label={t(locale, "authPhoneLabel")}
                />
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(locale, "authEmailLoginPlaceholder")}
                className={fieldClass}
                autoComplete="email"
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t(locale, "authPassword")}
                  className={fieldClass}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted"
                >
                  {showPassword ? t(locale, "hide") : t(locale, "show")}
                </button>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onForgotPassword()}
                  className="text-xs font-semibold text-muted hover:text-primary disabled:opacity-60"
                >
                  {t(locale, "authForgotPassword")}
                </button>
                <p className="text-end text-[11px] leading-snug text-muted">
                  {t(locale, "authForgotPasswordHint")}
                </p>
              </div>
            </>
          )}

          {error ? (
            <p
              role="alert"
              className="rounded-[12px] bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40"
            >
              {error}
            </p>
          ) : null}
          {info ? (
            <p
              role="status"
              className="rounded-[12px] bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {info}
            </p>
          ) : null}

          {showTurnstile ? (
            <TurnstileWidget
              key={turnstileKey}
              action={mode === "register" ? "register" : "login"}
              onToken={setTurnstileToken}
            />
          ) : null}

          {/* Firebase Phone Auth reCAPTCHA host (Flutter `#recaptcha-container`).
              Must remain interactive — not pointer-events-none / display:none. */}
          <div
            id={RECAPTCHA_CONTAINER_ID}
            className="fixed bottom-4 end-4 z-[9999] min-h-px"
          />

          <button
            type="submit"
            disabled={
              busy ||
              (showTurnstile && isTurnstileEnabled() && !turnstileToken)
            }
            className="mt-2 w-full rounded-[12px] bg-primary py-3.5 text-sm font-semibold text-on-primary shadow-sm transition hover:brightness-110 disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>

        {showResetOtp ? (
          <button
            type="button"
            className="mt-5 w-full text-center text-sm font-medium text-primary"
            onClick={() => {
              void (async () => {
                const auth = getFirebaseAuth();
                if (auth) {
                  try {
                    await signOut(auth);
                  } catch {
                    // ignore
                  }
                }
                resetForgotState();
                setError(null);
                setInfo(null);
              })();
            }}
          >
            {t(locale, "authResetBackToSignIn")}
          </button>
        ) : showRegisterOtp || showRegisterDetails ? (
          <button
            type="button"
            className="mt-5 w-full text-center text-sm font-medium text-primary"
            onClick={() => {
              void (async () => {
                const auth = getFirebaseAuth();
                if (auth && showRegisterDetails) {
                  try {
                    await signOut(auth);
                  } catch {
                    // ignore
                  }
                }
                resetRegisterFlow();
                setError(null);
                setInfo(null);
                setTurnstileToken(null);
                setTurnstileKey((k) => k + 1);
              })();
            }}
          >
            {t(locale, "authChangePhone")}
          </button>
        ) : (
          <button
            type="button"
            className="mt-5 w-full text-center text-sm font-medium text-primary"
            onClick={() => {
              const next = mode === "login" ? "register" : "login";
              setMode(next);
              setError(null);
              setInfo(null);
              setConfirmPassword("");
              resetForgotState();
              resetRegisterFlow();
              setTurnstileToken(null);
              setTurnstileKey((k) => k + 1);
            }}
          >
            {mode === "login"
              ? t(locale, "authSwitchToRegister")
              : t(locale, "authSwitchToSignIn")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <LoadingFallback className="px-[4%] pt-28 text-center text-muted" />
      }
    >
      <AuthForm />
    </Suspense>
  );
}
