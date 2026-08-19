"use client";

import { useEffect, useState } from "react";
import {
  fetchAds,
  type Advertise,
  type AdvertiseTypeId,
} from "@/lib/ads";

/**
 * Loads promotional creatives for a locale and optional slot.
 * Fails soft (empty list) so listings never break when ads are down.
 */
export function useAdvertise(opts: {
  langCode: string;
  locationId?: string | null;
  listSize?: number;
  slot?: string;
  advertiseTypeIds?: AdvertiseTypeId[];
}) {
  const [ads, setAds] = useState<Advertise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAds({
      langCode: opts.langCode,
      listSize: opts.listSize,
      slot: opts.slot,
    }).then((items) => {
      if (!cancelled) {
        setAds(items);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [opts.langCode, opts.listSize, opts.slot]);

  return { ads, loading };
}
