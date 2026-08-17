import type { Metadata } from "next";
import { Suspense } from "react";
import { Montserrat, Noto_Kufi_Arabic } from "next/font/google";
import { StoreProvider } from "@/store/provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CompareDock } from "@/components/compare-dock";
import { FloatingHelpWidget } from "@/components/floating-help-widget";
import { SiteToast } from "@/components/site-toast";
import { GoogleAnalytics } from "@/components/google-analytics";
import "./globals.css";

const display = Noto_Kufi_Arabic({
  variable: "--font-display",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const logo = Montserrat({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: "800",
});

export const metadata: Metadata = {
  title: "Iraq Motors — Buy & Sell Cars in Iraq",
  description:
    "Browse, sell, and manage cars on Iraq Motors. Marketplace for individuals and showrooms across Iraq.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${logo.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-surface text-foreground antialiased">
        <StoreProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <CompareDock />
          <FloatingHelpWidget />
          <SiteToast />
        </StoreProvider>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
      </body>
    </html>
  );
}
