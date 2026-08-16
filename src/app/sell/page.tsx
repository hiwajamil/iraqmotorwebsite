"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SellListingForm } from "@/components/sell-listing-form";
import { useAppSelector } from "@/store/hooks";
import { t } from "@/lib/i18n";

export default function SellPage() {
  const { user } = useAuth();
  const router = useRouter();
  const locale = useAppSelector((s) => s.preferences.locale);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-[4%] pt-28 pb-16 text-center">
        <h1 className="text-2xl font-bold">{t(locale, "sellTitle")}</h1>
        <p className="mt-2 text-muted">{t(locale, "sellSignInHint")}</p>
        <button
          type="button"
          onClick={() => router.push("/auth?next=/sell")}
          className="mt-6 rounded-[12px] bg-primary px-6 py-3 text-sm font-semibold text-on-primary"
        >
          {t(locale, "signIn")}
        </button>
      </div>
    );
  }

  return <SellListingForm />;
}
