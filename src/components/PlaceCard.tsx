import { Check } from "lucide-react";
import Link from "next/link";
import { getMessages } from "@/i18n";
import { coverPhoto } from "@/lib/places/format";
import type { PlaceSummary } from "@/lib/places/types";
import { FamilyBadge } from "./FamilyBadge";
import { Photo } from "./Photo";

export function PlaceCard({ place, note, visited = false }: { place: PlaceSummary; note?: string; visited?: boolean }) {
  const t = getMessages();
  const cover = coverPhoto(place.place_media);
  return (
    <Link href={`/lieu/${place.slug}`} className="glass flex min-h-20 items-center gap-3 overflow-hidden rounded-3xl p-2.5">
      <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-lagon/50">
        {cover ? (
          <>
            <Photo src={cover.external_url} width={250} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute bottom-0.5 right-0.5">
              <FamilyBadge family={place.family} size={24} />
            </span>
          </>
        ) : (
          <FamilyBadge family={place.family} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-lg font-semibold">{place.name}</span>
        <span className="block truncate text-sm text-encre/80">
          {note ?? [t.families[place.family], place.locality].filter(Boolean).join(" · ")}
        </span>
      </span>
      {visited ? (
        <span className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-passe text-white" title={t.place.checkinDone}>
          <Check size={18} strokeWidth={3} aria-label={t.place.checkinDone} />
        </span>
      ) : place.price_kind === "free" ? (
        <span className="mr-1 shrink-0 rounded-full bg-filao px-2.5 py-1 text-xs font-semibold text-white">{t.place.free}</span>
      ) : null}
    </Link>
  );
}
