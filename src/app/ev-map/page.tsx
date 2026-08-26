import { EvMapClient } from "./ev-map-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "EV charging map — Iraq Motors",
  description:
    "Find EV charging stations across Iraq. Filter by city, connector type, power, and access.",
};

export default function EvMapPage() {
  return <EvMapClient />;
}
