import {
  PHOTO_SLOT_COUNT,
  cylindersFromKey,
  engineSizeFromKey,
  isDamagePaintedParts,
  seatsFromKey,
} from "@/lib/listing-form-options";
import type { DictKey } from "@/lib/i18n";

export type ListingDraft = {
  province: string;
  city: string;
  imageUrls: string[];
  brandId: string;
  modelKey: string;
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
};

export const emptyListingDraft: ListingDraft = {
  province: "",
  city: "",
  imageUrls: [],
  brandId: "",
  modelKey: "",
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

export function validateListingDraft(draft: ListingDraft): ListingFieldError[] {
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
  };
}
