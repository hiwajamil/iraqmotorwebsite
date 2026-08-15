"use client";

import { useEffect, useState } from "react";
import {
  fetchAds,
  type Advertise,
  type AdvertiseTypeId,
} from "@/lib/ads";

/**
 * Loads promotional creatives for a locale + optional city filter.
 * Fails soft (empty list) so listings never break when ads are down.
 */
export function useAdvertise(opts: {
  langCode: string;
  locationId?: string | null;
  listSize?: number;
  advertiseTypeIds?: AdvertiseTypeId[];
}) {
  const [ads, setAds] = useState<Advertise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAds({
      langCode: opts.langCode,
      locationId: opts.locationId,
      listSize: opts.listSize,
      advertiseTypeIds: opts.advertiseTypeIds,
    }).then((items) => {
      if (!cancelled) {
        setAds(items);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    opts.langCode,
    opts.locationId,
    opts.listSize,
    // stringify type ids for stable deps
    (opts.advertiseTypeIds ?? [1, 2, 3]).join(","),
  ]);

  return { ads, loading };
}
