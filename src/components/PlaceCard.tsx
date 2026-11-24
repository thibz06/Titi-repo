import { Check } from "lucide-react";
import Link from "next/link";
import { getMessages } from "@/i18n";
import { coverPhoto } from "@/lib/places/format";
import { FAMILY_STYLE } from "@/lib/places/families";
import type { PlaceSummary } from "@/lib/places/types";
import { FamilyBadge } from "./FamilyBadge";
import { Photo } from "./Photo";

export function PlaceCard({ place, note, visited = false }: { place: PlaceSummary; note?: string; visited?: boolean }) {
  const t = getMessages();
  const cover = coverPhoto(place.place_media);
  return (
    <Link href={`/lieu/${place.slug}`} className="glass flex min-h-24 items-center gap-3 overflow-hidden rounded-[1.75rem] p-2">
      <span
        className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.35rem]"
        style={{ backgroundColor: `${FAMILY_STYLE[place.family].color}66` }}
      >
        {cover ? <Photo src={cover.external_url} local={cover.storage_path} width={250} className="absolute inset-0 h-full w-full object-cover" /> : <FamilyBadge family={place.family} size={40} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-lg font-semibold">{place.name}</span>
        <span className="block truncate text-sm text-encre/75">
          {note ?? [t.families[place.family], place.locality].filter(Boolean).join(" · ")}
        </span>
        {place.price_kind === "free" && !visited ? (
          <span className="mt-1 inline-block rounded-full bg-filao px-2.5 py-0.5 text-xs font-semibold text-white">{t.place.free}</span>
        ) : null}
      </span>
      {visited ? (
        <span className="mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-passe text-white" title={t.place.checkinDone}>
          <Check size={18} strokeWidth={3} aria-label={t.place.checkinDone} />
        </span>
      ) : null}
    </Link>
  );
}
