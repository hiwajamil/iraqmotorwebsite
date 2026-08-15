"use client";

import { useEffect, useState } from "react";
import type { AdViewport } from "@/lib/ads";

/** Desktop breakpoint aligned with Tailwind `md` (768px). */
export function useAdViewport(): AdViewport {
  const [viewport, setViewport] = useState<AdViewport>("desktop");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setViewport(mq.matches ? "mobile" : "desktop");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return viewport;
}
