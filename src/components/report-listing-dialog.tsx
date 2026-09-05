"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { AdminConfirmDialog } from "@/components/admin-confirm-dialog";
import { emitToast } from "@/components/site-toast";
import { t, type DictKey } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

const FLAG_REASONS = [
  "sold_already",
  "wrong_price",
  "misleading",
  "spam",
  "other",
] as const;

type FlagReason = (typeof FLAG_REASONS)[number];

const REASON_I18N: Record<FlagReason, DictKey> = {
  sold_already: "flagReasonSoldAlready",
  wrong_price: "flagReasonWrongPrice",
  misleading: "flagReasonMisleading",
  spam: "flagReasonSpam",
  other: "flagReasonOther",
};

export function ReportListingDialog({
  open,
  adId,
  onClose,
  onAuthRequired,
}: {
  open: boolean;
  adId: string;
  onClose: () => void;
  onAuthRequired: () => void;
}) {
  const locale = useAppSelector((s) => s.preferences.locale);
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!open) {
      setReason(null);
      setDetails("");
      setBusy(false);
      inFlight.current = false;
    }
  }, [open]);

  async function onConfirm() {
    if (!reason || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const trimmed = details.trim().slice(0, 2000);
      await api.post("/flagged", {
        adId,
        reason,
        ...(trimmed ? { details: trimmed } : {}),
      });
      emitToast(t(locale, "reportListingSuccess"));
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        onAuthRequired();
        onClose();
        return;
      }
      const already = e instanceof ApiError && e.status === 409;
      emitToast(
        already
          ? t(locale, "reportListingAlready")
          : e instanceof Error
            ? e.message
            : t(locale, "reportListingFailed"),
      );
      if (already) onClose();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <AdminConfirmDialog
      open={open}
      title={t(locale, "reportListingTitle")}
      description={t(locale, "reportListingHint")}
      confirmLabel={t(locale, "reportListingSubmit")}
      confirmDisabled={!reason}
      busy={busy}
      onConfirm={() => void onConfirm()}
      onCancel={onClose}
    >
      <div className="mt-4 flex flex-wrap gap-2">
        {FLAG_REASONS.map((key) => {
          const selected = reason === key;
          return (
            <button
              key={key}
              type="button"
              disabled={busy}
              onClick={() => setReason(key)}
              aria-pressed={selected}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition disabled:opacity-60 ${
                selected
                  ? "bg-primary-fill text-on-primary ring-primary"
                  : "bg-input text-foreground ring-outline"
              }`}
            >
              {t(locale, REASON_I18N[key])}
            </button>
          );
        })}
      </div>
      <label className="mt-4 block">
        <span className="text-xs font-medium text-muted">
          {t(locale, "reportListingDetails")}
        </span>
        <textarea
          value={details}
          disabled={busy}
          maxLength={2000}
          rows={3}
          onChange={(e) => setDetails(e.target.value)}
          className="mt-1 w-full resize-y rounded-[12px] bg-input px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-primary disabled:opacity-60"
        />
      </label>
    </AdminConfirmDialog>
  );
}
