"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { Car } from "@/lib/api";

export const MAX_COMPARE = 3;

/** Compact listing snapshot for the compare dock (max 3). */
export type CompareCar = {
  id: string;
  brandId?: string;
  modelKey?: string;
  year?: number | string;
  trim?: unknown;
  make?: unknown;
  model?: unknown;
  priceValue?: number;
  currencyKey?: string;
  price?: string;
  city?: string;
  province?: string;
  mileageValue?: number;
  mileageUnit?: string;
  imageUrl?: string;
  imageUrls?: string[];
  status?: string;
};

export function toCompareCar(car: Car): CompareCar {
  return {
    id: car.id,
    brandId: car.brandId,
    modelKey: car.modelKey,
    year: car.year,
    trim: car.trim,
    make: car.make,
    model: car.model,
    priceValue: car.priceValue,
    currencyKey: car.currencyKey,
    price: typeof car.price === "string" ? car.price : undefined,
    city: car.city,
    province: car.province,
    mileageValue: car.mileageValue,
    mileageUnit: car.mileageUnit,
    imageUrl: car.imageUrl,
    imageUrls: Array.isArray(car.imageUrls)
      ? car.imageUrls.map(String)
      : undefined,
    status: car.status,
  };
}

type AddResult = { ok: true } | { ok: false; reason: "duplicate" | "full" };

type CompareState = {
  compareList: CompareCar[];
  add: (car: CompareCar) => AddResult;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
};

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      compareList: [],
      add: (car) => {
        const list = get().compareList;
        if (list.some((item) => item.id === car.id)) {
          return { ok: false, reason: "duplicate" };
        }
        if (list.length >= MAX_COMPARE) {
          return { ok: false, reason: "full" };
        }
        set({ compareList: [...list, car] });
        return { ok: true };
      },
      remove: (id) =>
        set({ compareList: get().compareList.filter((item) => item.id !== id) }),
      clear: () => set({ compareList: [] }),
      has: (id) => get().compareList.some((item) => item.id === id),
    }),
    {
      name: "iq_compare_list",
      partialize: (state) => ({ compareList: state.compareList }),
    },
  ),
);

export function useCompareHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useCompareStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useCompareStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
