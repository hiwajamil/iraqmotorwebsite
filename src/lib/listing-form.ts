import {
  PHOTO_SLOT_COUNT,
  cylindersFromKey,
  engineSizeFromKey,
  isDamagePaintedParts,
  seatsFromKey,
} from "@/lib/listing-form-options";
import type { DictKey } from "@/lib/i18n";
import {
  PAYMENT_DEBIT_CARD,
  PACKAGE_BOOST,
  type PackageKey,
  type PaymentMethodKey,
} from "@/lib/listing-packages";

export type ListingDraft = {
  province: string;
  city: string;
  imageUrls: string[];
  brandId: string;
  modelKey: string;
  trim: string;
  colorKey: string;
  year: string;
  plateTypeKey: string;
  plateCityKey: string;
  mileageValue: string;
  mileageUnit: "km" | "mi";
  fuelKey: string;
  importCountryKey: string;
  transmissionKey: string;
  drivetrainKey: string;
  cylindersKey: string;
  engineSizeKey: string;
  seatMaterialKey: string;
  seatCountKey: string;
  paintedPartsKey: string;
  damagePhotoUrl: string;
  extraFeatures: string[];
  description: string;
  priceValue: string;
  currencyKey: "currency_iqd" | "currency_usd";
  packageKey: PackageKey;
  paymentMethodKey: PaymentMethodKey;
};

export const emptyListingDraft: ListingDraft = {
  province: "",
  city: "",
  imageUrls: [],
  brandId: "",
  modelKey: "",
  trim: "",
  colorKey: "",
  year: "",
  plateTypeKey: "",
  plateCityKey: "",
  mileageValue: "",
  mileageUnit: "km",
  fuelKey: "",
  importCountryKey: "",
  transmissionKey: "",
  drivetrainKey: "",
  cylindersKey: "",
  engineSizeKey: "",
  seatMaterialKey: "",
  seatCountKey: "",
  paintedPartsKey: "",
  damagePhotoUrl: "",
  extraFeatures: [],
  description: "",
  priceValue: "",
  currencyKey: "currency_iqd",
  packageKey: PACKAGE_BOOST,
  paymentMethodKey: PAYMENT_DEBIT_CARD,
};

export type ListingField = keyof ListingDraft;

export type ListingFieldError = {
  field: ListingField;
  messageKey: DictKey;
};

const REQUIRED: ListingField[] = [
  "province",
  "city",
  "brandId",
  "modelKey",
  "colorKey",
  "year",
  "plateTypeKey",
  "plateCityKey",
  "mileageValue",
  "fuelKey",
  "importCountryKey",
  "transmissionKey",
  "drivetrainKey",
  "cylindersKey",
  "engineSizeKey",
  "seatMaterialKey",
  "seatCountKey",
  "paintedPartsKey",
  "priceValue",
];

export function validateListingDraft(
  draft: ListingDraft,
  options?: { requirePackagePayment?: boolean },
): ListingFieldError[] {
  const errors: ListingFieldError[] = [];
  const push = (field: ListingField, messageKey: DictKey) => {
    errors.push({ field, messageKey });
  };

  for (const field of REQUIRED) {
    if (!String(draft[field] ?? "").trim()) {
      push(field, "sellRequired");
    }
  }

  if (draft.imageUrls.length < 1) {
    push("imageUrls", "sellNeedPhoto");
  }

  const year = Number(draft.year);
  const maxYear = new Date().getFullYear() + 1;
  if (draft.year && (!year || year < 1980 || year > maxYear)) {
    push("year", "sellInvalidYear");
  }

  const mileage = Number(draft.mileageValue.replace(/,/g, ""));
  if (draft.mileageValue !== "" && (!Number.isFinite(mileage) || mileage < 0)) {
    push("mileageValue", "sellInvalidMileage");
  }

  const price = Number(draft.priceValue.replace(/,/g, ""));
  if (draft.priceValue !== "" && (!Number.isFinite(price) || price <= 0)) {
    push("priceValue", "sellInvalidPrice");
  }

  if (isDamagePaintedParts(draft.paintedPartsKey) && !draft.damagePhotoUrl) {
    push("damagePhotoUrl", "sellNeedDamagePhoto");
  }

  if (options?.requirePackagePayment) {
    if (!draft.packageKey) {
      push("packageKey", "sellRequired");
    }
    if (!draft.paymentMethodKey) {
      push("paymentMethodKey", "sellRequired");
    }
  }

  return errors;
}

export function listingDraftToPayload(draft: ListingDraft) {
  const cylinders = cylindersFromKey(draft.cylindersKey);
  const engineSize = engineSizeFromKey(draft.engineSizeKey);
  const numberOfSeats = seatsFromKey(draft.seatCountKey);
  const mileageValue = draft.mileageValue
    ? Number(draft.mileageValue.replace(/,/g, ""))
    : null;
  const priceValue = draft.priceValue
    ? Number(draft.priceValue.replace(/,/g, ""))
    : null;

  return {
    province: draft.province,
    city: draft.city,
    brandId: draft.brandId,
    modelKey: draft.modelKey,
    trim: draft.trim.trim() || null,
    year: draft.year || null,
    colorKey: draft.colorKey,
    plateTypeKey: draft.plateTypeKey,
    plate_type: draft.plateTypeKey,
    plateCityKey: draft.plateCityKey,
    plate_city: draft.plateCityKey,
    mileageValue,
    mileageUnit: draft.mileageUnit,
    fuelKey: draft.fuelKey,
    importCountryKey: draft.importCountryKey,
    import_origin: draft.importCountryKey,
    transmissionKey: draft.transmissionKey,
    drivetrainKey: draft.drivetrainKey,
    drivetrain: draft.drivetrainKey,
    cylindersKey: draft.cylindersKey,
    cylinders,
    engineSizeKey: draft.engineSizeKey,
    engine_size: engineSize,
    engineSize,
    seatMaterialKey: draft.seatMaterialKey,
    seat_material: draft.seatMaterialKey,
    seatCountKey: draft.seatCountKey,
    number_of_seats: numberOfSeats,
    numberOfSeats,
    conditionKey: draft.paintedPartsKey,
    painted_parts: draft.paintedPartsKey,
    paintedPartsKey: draft.paintedPartsKey,
    extra_features: draft.extraFeatures,
    extraFeatures: draft.extraFeatures,
    features: draft.extraFeatures,
    damage_photo_url: draft.damagePhotoUrl || null,
    damagePhotoUrl: draft.damagePhotoUrl || null,
    damageImageUrls: draft.damagePhotoUrl ? [draft.damagePhotoUrl] : [],
    imageUrls: draft.imageUrls.slice(0, PHOTO_SLOT_COUNT),
    imageUrl: draft.imageUrls[0] || null,
    description: draft.description.trim() || null,
    priceValue,
    currencyKey: draft.currencyKey,
    packageKey: draft.packageKey,
    paymentMethodKey: draft.paymentMethodKey,
  };
}

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return asStringList(parsed);
    } catch {
      return value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/** Hydrate the sell form from an owner listing (GET /cars/:id). */
export function listingDraftFromCar(
  car: Record<string, unknown>,
): ListingDraft {
  const imageUrls = asStringList(car.imageUrls);
  const single = asString(car.imageUrl);
  const photos = (imageUrls.length ? imageUrls : single ? [single] : []).slice(
    0,
    PHOTO_SLOT_COUNT,
  );
  const currencyRaw = asString(car.currencyKey).toLowerCase();
  const currencyKey =
    currencyRaw.includes("usd") || currencyRaw === "usd"
      ? ("currency_usd" as const)
      : ("currency_iqd" as const);
  const mileageUnit =
    asString(car.mileageUnit).toLowerCase() === "mi"
      ? ("mi" as const)
      : ("km" as const);
  const damage =
    asString(car.damagePhotoUrl) ||
    asString(car.damage_photo_url) ||
    asStringList(car.damageImageUrls)[0] ||
    "";
  const painted =
    asString(car.paintedPartsKey) ||
    asString(car.painted_parts) ||
    asString(car.conditionKey) ||
    "";
  const features = asStringList(
    car.extraFeatures ?? car.extra_features ?? car.features,
  );

  return {
    province: asString(car.province),
    city: asString(car.city),
    imageUrls: photos,
    brandId: asString(car.brandId),
    modelKey: asString(car.modelKey),
    trim: asString(car.trim),
    colorKey: asString(car.colorKey),
    year: car.year != null && car.year !== "" ? String(car.year) : "",
    plateTypeKey: asString(car.plateTypeKey) || asString(car.plate_type),
    plateCityKey: asString(car.plateCityKey) || asString(car.plate_city),
    mileageValue:
      car.mileageValue != null && car.mileageValue !== ""
        ? String(car.mileageValue)
        : "",
    mileageUnit,
    fuelKey: asString(car.fuelKey),
    importCountryKey:
      asString(car.importCountryKey) || asString(car.import_origin),
    transmissionKey: asString(car.transmissionKey),
    drivetrainKey: asString(car.drivetrainKey) || asString(car.drivetrain),
    cylindersKey: asString(car.cylindersKey),
    engineSizeKey: asString(car.engineSizeKey),
    seatMaterialKey:
      asString(car.seatMaterialKey) || asString(car.seat_material),
    seatCountKey: asString(car.seatCountKey),
    paintedPartsKey: painted,
    damagePhotoUrl: damage,
    extraFeatures: features,
    description: asString(car.description),
    priceValue:
      car.priceValue != null && car.priceValue !== ""
        ? String(car.priceValue)
        : "",
    currencyKey,
    packageKey:
      (asString(car.packageKey) as PackageKey) || PACKAGE_BOOST,
    paymentMethodKey:
      (asString(car.paymentMethodKey) as PaymentMethodKey) ||
      PAYMENT_DEBIT_CARD,
  };
}
