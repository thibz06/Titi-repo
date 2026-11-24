"use client";

import { CalendarRange, Compass, Home, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMessages } from "@/i18n";

/** Barre d'onglets flottante en verre. Hauteur réservée en bas d'écran : 64 px + marge. */
export function TabBar() {
  const t = getMessages().tabs;
  const pathname = usePathname();
  const tabs = [
    { href: "/", label: t.home, icon: Home, active: pathname === "/" },
    { href: "/explorer", label: t.explore, icon: Compass, active: ["/explorer", "/lieu"].some((p) => pathname.startsWith(p)) },
    { href: "/voyage", label: t.trip, icon: CalendarRange, active: pathname.startsWith("/voyage") },
    { href: "/profil", label: t.profile, icon: UserRound, active: pathname.startsWith("/profil") },
  ];
  return (
    <nav aria-label={t.label} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <ul className="glass pointer-events-auto mx-auto flex h-16 max-w-sm rounded-full p-1.5 shadow-[0_10px_30px_rgb(16_34_43/0.16)]">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-full flex-col items-center justify-center gap-0.5 rounded-full text-xs font-semibold ${
                active ? "bg-passe text-white" : "text-encre/75"
              }`}
            >
              <Icon size={22} strokeWidth={2.25} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
