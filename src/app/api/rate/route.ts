// GET /api/rate — taux roupie mauricienne / euro, daté, avec sa source.
// Source : open.er-api.com (ExchangeRate-API, accès libre sans clé, attribution demandée).
import { NextResponse } from "next/server";
import { z } from "zod";

export const revalidate = 43200; // 12 heures

const upstream = z.object({
  result: z.literal("success"),
  time_last_update_unix: z.number(),
  rates: z.object({ MUR: z.number().positive() }),
});

// Débit limité par instance : 30 requêtes par minute et par adresse.
const hits = new Map<string, { count: number; reset: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 30;
}

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnu";
  if (limited(ip)) return NextResponse.json({ error: "Trop de requêtes, réessaie dans une minute." }, { status: 429 });
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/EUR", { next: { revalidate } });
    if (!res.ok) throw new Error(`source ${res.status}`);
    const data = upstream.parse(await res.json());
    return NextResponse.json(
      {
        murPerEur: data.rates.MUR,
        date: new Date(data.time_last_update_unix * 1000).toISOString().slice(0, 10),
        source: "ExchangeRate-API (open.er-api.com)",
        sourceUrl: "https://www.exchangerate-api.com",
      },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=43200" } },
    );
  } catch {
    return NextResponse.json({ error: "Le taux de change est indisponible pour le moment." }, { status: 502 });
  }
}
