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

export const RECAPTCHA_CONTAINER_ID = "recaptcha-container";
/** Button id for invisible RecaptchaVerifier fallback (Firebase requires a button). */
export const PHONE_RESET_RECAPTCHA_BUTTON_ID = "phone-reset-recaptcha-btn";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let enterpriseScriptPromise: Promise<void> | null = null;
let recaptchaConfigPromise: Promise<void> | null = null;

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

/**
 * Send phone SMS for OTP flows.
 *
 * With Firebase Auth reCAPTCHA Enterprise in Enforce mode, the JS SDK allows
 * omitting RecaptchaVerifier. Passing a classic v2 verifier often yields
 * auth/internal-error on this project — try without first, then fall back to
 * an invisible verifier bound to `fallbackButtonId`.
 */
export async function sendPhoneSmsCode(
  authInstance: Auth,
  e164Phone: string,
  fallbackButtonId: string = PHONE_RESET_RECAPTCHA_BUTTON_ID,
): Promise<ConfirmationResult> {
  await ensurePhoneAuthRecaptcha(authInstance);

  try {
    // Prefer Enterprise Enforce path (no classic v2 RecaptchaVerifier).
    return await signInWithPhoneNumber(authInstance, e164Phone);
  } catch (err) {
    const code = firebaseErrCode(err);
    const fatal =
      code === "auth/invalid-phone-number" ||
      code === "auth/missing-phone-number" ||
      code === "auth/quota-exceeded" ||
      code === "auth/too-many-requests" ||
      code === "auth/operation-not-allowed" ||
      code === "auth/user-disabled";
    if (fatal) throw err;
    console.warn(
      "[firebase] phone SMS without verifier failed; trying invisible RecaptchaVerifier",
      code || err,
    );
  }

  const host = document.getElementById(fallbackButtonId);
  if (!host) {
    throw new Error("reCAPTCHA button missing");
  }

  const verifier = new RecaptchaVerifier(authInstance, fallbackButtonId, {
    size: "invisible",
  });
  try {
    return await signInWithPhoneNumber(authInstance, e164Phone, verifier);
  } catch (err) {
    try {
      verifier.clear();
    } catch {
      // ignore
    }
    throw err;
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
