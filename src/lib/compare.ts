import type { Car } from "@/lib/api";
import { formatAskPrice } from "@/lib/car-pricing-trust";
import { formatCarTitle } from "@/lib/listing-display";
import {
  formatMileageLabel,
  listingFeatureKeys,
  localizeCity,
  localizeOption,
  normalizeOptionKey,
  stringField,
} from "@/lib/listing-labels";
import { FEATURE_KEYS } from "@/lib/listing-form-options";
import { t, type Locale } from "@/lib/i18n";
import type { CompareCar } from "@/store/compare-store";

export function carCoverImage(car: Pick<Car, "imageUrl" | "imageUrls">): string {
  if (car.imageUrl) return String(car.imageUrl);
  if (Array.isArray(car.imageUrls) && car.imageUrls[0]) {
    return String(car.imageUrls[0]);
  }
  return "/placeholder-car.svg";
}

export function parseCompareIds(raw: string | string[] | null | undefined): string[] {
  const text = Array.isArray(raw) ? raw.join(",") : String(raw ?? "");
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of text.split(/[,|]/)) {
    const id = part.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= 3) break;
  }
  return ids;
}

export function listingShareUrl(carId: string): string {
  if (typeof window === "undefined") return `/cars/${carId}`;
  return `${window.location.origin}/cars/${carId}`;
}

export async function shareListing(carId: string, title: string): Promise<"shared" | "copied"> {
  const url = listingShareUrl(carId);
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}

export function carHasFeature(car: Car, featureKey: string): boolean {
  const keys = listingFeatureKeys(car).map(normalizeOptionKey);
  const target = normalizeOptionKey(featureKey);
  const short = target.replace(/^feature_/, "");
  return keys.some((key) => key === target || key === short || key.replace(/^feature_/, "") === short);
}

export type CompareCell =
  | { kind: "text"; text: string }
  | { kind: "bool"; value: boolean };

export type CompareRow = {
  id: string;
  label: string;
  cells: CompareCell[];
};

export type CompareSection = {
  id: string;
  title: string;
  rows: CompareRow[];
};

function textCell(value: string | null | undefined): CompareCell {
  const text = value?.trim() || "—";
  return { kind: "text", text };
}

function dashIfEmpty(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  return text || "—";
}

export function buildCompareSections(cars: Car[], locale: Locale): CompareSection[] {
  const brand = (car: Car) =>
    localizeOption(locale, stringField(car, "brandId", "make")) ||
    stringField(car, "brandId", "make");
  const model = (car: Car) =>
    localizeOption(locale, stringField(car, "modelKey", "model")) ||
    stringField(car, "modelKey", "model");

  const overview: CompareRow[] = [
    {
      id: "brand",
      label: t(locale, "specBrand"),
      cells: cars.map((car) => textCell(brand(car))),
    },
    {
      id: "model",
      label: t(locale, "specModel"),
      cells: cars.map((car) => textCell(model(car))),
    },
    {
      id: "year",
      label: t(locale, "specYear"),
      cells: cars.map((car) => textCell(car.year != null ? String(car.year) : "")),
    },
    {
      id: "price",
      label: t(locale, "sellPrice"),
      cells: cars.map((car) => textCell(formatAskPrice(car))),
    },
    {
      id: "mileage",
      label: t(locale, "specMileage"),
      cells: cars.map((car) =>
        textCell(formatMileageLabel(locale, car.mileageValue, car.mileageUnit)),
      ),
    },
    {
      id: "city",
      label: t(locale, "specCity"),
      cells: cars.map((car) =>
        textCell(
          localizeCity(locale, stringField(car, "city", "province")) || t(locale, "iraq"),
        ),
      ),
    },
    {
      id: "condition",
      label: t(locale, "specCondition"),
      cells: cars.map((car) =>
        textCell(localizeOption(locale, stringField(car, "conditionKey", "condition"))),
      ),
    },
    {
      id: "color",
      label: t(locale, "specColor"),
      cells: cars.map((car) =>
        textCell(localizeOption(locale, stringField(car, "colorKey", "color"))),
      ),
    },
    {
      id: "body",
      label: t(locale, "specBody"),
      cells: cars.map((car) =>
        textCell(localizeOption(locale, stringField(car, "bodyTypeKey", "bodyType"))),
      ),
    },
    {
      id: "import",
      label: t(locale, "specImport"),
      cells: cars.map((car) =>
        textCell(localizeOption(locale, stringField(car, "importCountryKey"))),
      ),
    },
    {
      id: "plate",
      label: t(locale, "specPlate"),
      cells: cars.map((car) => {
        const type = localizeOption(locale, stringField(car, "plateTypeKey"));
        const city = localizeCity(locale, stringField(car, "plateCityKey"));
        return textCell([type, city].filter(Boolean).join(" · "));
      }),
    },
    {
      id: "seats",
      label: t(locale, "specSeats"),
      cells: cars.map((car) =>
        textCell(
          localizeOption(locale, stringField(car, "seatCountKey")) ||
            (car.numberOfSeats != null || car.number_of_seats != null
              ? String(car.numberOfSeats ?? car.number_of_seats)
              : ""),
        ),
      ),
    },
    {
      id: "seatMaterial",
      label: t(locale, "specSeatMaterial"),
      cells: cars.map((car) =>
        textCell(
          localizeOption(locale, stringField(car, "seatMaterialKey", "seat_material")),
        ),
      ),
    },
  ];

  const engine: CompareRow[] = [
    {
      id: "fuel",
      label: t(locale, "specFuel"),
      cells: cars.map((car) =>
        textCell(localizeOption(locale, stringField(car, "fuelKey", "fuel", "engine"))),
      ),
    },
    {
      id: "engineSize",
      label: t(locale, "specEngineSize"),
      cells: cars.map((car) =>
        textCell(localizeOption(locale, stringField(car, "engineSizeKey"))),
      ),
    },
    {
      id: "cylinders",
      label: t(locale, "specCylinders"),
      cells: cars.map((car) =>
        textCell(localizeOption(locale, stringField(car, "cylindersKey"))),
      ),
    },
    {
      id: "horsepower",
      label: t(locale, "specHorsepower"),
      cells: cars.map((car) => {
        const hp = stringField(car, "horsepower");
        return textCell(hp ? `${hp} ${t(locale, "specHorsepowerUnit")}` : "");
      }),
    },
    {
      id: "transmission",
      label: t(locale, "specTransmission"),
      cells: cars.map((car) =>
        textCell(localizeOption(locale, stringField(car, "transmissionKey", "transmission"))),
      ),
    },
    {
      id: "drivetrain",
      label: t(locale, "specDrivetrain"),
      cells: cars.map((car) =>
        textCell(
          localizeOption(locale, stringField(car, "drivetrainKey", "drivetrain")),
        ),
      ),
    },
  ];

  const listedKeys = new Set<string>();
  const featureRows: CompareRow[] = FEATURE_KEYS.map((key) => {
    listedKeys.add(normalizeOptionKey(key));
    return {
      id: key,
      label: localizeOption(locale, key) || key,
      cells: cars.map((car) => ({ kind: "bool" as const, value: carHasFeature(car, key) })),
    };
  });

  const extraKeys = new Set<string>();
  for (const car of cars) {
    for (const key of listingFeatureKeys(car)) {
      const normalized = normalizeOptionKey(key);
      if (!normalized || listedKeys.has(normalized) || listedKeys.has(`feature_${normalized}`)) {
        continue;
      }
      extraKeys.add(key);
    }
  }
  for (const key of extraKeys) {
    featureRows.push({
      id: `extra_${key}`,
      label: localizeOption(locale, key) || key,
      cells: cars.map((car) => ({ kind: "bool" as const, value: carHasFeature(car, key) })),
    });
  }

  return [
    { id: "overview", title: t(locale, "compareOverview"), rows: overview },
    { id: "engine", title: t(locale, "compareEngine"), rows: engine },
    { id: "features", title: t(locale, "compareFeaturesSection"), rows: featureRows },
  ];
}

export function cellKey(cell: CompareCell): string {
  return cell.kind === "bool" ? String(cell.value) : cell.text;
}

export function rowIsCommon(row: CompareRow): boolean {
  if (row.cells.length < 2) return false;
  const first = cellKey(row.cells[0]!);
  return row.cells.every((cell) => cellKey(cell) === first);
}

export function rowDiffers(row: CompareRow): boolean {
  return !rowIsCommon(row);
}

export function compareTitle(car: CompareCar | Car, locale: Locale): string {
  return formatCarTitle(car, locale) || t(locale, "carListing");
}

export function comparePrice(car: CompareCar | Car): string {
  return formatAskPrice(car as Car);
}

export function compareMileage(car: CompareCar | Car, locale: Locale): string {
  return (
    formatMileageLabel(locale, car.mileageValue, car.mileageUnit) || "—"
  );
}

export function compareCity(car: CompareCar | Car, locale: Locale): string {
  return (
    localizeCity(locale, String(car.city || car.province || "")) || t(locale, "iraq")
  );
}

export { dashIfEmpty };
