"use client";

import { ArrowLeft, ExternalLink, Heart, MapPin, Navigation, Search } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { fill, getMessages } from "@/i18n";
import { coverPhoto, creditedPhotos, directionsUrl, formatDateFr, formatDuration, formatPriceMur, tiktokSearchUrl } from "@/lib/places/format";
import { useFavorites } from "@/lib/favorites";
import { FAMILY_STYLE } from "@/lib/places/families";
import { formatEur, useRate } from "@/lib/useRate";
import { CheckIn } from "./CheckIn";
import { Photo } from "./Photo";
import type { PlaceDetail } from "@/lib/places/types";
import { FamilyBadge } from "./FamilyBadge";

function Paragraphs({ text }: { text: string }) {
  return text
    .split(/\n{2,}/)
    .map((block, i) => (
      <p key={i} className="mt-2 leading-relaxed first:mt-0">
        {block}
      </p>
    ));
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass mt-3 rounded-3xl p-5">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  const t = getMessages();
  return (
    <div className="rounded-2xl bg-brume p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-encre/80">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${value ? "text-lg" : "text-base text-encre/80"}`}>{value ?? t.common.unknown}</dd>
    </div>
  );
}

/** En-tête photo : la photo créditée du lieu, coins bas arrondis, nom en surimpression. */
function Hero({ place }: { place: PlaceDetail }) {
  const t = getMessages();
  const cover = coverPhoto(place.place_media);
  const credit = cover ? fill(t.place.photoCredit, { credit: cover.credit, license: cover.license }) : null;
  return (
    <header
      className="relative flex h-[46dvh] min-h-72 flex-col justify-end overflow-hidden rounded-b-[2.5rem] shadow-[0_12px_32px_rgb(16_34_43/0.2)]"
      style={{ backgroundColor: FAMILY_STYLE[place.family].color }}
    >
      {cover ? (
        <Photo src={cover.external_url} local={cover.storage_path} width={960} eager className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div role="img" aria-label={fill(t.place.illustration, { family: t.families[place.family] })} className="absolute inset-0 grid place-items-center pb-24">
          <FamilyBadge family={place.family} size={96} />
        </div>
      )}
      <div className="photo-scrim absolute inset-x-0 bottom-0 h-2/3" />
      <div className="relative px-5 pb-6 text-white">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <MapPin size={16} aria-hidden />
          {[place.locality, place.regions?.name].filter(Boolean).join(" · ")}
        </p>
        <h1 className="mt-1 font-display text-4xl font-semibold leading-tight">{place.name}</h1>
      </div>
      {cover && credit ? (
        cover.source_url ? (
          <a href={cover.source_url} target="_blank" rel="noreferrer" className="frost absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] inline-flex min-h-11 max-w-[70%] items-center rounded-full px-3 text-xs text-encre underline">
            <span className="truncate">{credit}</span>
          </a>
        ) : (
          <p className="frost absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] max-w-[70%] truncate rounded-full px-3 py-2 text-xs text-encre">{credit}</p>
        )
      ) : null}
    </header>
  );
}

function FavoriteButton({ slug }: { slug: string }) {
  const t = getMessages().place;
  const { ids, toggle } = useFavorites();
  const [failed, setFailed] = useState(false);
  const on = ids.includes(slug);
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? t.favoriteRemove : t.favoriteAdd}
        onClick={() => setFailed(!toggle(slug))}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brume"
      >
        <Heart size={24} aria-hidden className={on ? "fill-corail text-encre" : "text-encre"} />
      </button>
      {failed ? (
        <p role="alert" className="absolute inset-x-2 -top-14 rounded-2xl bg-encre px-3 py-2 text-sm text-white">
          {t.favoriteError}
        </p>
      ) : null}
    </>
  );
}

function PlaceContent({ place, regionSlugs }: { place: PlaceDetail; regionSlugs: string[] }) {
  const t = getMessages();
  const price = formatPriceMur(place);
  const rate = useRate();
  const photos = creditedPhotos(place.place_media);
  const priceText =
    price.kind === "free" ? t.place.free : price.kind === "amount" ? price.text : price.kind === "variable" ? t.place.variablePrice : null;

  return (
    <>
      <Hero place={place} />
      <div className="px-4 pb-44 pt-4">
        <div className="glass rounded-3xl p-5">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-braise">
          <FamilyBadge family={place.family} size={28} />
          {t.families[place.family]}
        </p>
        {place.pitch ? <p className="mt-2 text-lg leading-snug">{place.pitch}</p> : null}

        {place.tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {place.tags.map((tag) => (
              <li key={tag} className="rounded-full bg-brume px-3 py-1 text-sm font-medium">
                {(t.tags as Record<string, string>)[tag] ?? tag}
              </li>
            ))}
          </ul>
        ) : null}

        <dl className="mt-5 grid grid-cols-2 gap-3">
          <Stat label={t.place.stats.travel} value={null} />
          <Stat label={t.place.stats.duration} value={formatDuration(place.duration_min, place.duration_max)} />
          <Stat label={t.place.stats.price} value={priceText} />
          <Stat
            label={t.place.stats.difficulty}
            value={place.difficulty != null ? fill(t.place.difficultyValue, { value: place.difficulty }) : null}
          />
        </dl>
        {rate && place.price_visitor_mur_min != null && place.price_visitor_mur_min > 0 ? (
          <p className="mt-2 text-sm">
            {fill(t.place.priceEur, { eur: formatEur(place.price_visitor_mur_min, rate), date: formatDateFr(rate.date) })} ({rate.source})
          </p>
        ) : null}
        {place.price_resident_mur != null ? (
          <p className="mt-2 text-sm">{fill(t.place.residentPrice, { price: `${place.price_resident_mur} Rs` })}</p>
        ) : null}
        {place.price_note ? <p className="mt-2 text-sm text-encre/85">{place.price_note}</p> : null}

        {place.description_md ? (
          <div className="mt-5">
            <Paragraphs text={place.description_md} />
          </div>
        ) : null}
        </div>

        {photos.length > 1 ? (
          <section className="glass mt-3 rounded-3xl py-5">
            <h2 className="px-5 font-display text-2xl font-semibold">{t.place.photosTitle}</h2>
            <ul className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
              {photos.map((photo, i) => (
                <li key={photo.id} className="w-[78%] shrink-0 snap-center">
                  <figure>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-lagon/40" role="img" aria-label={fill(t.place.photoN, { n: i + 1, total: photos.length })}>
                      <Photo src={photo.external_url} local={photo.storage_path} width={500} className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                    <figcaption className="mt-1.5 text-xs text-encre/85">
                      {photo.source_url ? (
                        <a href={photo.source_url} target="_blank" rel="noreferrer" className="inline-block min-h-11 underline">
                          {fill(t.place.photoCredit, { credit: photo.credit, license: photo.license })}
                        </a>
                      ) : (
                        fill(t.place.photoCredit, { credit: photo.credit, license: photo.license })
                      )}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {place.secret ? (
          <section className="mt-3 rounded-3xl border border-or/50 bg-basalte p-5 text-sable shadow-[0_10px_30px_rgb(16_34_43/0.3)]">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-or">
              <span aria-hidden className="h-2.5 w-2.5 rotate-45 bg-or" />
              {t.place.secretKicker}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{t.place.secretTitle}</h2>
            <div className="mt-2 text-[1.05rem]">
              <Paragraphs text={place.secret.story_md} />
            </div>
            {(
              [
                [t.place.secretWhy, place.secret.why_unknown_md],
                [t.place.secretAccess, place.secret.access_md],
                [t.place.secretPrecautions, place.secret.precautions_md],
              ] as const
            ).map(([title, text]) =>
              text ? (
                <div key={title} className="mt-5">
                  <h3 className="font-display text-xl font-semibold text-or">{title}</h3>
                  <div className="mt-1">
                    <Paragraphs text={text} />
                  </div>
                </div>
              ) : null,
            )}
          </section>
        ) : null}

        {place.why_go_md ? (
          <Section title={t.place.whyGo}>
            <Paragraphs text={place.why_go_md} />
          </Section>
        ) : null}

        {place.likes.length > 0 ? (
          <Section title={t.place.likes}>
            <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
              {place.likes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        {place.watchouts.length > 0 ? (
          <Section title={t.place.watchouts}>
            <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
              {place.watchouts.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        {place.risk_note ? (
          <Section title={t.place.risk}>
            <p className="rounded-2xl border-2 border-corail bg-white p-3 leading-relaxed">{place.risk_note}</p>
          </Section>
        ) : null}

        {place.tips_md ? (
          <Section title={t.place.tips}>
            <Paragraphs text={place.tips_md} />
          </Section>
        ) : null}

        <Section title={t.place.hours}>
          {place.opening_hours || place.hours_note ? (
            <>
              {place.hours_note ? <p className="leading-relaxed">{place.hours_note}</p> : null}
              {place.opening_hours ? (
                <p className="mt-1 text-sm text-encre/85">{fill(t.place.hoursRaw, { value: place.opening_hours })}</p>
              ) : null}
            </>
          ) : (
            <p className="text-encre/85">{t.common.unknown}</p>
          )}
        </Section>

        {place.website_url ? (
          <a
            href={place.website_url}
            target="_blank"
            rel="noreferrer"
            className="glass mt-3 flex min-h-14 items-center justify-between gap-3 rounded-3xl px-5 font-semibold"
          >
            {t.place.website}
            <ExternalLink size={20} aria-hidden />
          </a>
        ) : null}

        <section className="glass mt-3 rounded-3xl p-5">
          <h2 className="font-display text-2xl font-semibold">{t.place.seeAlso}</h2>
          <a
            href={tiktokSearchUrl(place.name)}
            target="_blank"
            rel="noreferrer"
            className="bg-sun mt-3 flex min-h-12 items-center justify-between gap-3 rounded-full px-5 font-semibold"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Search size={20} aria-hidden className="shrink-0" />
              <span className="truncate">{t.place.tiktok}</span>
            </span>
            <ExternalLink size={18} aria-hidden className="shrink-0" />
          </a>
          <p className="mt-2 text-sm text-encre/85">{t.place.tiktokNote}</p>
        </section>

        <Section title={t.place.sources}>
          {place.verified_at ? (
            <p className="mb-2 text-sm font-semibold text-braise">{fill(t.place.verifiedOn, { date: formatDateFr(place.verified_at) })}</p>
          ) : null}
          <ul className="space-y-2 text-sm">
            {place.place_sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer" className="inline-block min-h-11 break-words py-1 underline">
                  {source.title ?? source.url}
                </a>
                <span className="block text-encre/85">{fill(t.place.sourceAccessed, { date: formatDateFr(source.accessed_at) })}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+max(0.5rem,env(safe-area-inset-bottom)))] z-30 px-4">
        <div className="glass glass-strong pointer-events-auto relative mx-auto flex max-w-sm items-center gap-2 rounded-full p-1.5">
          <a
            href={directionsUrl(place)}
            target="_blank"
            rel="noreferrer"
            title={t.place.goHint}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-sun text-lg font-semibold"
          >
            <Navigation size={20} aria-hidden />
            {t.place.go}
          </a>
          <CheckIn place={place} regionSlugs={regionSlugs} />
          <FavoriteButton slug={place.slug} />
        </div>
      </div>
    </>
  );
}

export function PlaceView({ place, regionSlugs }: { place: PlaceDetail; regionSlugs: string[] }) {
  const t = getMessages();
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <Link
        href="/explorer"
        aria-label={t.place.backToMap}
        className="frost fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 grid h-11 w-11 place-items-center rounded-full text-encre"
      >
        <ArrowLeft size={22} aria-hidden />
      </Link>
      <PlaceContent place={place} regionSlugs={regionSlugs} />
    </main>
  );
}
