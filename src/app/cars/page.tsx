import { Suspense } from "react";
import { LoadingFallback } from "@/components/loading-fallback";
import CarsClient from "./cars-client";

export default function CarsPage() {
  return (
    <Suspense
      fallback={
        <LoadingFallback className="px-4 py-16 text-center text-muted" />
      }
    >
      <CarsClient />
    </Suspense>
  );
}
