import { EvMapClient } from "./ev-map-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Charging Stations — Iraq Motors",
  description:
    "Find charging stations across Iraq. Filter by city, connector type, power, and access.",
};

export default function EvMapPage() {
  return <EvMapClient />;
}
