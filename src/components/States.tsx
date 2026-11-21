import type { ReactNode } from "react";

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
      className={`glass rounded-3xl p-4 ${tone === "warning" ? "glass-strong outline outline-2 outline-corail" : ""}`}
    >
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {children ? <div className="mt-1 text-base leading-snug">{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
