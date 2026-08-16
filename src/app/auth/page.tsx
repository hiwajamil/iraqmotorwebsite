"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IraqMotorsWordmark } from "@/components/iraq-motors-wordmark";
import {
  getFirebaseAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "@/lib/firebase";
import { api, ApiError } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/components/auth-provider";

/** Keep in sync with Flutter `kSuperAdminEmail` / backend `SUPER_ADMIN_EMAILS`. */
const SUPER_ADMIN_EMAIL = "hiwa.constructions@gmail.com";
const SUPER_ADMIN_PHONE_LOCAL = "07500000000";

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

function phoneToAuthEmail(phone: string): string {
  return `${normalizeIraqPhone(phone)}@iqmotors.app`;
}

function isValidIraqMobile(phone: string): boolean {
  return /^9647\d{9}$/.test(normalizeIraqPhone(phone));
}

function isSuperAdminEmail(email?: string | null): boolean {
  if (!email?.trim()) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

function isSuperAdminPhone(phone?: string | null): boolean {
  if (!phone?.trim()) return false;
  return (
    normalizeIraqPhone(phone) === normalizeIraqPhone(SUPER_ADMIN_PHONE_LOCAL)
  );
}

function isSuperAdminUser(email?: string | null, phone?: string | null): boolean {
  if (isSuperAdminEmail(email) || isSuperAdminPhone(phone)) return true;
  if (!email?.trim()) return false;
  return (
    email.trim().toLowerCase() ===
    phoneToAuthEmail(SUPER_ADMIN_PHONE_LOCAL).toLowerCase()
  );
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

function mapAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.message || `Request failed (${err.status})`;
  }

  const code = firebaseErrorCode(err);
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect phone/email or password";
    case "auth/email-already-in-use":
      return "An account with this email already exists";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/too-many-requests":
      return "Too many attempts — try again later";
    case "auth/invalid-email":
      return "Enter a valid email address";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again";
    default:
      break;
  }

  return err instanceof Error ? err.message : "Auth failed";
}

async function signInWithPhonePassword(
  auth: NonNullable<ReturnType<typeof getFirebaseAuth>>,
  phone: string,
  password: string,
) {
  await signInWithEmailAndPassword(auth, phoneToAuthEmail(phone), password);
}

/** Mirrors Flutter `AuthService.signInAsSuperAdmin`. */
async function signInAsSuperAdmin(
  auth: NonNullable<ReturnType<typeof getFirebaseAuth>>,
  email: string,
  phone: string,
  password: string,
) {
  let lastFailure: unknown;

  // The Auth user is the Gmail account. There is no 07500000000@iqmotors.app user.
  if (isSuperAdminEmail(email) || isSuperAdminPhone(phone)) {
    try {
      await signInWithEmailAndPassword(auth, SUPER_ADMIN_EMAIL, password);
      return;
    } catch (err) {
      if (!isCredentialError(err)) throw err;
      lastFailure = err;
    }
  }

  const cleanedPhone = cleanPhoneInput(phone);
  if (cleanedPhone) {
    if (!isSuperAdminPhone(phone)) {
      if (lastFailure) throw lastFailure;
      throw new Error("Enter a valid Iraqi phone (e.g. 0750xxxxxxx)");
    }
    try {
      await signInWithPhonePassword(auth, phone, password);
      return;
    } catch (err) {
      if (!isCredentialError(err)) throw err;
      lastFailure = err;
    }
  }

  if (lastFailure) throw lastFailure;
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

const fieldClass =
  "w-full rounded-[12px] bg-input px-4 py-3.5 text-sm outline-none ring-1 ring-transparent transition focus:ring-primary";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const { user, me, loading, refreshMe } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "showroom">(
    "individual",
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user || !me) return;
    if (me.isSuperAdmin) {
      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      return;
    }
    router.replace(nextPath);
  }, [loading, user, me, nextPath, router]);

  async function redirectAfterAuth() {
    await refreshMe();
    const session = await api.get<{ isSuperAdmin?: boolean }>("/users/me");
    if (session.isSuperAdmin) {
      router.push(nextPath.startsWith("/admin") ? nextPath : "/admin");
    } else {
      router.push(nextPath);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error(
          "Firebase failed to initialize. Check the web app config.",
        );
      }

      const trimmedEmail = email.trim();
      const trimmedPhone = phone.trim();

      if (mode === "register") {
        if (!isValidIraqMobile(trimmedPhone)) {
          throw new Error("Enter a valid Iraqi phone (e.g. 0750xxxxxxx)");
        }
        if (!trimmedEmail) {
          throw new Error("Email is required to register");
        }
        const normalizedPhone = normalizeIraqPhone(trimmedPhone);
        const cred = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          password,
        );
        if (cred.user) {
          try {
            await sendEmailVerification(cred.user);
          } catch {
            // Non-fatal — user can resend from admin gate.
          }
        }
        try {
          await api.post("/users/register", {
            accountType,
            phone: normalizedPhone,
            displayName: displayName.trim() || trimmedEmail.split("@")[0],
            ...(accountType === "showroom"
              ? { showroomName: displayName.trim() || "Showroom" }
              : {}),
          });
        } catch (registerErr) {
          // Avoid orphan Firebase users without a marketplace profile.
          try {
            await cred.user.delete();
          } catch {
            await auth.signOut();
          }
          throw registerErr;
        }
      } else if (isSuperAdminUser(trimmedEmail, trimmedPhone)) {
        await signInAsSuperAdmin(auth, trimmedEmail, trimmedPhone, password);
      } else if (trimmedEmail.includes("@")) {
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
          throw new Error("Enter a valid Iraqi phone (e.g. 0750xxxxxxx)");
        }
        await signInWithPhonePassword(auth, trimmedPhone, password);
      }

      if (mode !== "register") {
        trackEvent("login", {
          method: trimmedEmail.includes("@") ? "email" : "phone",
        });
      }

      await redirectAfterAuth();
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onForgotPassword() {
    setError(null);
    setInfo(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email above, then click Forgot password");
      return;
    }
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error(
          "Firebase failed to initialize. Check the web app config.",
        );
      }
      await sendPasswordResetEmail(auth, trimmed);
      setInfo("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

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
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "login"
              ? "Sign in with your phone and password. Email is for super admin."
              : "Create an account with email, phone, and password."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
          {mode === "register" ? (
            <>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className={fieldClass}
              />
              <select
                value={accountType}
                onChange={(e) =>
                  setAccountType(e.target.value as "individual" | "showroom")
                }
                className={fieldClass}
              >
                <option value="individual">Individual</option>
                <option value="showroom">Showroom</option>
              </select>
            </>
          ) : null}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={
              mode === "login" ? "Email (super admin)" : "Email"
            }
            required={mode === "register"}
            className={fieldClass}
            autoComplete="email"
          />

          <div className="relative">
            <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-sm text-muted">
              +964
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="750 000 0000"
              required={mode === "register" || !email.trim()}
              className={`${fieldClass} ps-16`}
              autoComplete="tel"
              inputMode="tel"
              aria-label="Phone number"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className={fieldClass}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {mode === "login" ? (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => void onForgotPassword()}
                className="text-xs font-semibold text-muted hover:text-primary disabled:opacity-60"
              >
                Forgot password?
              </button>
            </div>
          ) : null}
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
          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-[12px] bg-primary py-3.5 text-sm font-semibold text-on-primary shadow-sm transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
          </button>
        </form>
        <button
          type="button"
          className="mt-5 w-full text-center text-sm font-medium text-primary"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
            setInfo(null);
          }}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <p className="px-[4%] pt-28 text-center text-muted">Loading…</p>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
