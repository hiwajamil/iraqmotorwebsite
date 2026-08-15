import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ||
  "http://localhost:4000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.201.1.99", "localhost", "127.0.0.1"],
  poweredByHeader: false,
  compress: true,
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
    ],
  },
};

export default nextConfig;
