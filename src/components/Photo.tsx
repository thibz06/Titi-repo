"use client";

import { useState } from "react";
import { commonsThumb } from "@/lib/places/format";

/**
 * Photo d'un lieu. Charge une miniature Wikimedia à la bonne taille plutôt que l'original
 * (souvent plusieurs Mo) ; si elle échoue, tente l'original, puis s'efface pour laisser le fond.
 */
export function Photo({
  src,
  local,
  width,
  className,
  eager = false,
}: {
  src: string;
  /** Copie hébergée dans l'app : essayée en premier. */
  local?: string | null;
  width: number;
  className?: string;
  eager?: boolean;
}) {
  const candidates = [...new Set([...(local ? [local] : []), commonsThumb(src, width), src])];
  const [index, setIndex] = useState(0);
  const current = candidates[index];
  if (!current) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fichier Wikimedia Commons, servi tel quel
    <img
      src={current}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setIndex((i) => i + 1)}
      className={className}
    />
  );
}
