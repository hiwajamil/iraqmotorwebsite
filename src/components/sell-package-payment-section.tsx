"use client";

import { CreditCard, Rocket, Wallet } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import {
  PACKAGE_BOOST,
  PACKAGE_SUPER_BOOST,
  PAYMENT_DEBIT_CARD,
  PAYMENT_E_WALLET,
  PAYMENT_FIB,
  formatIqd,
  packagePriceIqd,
  type CatalogPackagePrices,
  type PackageKey,
  type PaymentMethodKey,
} from "@/lib/listing-packages";

function PackageCard({
  locale,
  title,
  price,
  subtitle,
  badge,
  selected,
  onSelect,
}: {
  locale: Locale;
  title: string;
  price: string;
  subtitle: string;
  badge?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[16px] border p-5 text-start transition ${
        selected
          ? "border-primary bg-primary/[0.06] ring-2 ring-primary"
          : "border-outline bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{title}</p>
          {badge ? (
            <span className="mt-2 inline-block rounded-full bg-primary-fill px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-primary">
              {badge}
            </span>
          ) : null}
        </div>
        <span
          className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-primary bg-primary-fill text-on-primary" : "border-outline"
          }`}
          aria-hidden
        >
          {selected ? "✓" : ""}
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight">
        {price}{" "}
        <span className="text-sm font-semibold text-muted">
          {t(locale, "sellPackageCurrency")}
        </span>
      </p>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>
    </button>
  );
}

function PaymentTile({
  title,
  subtitle,
  selected,
  onSelect,
  disabled,
  trailing,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-[14px] border px-4 py-3.5 text-start transition disabled:cursor-not-allowed disabled:opacity-55 ${
        selected
          ? "border-primary bg-primary/[0.06] ring-2 ring-primary"
          : "border-outline bg-card hover:border-primary/40"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
      </div>
      {trailing}
    </button>
  );
}

export function SellPackagePaymentSection({
  locale,
  packageKey,
  paymentMethodKey,
  packagePrices,
  onPackageChange,
  onPaymentMethodChange,
  packageError,
  paymentError,
}: {
  locale: Locale;
  packageKey: PackageKey;
  paymentMethodKey: PaymentMethodKey;
  packagePrices?: CatalogPackagePrices | null;
  onPackageChange: (key: PackageKey) => void;
  onPaymentMethodChange: (key: PaymentMethodKey) => void;
  packageError?: string;
  paymentError?: string;
}) {
  const boostPrice = formatIqd(
    packagePriceIqd(PACKAGE_BOOST, packagePrices),
  );
  const superBoostPrice = formatIqd(
    packagePriceIqd(PACKAGE_SUPER_BOOST, packagePrices),
  );

  return (
    <div className="space-y-6">
      <section data-field="packageKey" className="space-y-3">
        <div className="flex items-center gap-2">
          <Rocket className="size-5 text-primary-strong" aria-hidden />
          <h2 className="text-lg font-bold">{t(locale, "sellSectionPackage")}</h2>
        </div>
        <p className="text-sm text-muted">{t(locale, "sellPackageSubtitle")}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <PackageCard
            locale={locale}
            title={t(locale, "sellPackageBoostTitle")}
            price={boostPrice}
            subtitle={t(locale, "sellPackageBoostDesc")}
            selected={packageKey === PACKAGE_BOOST}
            onSelect={() => onPackageChange(PACKAGE_BOOST)}
          />
          <PackageCard
            locale={locale}
            title={t(locale, "sellPackageSuperBoostTitle")}
            price={superBoostPrice}
            subtitle={t(locale, "sellPackageSuperBoostDesc")}
            badge={t(locale, "sellPackageMostPopular")}
            selected={packageKey === PACKAGE_SUPER_BOOST}
            onSelect={() => onPackageChange(PACKAGE_SUPER_BOOST)}
          />
        </div>
        {packageError ? (
          <p className="text-xs text-red-600" role="alert">
            {packageError}
          </p>
        ) : null}
      </section>

      <section data-field="paymentMethodKey" className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="size-5 text-primary-strong" aria-hidden />
          <h2 className="text-lg font-bold">{t(locale, "sellSectionPayment")}</h2>
        </div>
        <p className="text-sm text-muted">{t(locale, "sellPaymentSubtitle")}</p>
        <div className="space-y-2">
          <PaymentTile
            title={t(locale, "sellPaymentDebitTitle")}
            selected={paymentMethodKey === PAYMENT_DEBIT_CARD}
            onSelect={() => onPaymentMethodChange(PAYMENT_DEBIT_CARD)}
            trailing={
              <span className="rounded-lg bg-input px-2 py-1 text-[10px] font-bold text-muted">
                N-Genius
              </span>
            }
          />
          <PaymentTile
            title={t(locale, "sellPaymentEwalletTitle")}
            subtitle={t(locale, "sellPaymentComingSoon")}
            selected={paymentMethodKey === PAYMENT_E_WALLET}
            onSelect={() => onPaymentMethodChange(PAYMENT_E_WALLET)}
            disabled
            trailing={<Wallet className="size-5 text-muted" aria-hidden />}
          />
          <PaymentTile
            title={t(locale, "sellPaymentFibTitle")}
            subtitle={t(locale, "sellPaymentComingSoon")}
            selected={paymentMethodKey === PAYMENT_FIB}
            onSelect={() => onPaymentMethodChange(PAYMENT_FIB)}
            disabled
            trailing={
              <span className="rounded-lg bg-input px-2 py-1 text-[10px] font-semibold text-muted">
                FIB
              </span>
            }
          />
        </div>
        {paymentError ? (
          <p className="text-xs text-red-600" role="alert">
            {paymentError}
          </p>
        ) : null}
      </section>
    </div>
  );
}
