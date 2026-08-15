import { Suspense } from "react";
import CarsClient from "./cars-client";

export default function CarsPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-16 text-center text-muted">Loading…</p>
      }
    >
      <CarsClient />
    </Suspense>
  );
}
