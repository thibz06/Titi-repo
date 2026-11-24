import Link from "next/link";
import { Notice } from "@/components/States";
import { getMessages } from "@/i18n";

export default function NotFound() {
  const t = getMessages();
  return (
    <main className="mx-auto min-h-dvh max-w-md p-5 pt-16">
      <div aria-hidden className="app-backdrop fixed inset-0 -z-10" />
      <Notice
        title={t.place.notFoundTitle}
        action={
          <Link href="/explorer" className="inline-flex min-h-11 items-center rounded-full bg-passe px-5 font-semibold text-white">
            {t.place.backToMap}
          </Link>
        }
      >
        {t.place.notFoundBody}
      </Notice>
    </main>
  );
}
