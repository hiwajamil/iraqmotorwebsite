"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { t, type Locale, accountTypeLabel } from "@/lib/i18n";

export type PublicSeller = {
  uid?: string;
  displayName?: string | null;
  showroomName?: string | null;
  ownerName?: string | null;
  phone?: string | null;
  city?: string | null;
  accountType?: string | null;
  photoUrl?: string | null;
  photoURL?: string | null;
  avatarUrl?: string | null;
};

function sellerName(profile: PublicSeller | null): string {
  if (!profile) return "";
  return (
    String(profile.showroomName || "").trim() ||
    String(profile.displayName || "").trim() ||
    String(profile.ownerName || "").trim()
  );
}

function sellerPhone(profile: PublicSeller | null): string {
  if (!profile) return "";
  return String(profile.phone || "").trim();
}

function sellerAvatar(profile: PublicSeller | null): string {
  if (!profile) return "";
  return String(
    profile.avatarUrl || profile.photoUrl || profile.photoURL || "",
  ).trim();
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  return letters.toUpperCase() || "•";
}

function telHref(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return `tel:${digits.startsWith("+") ? digits : `+${digits}`}`;
}

function whatsappHref(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `964${digits.slice(1)}`;
  if (digits.length === 10) digits = `964${digits}`;
  return `https://wa.me/${digits}`;
}

export function ListingSellerCard({
  sellerId,
  locale,
  listingSeller,
  onMessageSeller,
}: {
  sellerId?: string | null;
  locale: Locale;
  listingSeller?: PublicSeller | null;
  onMessageSeller?: () => void;
}) {
  const [fetched, setFetched] = useState<PublicSeller | null>(null);
  const [fetchedFor, setFetchedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) return;
    const id = sellerId;
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.get<PublicSeller>(`/users/${id}`);
        if (!cancelled) {
          setFetched(data ?? null);
          setFetchedFor(id);
        }
      } catch {
        if (!cancelled) {
          setFetched(null);
          setFetchedFor(id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const ready = !sellerId || fetchedFor === sellerId;
  const liveFetched = ready ? fetched : null;

  const profile = useMemo<PublicSeller>(() => {
    const pick = (value: unknown): string | undefined => {
      if (value == null) return undefined;
      const text = String(value).trim();
      return text || undefined;
    };
    return {
      uid: sellerId ?? undefined,
      displayName:
        pick(listingSeller?.displayName) ?? pick(liveFetched?.displayName),
      showroomName:
        pick(listingSeller?.showroomName) ?? pick(liveFetched?.showroomName),
      ownerName: pick(listingSeller?.ownerName) ?? pick(liveFetched?.ownerName),
      phone: pick(listingSeller?.phone) ?? pick(liveFetched?.phone),
      city: pick(listingSeller?.city) ?? pick(liveFetched?.city),
      accountType:
        pick(listingSeller?.accountType) ?? pick(liveFetched?.accountType),
      photoUrl:
        pick(listingSeller?.photoUrl) ??
        pick(listingSeller?.photoURL) ??
        pick(listingSeller?.avatarUrl) ??
        pick(liveFetched?.photoUrl) ??
        pick(liveFetched?.photoURL) ??
        pick(liveFetched?.avatarUrl),
    };
  }, [liveFetched, listingSeller, sellerId]);

  const name = sellerName(profile) || t(locale, "sellerDefault");
  const phone = sellerPhone(profile);
  const avatar = sellerAvatar(profile);
  const showroom = String(profile.showroomName || "").trim();
  const subtitle =
    showroom && showroom !== name
      ? showroom
      : accountTypeLabel(locale, profile.accountType);

  return (
    <section className="rounded-[16px] bg-card p-4 ring-1 ring-outline/60">
      <div className="flex items-center gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="h-12 w-12 rounded-full object-cover ring-1 ring-outline"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-input text-sm font-bold text-muted">
            {initials(name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          {subtitle ? (
            <p className="truncate text-xs text-muted capitalize">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {phone ? (
          <>
            <a
              href={telHref(phone)}
              className="inline-flex items-center justify-center rounded-[12px] bg-primary-fill px-3.5 py-2 text-sm font-semibold text-on-primary"
            >
              {t(locale, "phoneCall")}
            </a>
            <a
              href={whatsappHref(phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-[12px] bg-input px-3.5 py-2 text-sm font-semibold"
            >
              {t(locale, "whatsapp")}
            </a>
          </>
        ) : (
          <>
            <p className="w-full text-xs text-muted">
              {t(locale, "contactUnavailable")}
            </p>
            {onMessageSeller ? (
              <button
                type="button"
                onClick={onMessageSeller}
                className="inline-flex items-center justify-center rounded-[12px] bg-primary-fill px-3.5 py-2 text-sm font-semibold text-on-primary"
              >
                {t(locale, "messageSeller")}
              </button>
            ) : null}
          </>
        )}
        {sellerId ? (
          <Link
            href={`/cars?sellerId=${encodeURIComponent(sellerId)}`}
            className="inline-flex items-center justify-center rounded-[12px] px-3.5 py-2 text-sm font-semibold text-primary-strong"
          >
            {t(locale, "moreFromSeller")}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
