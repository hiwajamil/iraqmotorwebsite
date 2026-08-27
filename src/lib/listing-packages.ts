/** Listing boost packages — keys match backend + Flutter `AddCarOptionKeys`. */
export const PACKAGE_BOOST = "package_boost";
export const PACKAGE_SUPER_BOOST = "package_super_boost";

export const PACKAGE_KEYS = [PACKAGE_BOOST, PACKAGE_SUPER_BOOST] as const;
export type PackageKey = (typeof PACKAGE_KEYS)[number];

export const PAYMENT_DEBIT_CARD = "payment_debit_card";
export const PAYMENT_E_WALLET = "payment_e_wallet";
export const PAYMENT_FIB = "payment_fib";

export const PAYMENT_METHOD_KEYS = [
  PAYMENT_DEBIT_CARD,
  PAYMENT_E_WALLET,
  PAYMENT_FIB,
] as const;
export type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number];

export const DEFAULT_PACKAGE_PRICES: Record<PackageKey, number> = {
  [PACKAGE_BOOST]: 10000,
  [PACKAGE_SUPER_BOOST]: 60000,
};

export const NGENIUS_PENDING_PUBLISH_KEY = "ngenius_pending_publish_car_id";

export type CatalogPackagePrices = Partial<Record<PackageKey, number>>;

export function packagePriceIqd(
  packageKey: PackageKey,
  prices?: CatalogPackagePrices | null,
): number {
  return prices?.[packageKey] ?? DEFAULT_PACKAGE_PRICES[packageKey] ?? 0;
}

export function formatIqd(amount: number): string {
  return amount.toLocaleString("en-US");
}
