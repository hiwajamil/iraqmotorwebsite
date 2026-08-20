import {
  initializeApp,
  getApps,
  type FirebaseApp,
} from "firebase/app";
import {
  getAuth,
  initializeRecaptchaConfig,
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
  type Auth,
  type ConfirmationResult,
  type User,
} from "firebase/auth";

/**
 * Phone SMS (register + password reset) uses client Firebase Phone Auth
 * (`signInWithPhoneNumber`), not Express.
 *
 * Firebase Console checklist if SMS still fails:
 * - Authentication → Sign-in method → Phone enabled
 * - Blaze billing (required for real SMS)
 * - Settings → Authorized domains includes localhost + production host
 * - Settings → SMS region policy allows Iraq (IQ)
 * - reCAPTCHA Enterprise / fraud prevention configured for the web app
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
export const RECAPTCHA_ENTERPRISE_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY ||
  "6Lci2CstAAAAAP4dOUHfxeVt2ai057KzVKnJYsQg";

/** DOM host for RecaptchaVerifier — matches Flutter `#recaptcha-container`. */
export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let enterpriseScriptPromise: Promise<void> | null = null;
let recaptchaConfigPromise: Promise<void> | null = null;
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

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: { ready: (cb: () => void) => void };
      ready?: (cb: () => void) => void;
    };
  }
}

/** Preload reCAPTCHA Enterprise (matches Flutter web). Soft-fail on CSP/network. */
export function loadRecaptchaEnterpriseScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (enterpriseScriptPromise) return enterpriseScriptPromise;

  const src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_ENTERPRISE_SITE_KEY}`;

  enterpriseScriptPromise = new Promise((resolve, reject) => {
    const finishOk = () => resolve();

    const waitReady = () => {
      const g = window.grecaptcha;
      if (g?.enterprise?.ready) {
        g.enterprise.ready(finishOk);
        return;
      }
      if (g?.ready) {
        g.ready(finishOk);
        return;
      }
      finishOk();
    };

    const existing = document.querySelector(
      `script[src^="https://www.google.com/recaptcha/enterprise.js"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.grecaptcha) {
        waitReady();
        return;
      }
      existing.addEventListener("load", waitReady, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load reCAPTCHA Enterprise")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => waitReady();
    script.onerror = () => {
      enterpriseScriptPromise = null;
      reject(new Error("Failed to load reCAPTCHA Enterprise"));
    };
    document.head.appendChild(script);
  });
  return enterpriseScriptPromise;
}

/**
 * Fetch Auth reCAPTCHA Enterprise config (required when the project uses
 * Firebase Auth fraud prevention / Enterprise keys).
 */
export async function ensurePhoneAuthRecaptcha(
  authInstance: Auth,
): Promise<void> {
  try {
    await loadRecaptchaEnterpriseScript();
  } catch (err) {
    console.warn("[firebase] reCAPTCHA Enterprise script preload failed", err);
  }
  if (!recaptchaConfigPromise) {
    recaptchaConfigPromise = initializeRecaptchaConfig(authInstance).catch(
      (err) => {
        recaptchaConfigPromise = null;
        throw err;
      },
    );
  }
  await recaptchaConfigPromise;
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

function createCompactVerifier(authInstance: Auth): RecaptchaVerifier {
  clearPhoneRecaptchaVerifier();
  const host = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (!host) {
    throw new Error(
      `Missing #${RECAPTCHA_CONTAINER_ID} — required for Firebase Phone Auth`,
    );
  }
  host.replaceChildren();

  // Compact widget (Flutter web pattern). Do not use pointer-events-none /
  // display:none hosts — that breaks RecaptchaVerifier.
  const verifier = new RecaptchaVerifier(authInstance, RECAPTCHA_CONTAINER_ID, {
    size: "compact",
    "expired-callback": () => {
      clearPhoneRecaptchaVerifier();
    },
  });
  activePhoneVerifier = verifier;
  return verifier;
}

/**
 * Send phone SMS for register / password-reset OTP.
 *
 * Project phone reCAPTCHA is AUDIT (verifier required). Prefer compact
 * RecaptchaVerifier on `#recaptcha-container` (Flutter pattern). Optionally
 * try without verifier if Enterprise Enforce is enabled later.
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

  await ensurePhoneAuthRecaptcha(authInstance);

  // AUDIT mode (current project): classic verifier required.
  // Enforce mode: omit verifier. Try compact first, then without.
  const verifier = createCompactVerifier(authInstance);
  try {
    return await signInWithPhoneNumber(authInstance, e164, verifier);
  } catch (err) {
    logPhoneSmsError("with-compact-verifier", err);
    clearPhoneRecaptchaVerifier();

    const code = firebaseErrCode(err);
    const fatal =
      code === "auth/invalid-phone-number" ||
      code === "auth/missing-phone-number" ||
      code === "auth/quota-exceeded" ||
      code === "auth/too-many-requests" ||
      code === "auth/operation-not-allowed" ||
      code === "auth/user-disabled" ||
      code === "auth/captcha-check-failed";
    if (fatal) throw err;

    try {
      return await signInWithPhoneNumber(authInstance, e164);
    } catch (err2) {
      logPhoneSmsError("without-verifier-fallback", err2);
      throw err2;
    }
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
};
export type { User, ConfirmationResult };
