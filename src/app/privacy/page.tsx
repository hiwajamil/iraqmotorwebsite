import type { Metadata } from "next";
import { PrivacyPage } from "./privacy-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Iraq Motors",
  description:
    "How Iraq Motors collects, uses, and shares personal information on iraqmotors.net and in the Iraq Motors app.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyRoute() {
  return <PrivacyPage />;
}
