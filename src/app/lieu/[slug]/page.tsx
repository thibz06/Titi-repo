import { notFound } from "next/navigation";
import { PlaceView } from "@/components/PlaceView";
import { loadPlaces } from "@/content/load";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadPlaces().map((p) => ({ slug: p.slug }));
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const place = loadPlaces().find((p) => p.slug === slug);
  if (!place) notFound();
  const regionSlugs = loadPlaces()
    .filter((p) => p.region === place.region)
    .map((p) => p.slug);
  return <PlaceView place={place} regionSlugs={regionSlugs} />;
}
