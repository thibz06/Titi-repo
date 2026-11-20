import Link from "next/link";
import { getMessages } from "@/i18n";
import type { PlaceSummary } from "@/lib/places/types";
import { FamilyBadge } from "./FamilyBadge";

export function PlaceCard({ place }: { place: PlaceSummary }) {
  const t = getMessages();
  return (
    <Link
      href={`/lieu/${place.slug}`}
      className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-encre/10 bg-white/70 p-3"
    >
      <FamilyBadge family={place.family} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{place.name}</span>
        <span className="block truncate text-sm text-encre/75">
          {[t.families[place.family], place.locality].filter(Boolean).join(" · ")}
        </span>
      </span>
      {place.price_kind === "free" ? (
        <span className="shrink-0 rounded-full bg-filao px-2.5 py-1 text-xs font-semibold text-white">{t.place.free}</span>
      ) : null}
    </Link>
  );
}
