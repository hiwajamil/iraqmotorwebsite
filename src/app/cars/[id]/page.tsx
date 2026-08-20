import type { Metadata } from "next";
import { api, type Car } from "@/lib/api";
import { formatAskPrice } from "@/lib/car-pricing-trust";
import { formatCarTitle } from "@/lib/listing-display";
import CarDetailClient from "./car-detail-client";

async function loadListing(id: string): Promise<Car | null> {
  try {
    return await api.get<Car>(`/cars/${id}`, undefined, { revalidate: 30 });
  } catch {
    return null;
  }
}

function listingImage(car: Car): string | undefined {
  if (car.imageUrl) return String(car.imageUrl);
  if (Array.isArray(car.imageUrls) && car.imageUrls[0]) {
    return String(car.imageUrls[0]);
  }
  return undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const car = await loadListing(id);
  if (!car) {
    return { title: "Listing not found — Iraq Motors" };
  }
  const title = formatCarTitle(car) || "Car listing";
  const price = formatAskPrice(car);
  const image = listingImage(car);
  return {
    title: `${title} · ${price} | Iraq Motors`,
    description: price,
    openGraph: {
      title,
      description: price,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const car = await loadListing(id);
  return <CarDetailClient key={id} id={id} initialCar={car} />;
}
