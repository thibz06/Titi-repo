import { PlaceView } from "@/components/PlaceView";

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PlaceView slug={slug} />;
}
