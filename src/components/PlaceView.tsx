"use client";

import { ArrowLeft, Heart, Navigation } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { fill, getMessages } from "@/i18n";
import { hasSupabase, missingPublicEnv } from "@/lib/env";
import { directionsUrl, formatDateFr, formatDuration, formatPriceMur } from "@/lib/places/format";
import { useFavoriteIds, usePlace, useToggleFavorite } from "@/lib/places/hooks";
import type { PlaceDetail } from "@/lib/places/types";
import { useOnline } from "@/lib/useOnline";
import { FamilyBadge } from "./FamilyBadge";
import { useSession } from "./Providers";
import { MissingConfig, Notice, PrimaryButton, Skeleton } from "./States";

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
    <section className="mt-7">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  const t = getMessages();
  return (
    <div className="rounded-2xl border-2 border-encre/10 bg-white/70 p-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-encre/75">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${value ? "text-lg" : "text-base text-encre/75"}`}>{value ?? t.common.unknown}</dd>
    </div>
  );
}

function Cover({ place }: { place: PlaceDetail }) {
  const t = getMessages();
  const cover = place.place_media.find((m) => m.kind === "photo" && m.is_cover && m.external_url);
  if (cover?.external_url) {
    return (
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element -- fichier Wikimedia Commons, servi tel quel */}
        <img src={cover.external_url} alt="" className="h-56 w-full object-cover" />
        <figcaption className="px-5 pt-1.5 text-xs text-encre/75">
          {cover.source_url ? (
            <a href={cover.source_url} target="_blank" rel="noreferrer" className="underline">
              {fill(t.place.photoCredit, { credit: cover.credit, license: cover.license })}
            </a>
          ) : (
            fill(t.place.photoCredit, { credit: cover.credit, license: cover.license })
          )}
        </figcaption>
      </figure>
    );
  }
  return (
    <div className="grid h-40 place-items-center bg-lagon" role="img" aria-label={fill(t.place.illustration, { family: t.families[place.family] })}>
      <FamilyBadge family={place.family} size={72} />
    </div>
  );
}

function FavoriteButton({ placeId }: { placeId: string }) {
  const t = getMessages().place;
  const session = useSession();
  const { data: ids = [] } = useFavoriteIds();
  const toggle = useToggleFavorite();
  const on = ids.includes(placeId);
  return (
    <>
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? t.favoriteRemove : t.favoriteAdd}
        disabled={session.status !== "ready"}
        onClick={() => toggle.mutate({ placeId, on: !on })}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-encre bg-white disabled:opacity-50"
      >
        <Heart size={24} aria-hidden className={on ? "fill-corail text-encre" : "text-encre"} />
      </button>
      {toggle.isError ? (
        <p role="alert" className="absolute inset-x-4 -top-12 rounded-xl bg-encre px-3 py-2 text-sm text-white">
          {t.favoriteError}
        </p>
      ) : null}
    </>
  );
}

function PlaceContent({ place }: { place: PlaceDetail }) {
  const t = getMessages();
  const price = formatPriceMur(place);
  const priceText =
    price.kind === "free" ? t.place.free : price.kind === "amount" ? price.text : price.kind === "variable" ? t.place.variablePrice : null;

  return (
    <>
      <Cover place={place} />
      <div className="px-5 pb-32 pt-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-passe">
          {[t.families[place.family], place.locality, place.regions?.name].filter(Boolean).join(" · ")}
        </p>
        <h1 className="mt-1 font-display text-4xl font-semibold leading-tight">{place.name}</h1>
        {place.pitch ? <p className="mt-2 text-lg leading-snug">{place.pitch}</p> : null}

        {place.tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {place.tags.map((tag) => (
              <li key={tag} className="rounded-full border-2 border-encre/15 bg-white/70 px-3 py-1 text-sm font-medium">
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
        {place.price_resident_mur != null ? (
          <p className="mt-2 text-sm">{fill(t.place.residentPrice, { price: `${place.price_resident_mur} Rs` })}</p>
        ) : null}
        {place.price_note ? <p className="mt-2 text-sm text-encre/80">{place.price_note}</p> : null}

        {place.description_md ? (
          <div className="mt-6">
            <Paragraphs text={place.description_md} />
          </div>
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
                <p className="mt-1 text-sm text-encre/80">{fill(t.place.hoursRaw, { value: place.opening_hours })}</p>
              ) : null}
            </>
          ) : (
            <p className="text-encre/75">{t.common.unknown}</p>
          )}
        </Section>

        <Section title={t.place.sources}>
          {place.verified_at ? (
            <p className="mb-2 text-sm font-semibold text-filao">{fill(t.place.verifiedOn, { date: formatDateFr(place.verified_at) })}</p>
          ) : null}
          <ul className="space-y-2 text-sm">
            {place.place_sources.map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer" className="inline-block min-h-11 break-words py-1 underline">
                  {source.title ?? source.url}
                </a>
                <span className="block text-encre/75">{fill(t.place.sourceAccessed, { date: formatDateFr(source.accessed_at) })}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t-2 border-encre/10 bg-sable">
        <div className="relative mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <a
            href={directionsUrl(place)}
            target="_blank"
            rel="noreferrer"
            title={t.place.goHint}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-encre bg-lagon text-lg font-semibold text-encre"
          >
            <Navigation size={20} aria-hidden />
            {t.place.go}
          </a>
          <FavoriteButton placeId={place.id} />
        </div>
      </div>
    </>
  );
}

export function PlaceView({ slug }: { slug: string }) {
  const t = getMessages();
  const online = useOnline();
  const { data: place, isPending, isError, refetch } = usePlace(slug);

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-[calc(64px+env(safe-area-inset-bottom))]">
      <Link
        href="/explorer"
        aria-label={t.place.backToMap}
        className="fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 grid h-11 w-11 place-items-center rounded-full border-2 border-encre bg-sable"
      >
        <ArrowLeft size={22} aria-hidden />
      </Link>

      {!hasSupabase ? (
        <div className="p-5 pt-20">
          <MissingConfig names={missingPublicEnv(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])} />
        </div>
      ) : isPending ? (
        <div aria-busy="true" aria-label={t.common.loading}>
          <Skeleton className="h-40 rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        </div>
      ) : isError ? (
        <div className="p-5 pt-20">
          <Notice
            title={t.place.errorTitle}
            tone="warning"
            action={<PrimaryButton onClick={() => refetch()}>{t.common.retry}</PrimaryButton>}
          >
            {online ? null : t.common.offline}
          </Notice>
        </div>
      ) : place ? (
        <PlaceContent place={place} />
      ) : (
        <div className="p-5 pt-20">
          <Notice title={t.place.notFoundTitle}>{t.place.notFoundBody}</Notice>
        </div>
      )}
    </main>
  );
}
