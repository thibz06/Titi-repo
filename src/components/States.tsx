import type { ReactNode } from "react";
import { getMessages } from "@/i18n";
import type { PublicEnvName } from "@/lib/env";

export function Notice({
  title,
  children,
  tone = "neutral",
  action,
}: {
  title: string;
  children?: ReactNode;
  tone?: "neutral" | "warning";
  action?: ReactNode;
}) {
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={`rounded-2xl border-2 p-4 ${tone === "warning" ? "border-corail bg-white" : "border-encre/10 bg-white/60"}`}
    >
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {children ? <div className="mt-1 text-base leading-snug">{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function MissingConfig({ names }: { names: PublicEnvName[] }) {
  const t = getMessages().config;
  return (
    <Notice title={t.title} tone="warning">
      <p>{t.body}</p>
      <ul className="mt-2 space-y-1">
        {names.map((name) => (
          <li key={name}>
            <code className="break-all rounded bg-sable px-1.5 py-0.5 text-sm">{name}</code>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm">{t.hint}</p>
    </Notice>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-encre/10 ${className}`} />;
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-encre bg-lagon px-5 font-semibold text-encre"
    >
      {children}
    </button>
  );
}
