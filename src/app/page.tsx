import { Search } from "lucide-react";
import Link from "next/link";
import { FamilyBadge } from "@/components/FamilyBadge";
import { HomeWeather } from "@/components/HomeWeather";
import { PhotoCard } from "@/components/PhotoCard";
import { ProgressCard } from "@/components/ProgressCard";
import { loadPlanData, loadSummaries } from "@/content/load";
import { getMessages } from "@/i18n";
import { coverPhoto } from "@/lib/places/format";
import { FAMILIES } from "@/lib/places/types";

export default function HomePage() {
  const t = getMessages();
  const places = loadSummaries();
  // À la une : d'abord les lieux qui ont une photo, incontournables en tête, un seul par région pour varier.
  const ranked = [...places].sort(
    (a, b) =>
      Number(!!coverPhoto(b.place_media)?.storage_path) - Number(!!coverPhoto(a.place_media)?.storage_path) ||
      Number(!!coverPhoto(b.place_media)) - Number(!!coverPhoto(a.place_media)) ||
      Number(b.rarity === "incontournable") - Number(a.rarity === "incontournable") ||
      a.name.localeCompare(b.name, "fr"),
  );
  const seen = new Set<string>();
  const featured = [...ranked.filter((p) => !seen.has(p.region) && seen.add(p.region)), ...ranked].filter((p, i, list) => list.indexOf(p) === i).slice(0, 8);
  const families = FAMILIES.filter((f) => places.some((p) => p.family === f));

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-[calc(104px+env(safe-area-inset-bottom))]">
      <header className="flex items-end justify-between gap-4 px-5 pt-[max(2rem,env(safe-area-inset-top))]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-passe">{t.home.kicker}</p>
          <h1 className="mt-1 font-display text-4xl font-semibold leading-tight">{t.home.title}</h1>
        </div>
        <Link href="/explorer" aria-label={t.home.search} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-passe text-white shadow-[0_8px_20px_rgb(11_79_108/0.35)]">
          <Search size={24} aria-hidden />
        </Link>
      </header>
      <p className="mt-2 px-5 text-base text-encre/80">{t.home.pitch}</p>

      <nav aria-label={t.home.nearTitle} className="mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {families.map((f) => (
          <Link key={f} href={`/explorer?famille=${f}`} className="glass inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full pl-1.5 pr-4 text-sm font-semibold">
            <FamilyBadge family={f} size={32} />
            {t.families[f]}
          </Link>
        ))}
      </nav>

      <section className="mt-6">
        <div className="flex items-baseline justify-between px-5">
          <h2 className="font-display text-2xl font-semibold">{t.home.featuredTitle}</h2>
          <Link href="/explorer" className="inline-flex min-h-11 items-center text-sm font-semibold text-passe underline-offset-2 hover:underline">
            {t.home.seeAll}
          </Link>
        </div>
        <ul className="mt-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 pt-1">
          {featured.map((place) => (
            <li key={place.id} className="w-[72%] shrink-0 snap-center">
              <PhotoCard place={place} />
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-4 px-5">
        <ProgressCard places={places} />
        <HomeWeather starts={loadPlanData().starts} />
      </div>
    </main>
  );
}
