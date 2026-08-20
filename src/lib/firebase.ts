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

/** Preload reCAPTCHA Enterprise (matches Flutter web). */
export function loadRecaptchaEnterpriseScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (enterpriseScriptPromise) return enterpriseScriptPromise;

  const src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_ENTERPRISE_SITE_KEY}`;
  const existing = document.querySelector(`script[src^="https://www.google.com/recaptcha/enterprise.js"]`);
  if (existing) {
    enterpriseScriptPromise = Promise.resolve();
    return enterpriseScriptPromise;
  }

  enterpriseScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load reCAPTCHA Enterprise"));
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
  await loadRecaptchaEnterpriseScript();
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
  signOut,
  onAuthStateChanged,
};
export type { User, ConfirmationResult };
