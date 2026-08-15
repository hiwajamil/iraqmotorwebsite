import type { Metadata } from "next";
import { Suspense } from "react";
import { Noto_Kufi_Arabic } from "next/font/google";
import { StoreProvider } from "@/store/provider";
import { SiteHeader } from "@/components/site-header";
import { GoogleAnalytics } from "@/components/google-analytics";
import "./globals.css";

const display = Noto_Kufi_Arabic({
  variable: "--font-display",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "IQ Motors — Buy & Sell Cars in Iraq",
  description:
    "Browse, sell, and manage cars on IQ Motors. Marketplace for individuals and showrooms across Iraq.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-surface text-foreground antialiased">
        <StoreProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="mt-10 border-t border-outline px-[4%] py-10 text-center text-sm text-muted">
            © {new Date().getFullYear()} IQ Motors. All rights reserved.
          </footer>
        </StoreProvider>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
      </body>
    </html>
  );
}
