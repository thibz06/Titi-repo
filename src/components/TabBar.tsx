"use client";

import { Compass, Home, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMessages } from "@/i18n";

export const TAB_BAR_HEIGHT = 64;

export function TabBar() {
  const t = getMessages().tabs;
  const pathname = usePathname();
  const tabs = [
    { href: "/", label: t.home, icon: Home, active: pathname === "/" },
    { href: "/explorer", label: t.explore, icon: Compass, active: pathname.startsWith("/explorer") || pathname.startsWith("/lieu") },
    { href: "/profil", label: t.profile, icon: UserRound, active: pathname.startsWith("/profil") },
  ];
  return (
    <nav
      aria-label={t.label}
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-encre/10 bg-sable pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md" style={{ height: TAB_BAR_HEIGHT }}>
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <li key={href} className="flex-1">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-full flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                active ? "text-passe" : "text-encre/70"
              }`}
            >
              <span className={`grid h-8 w-14 place-items-center rounded-full ${active ? "bg-lagon text-encre" : ""}`}>
                <Icon size={22} strokeWidth={2.25} aria-hidden />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
