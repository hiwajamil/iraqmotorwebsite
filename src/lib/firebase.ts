import {
  initializeApp,
  getApps,
  type FirebaseApp,
} from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  linkWithCredential,
  getMultiFactorResolver,
  multiFactor,
  TotpMultiFactorGenerator,
  type Auth,
  type ConfirmationResult,
  type MultiFactorResolver,
  type TotpSecret,
  type User,
} from "firebase/auth";

/**
 * Phone SMS (register + password reset) uses client Firebase Phone Auth
 * (`signInWithPhoneNumber`), not Express.
 *
 * Firebase Console checklist if SMS still fails:
 * - Authentication → Sign-in method → Phone enabled
 * - Blaze billing (required for real SMS)
 * - Settings → Authorized domains: iraqmotors.net + www.iraqmotors.net
 * - SMS region policy allows Iraq (IQ)
 * - reCAPTCHA SMS toll fraud protection BLOCK causes auth/error-code:-39
 *   (disabled on this project so classic RecaptchaVerifier can send SMS)
 */

/** Public web config (same as Flutter `DefaultFirebaseOptions.web`). Env vars override. */
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyBYX6e-32IsAo28XPhBPlZGlRjS01cUSHA",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "iqmotors-d588d.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "iqmotors-d588d",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "iqmotors-d588d.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "426861136448",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:426861136448:web:8177bb2fffed65c74c2da5",
  measurementId:
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    "G-BCGJYXYT2R",
};

/**
 * Same reCAPTCHA Enterprise web key as Flutter `RecaptchaEnterpriseConfig`
 * and `app/web/index.html`. Override with env if rotated.
 */
/** DOM host for RecaptchaVerifier (Firebase JS phone-auth docs). */
export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let activePhoneVerifier: RecaptchaVerifier | null = null;

export function getFirebaseApp() {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey) return null;
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!auth) auth = getAuth(a);
  return auth;
}

function firebaseErrCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return String((err as { code: unknown }).code || "");
  }
  return "";
}

function firebaseErrMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function logPhoneSmsError(stage: string, err: unknown): void {
  console.error(`[firebase] phone SMS ${stage}`, {
    code: firebaseErrCode(err) || undefined,
    message: firebaseErrMessage(err),
    err,
  });
}

/** Clear a previous RecaptchaVerifier before a new SMS attempt. */
export function clearPhoneRecaptchaVerifier(): void {
  if (!activePhoneVerifier) return;
  try {
    activePhoneVerifier.clear();
  } catch {
    // widget may already be gone
  }
  activePhoneVerifier = null;
  const host = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (host) host.replaceChildren();
}

/**
 * Canonical E.164 for Iraqi mobiles: `+9647xxxxxxxxx`.
 * Pass digits already normalized via `normalizeIraqPhone` (no leading +).
 */
export function toIraqE164(normalizedDigits: string): string {
  const digits = normalizedDigits.trim().replace(/\D/g, "");
  if (digits.startsWith("964")) return `+${digits}`;
  if (digits.startsWith("0")) return `+964${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("7")) return `+964${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function createVisibleVerifier(authInstance: Auth): RecaptchaVerifier {
  clearPhoneRecaptchaVerifier();
  const host = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!host) {
    throw new Error(
      `Missing #${RECAPTCHA_CONTAINER_ID} — required for Firebase Phone Auth`,
    );
  }
  host.replaceChildren();

  const verifier = new RecaptchaVerifier(authInstance, RECAPTCHA_CONTAINER_ID, {
    size: "normal",
    callback: () => {
      // reCAPTCHA solved — send can proceed
    },
    "expired-callback": () => {
      clearPhoneRecaptchaVerifier();
    },
  });
  activePhoneVerifier = verifier;
  return verifier;
}

/**
 * Pre-render the visible reCAPTCHA checkbox (Firebase JS phone-auth docs).
 * Call when the register/reset phone step is shown — not after the Send click.
 */
export async function preparePhoneRecaptcha(
  authInstance: Auth,
): Promise<void> {
  if (activePhoneVerifier) return;
  const verifier = createVisibleVerifier(authInstance);
  await verifier.render();
}

/**
 * Send phone SMS for register / password-reset OTP.
 *
 * Official pattern: RecaptchaVerifier on `#recaptcha-container` +
 * signInWithPhoneNumber(auth, e164, appVerifier). Do not mix
 * initializeRecaptchaConfig / Enterprise script with this v2 widget.
 */
export async function sendPhoneSmsCode(
  authInstance: Auth,
  e164Phone: string,
): Promise<ConfirmationResult> {
  const e164 = e164Phone.trim().startsWith("+")
    ? e164Phone.trim()
    : toIraqE164(e164Phone);
  if (!/^\+9647\d{9}$/.test(e164)) {
    const err = Object.assign(new Error(`Invalid E.164 phone: ${e164}`), {
      code: "auth/invalid-phone-number",
    });
    logPhoneSmsError("validate", err);
    throw err;
  }

  let appVerifier = activePhoneVerifier;
  if (!appVerifier) {
    appVerifier = createVisibleVerifier(authInstance);
    await appVerifier.render();
  }

  try {
    return await signInWithPhoneNumber(authInstance, e164, appVerifier);
  } catch (err) {
    logPhoneSmsError("signInWithPhoneNumber", err);
    clearPhoneRecaptchaVerifier();
    throw err;
  }
}

/** Confirm SMS OTP with a hard timeout so the auth UI cannot hang forever. */
export async function confirmPhoneSmsCode(
  confirmation: ConfirmationResult,
  code: string,
  timeoutMs = 45_000,
): Promise<Awaited<ReturnType<ConfirmationResult["confirm"]>>> {
  const trimmed = code.trim();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      confirmation.confirm(trimmed),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const err = Object.assign(
            new Error("Phone verification timed out. Please request a new code."),
            { code: "auth/network-request-failed" },
          );
          reject(err);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  linkWithCredential,
  signOut,
  onAuthStateChanged,
  getMultiFactorResolver,
  multiFactor,
  TotpMultiFactorGenerator,
};
export type { User, ConfirmationResult, MultiFactorResolver, TotpSecret };
