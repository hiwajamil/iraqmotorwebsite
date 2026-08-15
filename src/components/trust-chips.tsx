"use client";

import type { TrustChip } from "@/lib/car-pricing-trust";

const toneClass: Record<TrustChip["tone"], string> = {
  positive:
    "bg-teal-600/12 text-teal-800 dark:bg-teal-400/15 dark:text-teal-200",
  warning: "bg-red-500/12 text-red-700 dark:bg-red-400/15 dark:text-red-200",
  neutral: "bg-input text-muted",
};

export function TrustChips({ chips }: { chips: TrustChip[] }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${toneClass[chip.tone]}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
