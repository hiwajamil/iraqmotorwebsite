import { Suspense } from "react";
import type { Metadata } from "next";
import { LoadingFallback } from "@/components/loading-fallback";
import CompareClient from "./compare-client";

export const metadata: Metadata = {
  title: "Compare Cars — Iraq Motors",
  description: "Compare up to three cars side by side on Iraq Motors.",
};

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <LoadingFallback className="px-4 py-28 text-center text-muted" />
      }
    >
      <CompareClient />
    </Suspense>
  );
}
