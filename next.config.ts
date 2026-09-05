import type { NextConfig } from "next";

const PRODUCTION_API = "https://api.iraqmotors.net";
const IS_PROD =
  process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

function resolveApiOrigin(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";
  const hosted = Boolean(process.env.VERCEL) || process.env.NODE_ENV === "production";
  try {
    if (env) {
      const host = new URL(env).hostname;
      const privateHost =
        host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
      if (!privateHost) return env;
    }
  } catch {
    // fall through
  }
  return hosted ? PRODUCTION_API : env || "http://localhost:4000";
}

const API_ORIGIN = resolveApiOrigin();

// P2 follow-up: drop script-src 'unsafe-inline' / 'unsafe-eval' and style-src
// 'unsafe-inline' via nonces or hashes once Next, Turnstile, and GTM support it.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self' https://*.ngenius-payments.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  [
    "img-src 'self' data: blob:",
    "https://*.r2.dev",
    "https://cdn-evmap.iqcars.io",
    "https://*.tile.openstreetmap.org",
    "https://tile.openstreetmap.org",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://www.gstatic.com",
    "https://www.google.com",
    "https://www.recaptcha.net",
  ].join(" "),
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https://www.gstatic.com",
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
    "https://challenges.cloudflare.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://www.gstatic.com",
    "https://www.google.com",
    "https://www.recaptcha.net",
    "https://apis.google.com",
  ].join(" "),
  [
    "connect-src 'self'",
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    "https://api.iraqmotors.net",
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "https://*.firebaseapp.com",
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    "https://securetoken.google.com",
    "https://firebaseinstallations.googleapis.com",
    "https://content-firebaseappcheck.googleapis.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://analytics.google.com",
    "https://www.googletagmanager.com",
    "https://challenges.cloudflare.com",
    "https://www.google.com",
    "https://www.recaptcha.net",
    "https://*.recaptcha.net",
    "https://*.r2.dev",
    "https://cdn-evmap.iqcars.io",
    "https://*.tile.openstreetmap.org",
    "https://*.ngenius-payments.com",
    "wss://*.firebaseio.com",
  ].join(" "),
  [
    "frame-src",
    "https://challenges.cloudflare.com",
    "https://*.firebaseapp.com",
    "https://*.ngenius-payments.com",
    "https://www.google.com",
    "https://recaptcha.google.com",
    "https://www.recaptcha.net",
    "https://recaptcha.net",
  ].join(" "),
  "worker-src 'self' blob:",
  ...(IS_PROD ? ["upgrade-insecure-requests"] : []),
].join("; ");

const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: CONTENT_SECURITY_POLICY,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(self), payment=(), usb=(), bluetooth=(), midi=()",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  ...(IS_PROD
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.201.1.99", "localhost", "127.0.0.1"],
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${API_ORIGIN}/:path*`,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "pub-4d3c544f5beb41b1a3cd7a4bd0c205ed.r2.dev" },
      { protocol: "https", hostname: "cdn-evmap.iqcars.io" },
    ],
  },
};

export default nextConfig;
