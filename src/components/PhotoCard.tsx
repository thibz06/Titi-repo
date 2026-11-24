import { MapPin } from "lucide-react";
import Link from "next/link";
import { getMessages } from "@/i18n";
import { coverPhoto } from "@/lib/places/format";
import { FAMILY_STYLE } from "@/lib/places/families";
import type { PlaceSummary } from "@/lib/places/types";
import { FamilyBadge } from "./FamilyBadge";
import { Photo } from "./Photo";

/** Grande carte photo : la photo créditée du lieu, sinon un aplat à la couleur de sa famille. */
export function PhotoCard({ place, className = "" }: { place: PlaceSummary; className?: string }) {
  const t = getMessages();
  const cover = coverPhoto(place.place_media);
  return (
    <Link
      href={`/lieu/${place.slug}`}
      className={`relative block aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[0_10px_30px_rgb(16_34_43/0.18)] ${className}`}
      style={{ backgroundColor: FAMILY_STYLE[place.family].color }}
    >
      {cover ? (
        <Photo src={cover.external_url} local={cover.storage_path} width={500} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 grid place-items-center pb-16">
          <FamilyBadge family={place.family} size={84} />
        </span>
      )}
      <span className="photo-scrim absolute inset-x-0 bottom-0 h-3/5" />
      <span className="frost absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-encre">{t.families[place.family]}</span>
      <span className="absolute inset-x-0 bottom-0 p-4 text-white">
        <span className="block font-display text-2xl font-semibold leading-tight">{place.name}</span>
        <span className="mt-1 flex items-center gap-1 text-sm">
          <MapPin size={15} aria-hidden />
          {[place.locality, t.regions[place.region]].filter(Boolean).join(" · ")}
        </span>
      </span>
    </Link>
  );
}
