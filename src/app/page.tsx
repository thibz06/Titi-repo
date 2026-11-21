import { Compass } from "lucide-react";
import Link from "next/link";
import { ProgressCard } from "@/components/ProgressCard";
import { HomeWeather } from "@/components/HomeWeather";
import { loadPlanData, loadSummaries } from "@/content/load";
import { getMessages } from "@/i18n";

export default function HomePage() {
  const t = getMessages().home;
  const places = loadSummaries();
  const principles = [t.principles.sourced, t.principles.budget, t.principles.noPressure, t.principles.offline];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div aria-hidden className="app-backdrop fixed inset-0 -z-10" />
      <header className="px-6 pb-8 pt-[max(2.5rem,env(safe-area-inset-top))] text-encre">
        <p className="text-sm font-semibold uppercase tracking-widest">{t.kicker}</p>
        <h1 className="mt-2 font-display text-5xl font-semibold leading-none">{t.title}</h1>
        <p className="mt-4 text-lg leading-snug">{t.pitch}</p>
        <Link
          href="/explorer"
          className="glass glass-strong mt-6 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-lg font-semibold text-encre"
        >
          <Compass size={22} aria-hidden />
          {t.openMap}
        </Link>
      </header>

      <div className="px-4">
        <ProgressCard places={places} />
        <div className="mt-3">
          <HomeWeather starts={loadPlanData().starts} />
        </div>
      </div>

      <section className="px-4 pb-[calc(104px+env(safe-area-inset-bottom))] pt-6">
        <h2 className="px-2 font-display text-2xl font-semibold">{t.principlesTitle}</h2>
        <ul className="mt-4 space-y-3">
          {principles.map((text) => (
            <li key={text} className="glass flex gap-3 rounded-3xl p-4 text-base leading-snug">
              <span aria-hidden className="mt-1.5 h-3 w-3 shrink-0 rotate-45 bg-corail" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
