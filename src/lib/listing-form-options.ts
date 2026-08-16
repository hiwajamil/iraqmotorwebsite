/** Canonical option keys for the sell listing form (aligned with Flutter). */

export const COLOR_KEYS = [
  "color_black",
  "color_white",
  "color_silver",
  "color_gray",
  "color_red",
  "color_blue",
  "color_green",
] as const;

export const YEAR_OPTIONS = Array.from({ length: 2026 - 1990 + 1 }, (_, i) =>
  String(2026 - i),
);

export const PLATE_TYPE_KEYS = [
  "plate_private",
  "plate_temporary",
  "plate_commercial",
  "plate_cargo",
  "plate_government",
  "plate_diplomatic",
  "plate_taxi",
] as const;

export const PLATE_CITY_KEYS = [
  "erbil",
  "sulaymaniyah",
  "dohuk",
  "kirkuk",
  "baghdad",
  "mosul",
  "basra",
  "maysan",
  "najaf",
  "karbala",
  "anbar",
  "halabja",
] as const;

export const FUEL_KEYS = [
  "engine_petrol",
  "engine_hybrid",
  "engine_ev",
  "engine_diesel",
  "fuel_plug_in_hybrid",
  "fuel_lpg",
] as const;

export const IMPORT_ORIGIN_KEYS = [
  "import_usa",
  "import_gcc",
  "import_local",
  "import_europe",
  "import_uae",
  "import_canada",
  "import_korea",
  "import_china",
  "import_japan",
] as const;

export const TRANSMISSION_KEYS = [
  "transmission_automatic",
  "transmission_manual",
  "transmission_cvt",
  "transmission_dual_clutch",
] as const;

export const DRIVETRAIN_KEYS = [
  "drivetrain_fwd",
  "drivetrain_rwd",
  "drivetrain_awd",
  "drivetrain_4wd",
] as const;

export const CYLINDER_KEYS = [
  "cylinders_3",
  "cylinders_4",
  "cylinders_5",
  "cylinders_6",
  "cylinders_8",
  "cylinders_10",
  "cylinders_12",
  "cylinders_16",
  "cylinders_ev",
] as const;

export const ENGINE_SIZE_KEYS = [
  "engine_0_0_ev",
  "engine_1_0",
  "engine_1_2",
  "engine_1_3",
  "engine_1_4",
  "engine_1_5",
  "engine_1_6",
  "engine_1_8",
  "engine_2_0",
  "engine_2_4",
  "engine_2_5",
  "engine_2_7",
  "engine_3_0",
  "engine_3_3",
  "engine_3_5",
  "engine_3_6",
  "engine_3_8",
  "engine_4_0",
  "engine_4_4",
  "engine_4_6",
  "engine_4_8",
  "engine_5_0",
  "engine_5_3",
  "engine_5_7",
  "engine_6_0",
  "engine_6_2",
  "engine_6_4",
  "engine_6_6",
  "engine_6_8",
  "engine_8_0_plus",
] as const;

export const SEAT_MATERIAL_KEYS = [
  "seat_fabric",
  "seat_leather",
  "seat_semi_leather",
  "seat_alcantara",
  "seat_alcantara_leather",
] as const;

export const SEAT_COUNT_KEYS = [
  "seats_2",
  "seats_4",
  "seats_5",
  "seats_6",
  "seats_7",
  "seats_8",
  "seats_9",
  "seats_10_plus",
] as const;

export const PAINTED_PARTS_KEYS = [
  "condition_clean_title",
  "condition_no_paint",
  "condition_damage_1",
  "condition_damage_2",
  "condition_damage_3",
  "condition_damage_4",
  "condition_damage_5",
  "condition_damage_6",
] as const;

export const FEATURE_KEYS = [
  "feature_sunroof",
  "feature_panoramic_roof",
  "feature_radar",
  "feature_rear_camera",
  "feature_radar_mirror",
  "feature_cruise_control",
  "feature_apple_carplay",
  "feature_screen",
  "feature_smart_key",
  "feature_electric_seat",
  "feature_seat_heater",
  "feature_steering_heater",
  "feature_electric_mirror",
  "feature_abs",
  "feature_awd",
  "feature_xenon_light",
  "feature_auto_headlight",
  "feature_tire_pressure",
  "feature_wireless_charger",
  "feature_anti_theft",
  "feature_parking_brake",
  "feature_sensitive",
  "feature_horn",
  "feature_speed_sign",
  "feature_speaker_8",
  "feature_driver_attention",
] as const;

export const PHOTO_SLOT_COUNT = 9;

export function isDamagePaintedParts(key: string): boolean {
  return key.startsWith("condition_damage_");
}

export function colorSwatch(key: string): string {
  switch (key) {
    case "color_red":
      return "#E53935";
    case "color_blue":
      return "#1E88E5";
    case "color_gray":
      return "#9E9E9E";
    case "color_black":
      return "#212121";
    case "color_white":
      return "#FAFAFA";
    case "color_silver":
      return "#BDBDBD";
    case "color_green":
      return "#43A047";
    default:
      return "#9E9E9E";
  }
}

export function cylindersFromKey(key: string): number | null {
  if (key === "cylinders_ev") return 0;
  const match = key.match(/^cylinders_(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function engineSizeFromKey(key: string): number | null {
  if (key === "engine_0_0_ev") return 0;
  const match = key.match(/^engine_(\d+)_(\d+)/);
  if (!match) return null;
  return Number(`${match[1]}.${match[2]}`);
}

export function seatsFromKey(key: string): number | null {
  if (key === "seats_10_plus") return 10;
  const match = key.match(/^seats_(\d+)$/);
  return match ? Number(match[1]) : null;
}
