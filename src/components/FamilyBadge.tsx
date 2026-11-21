import { FAMILY_STYLE } from "@/lib/places/families";
import type { Family } from "@/lib/places/types";

const SHAPE_CLASS = { circle: "rounded-full", square: "rounded-lg", diamond: "rotate-45 rounded-md" } as const;

/** Pastille de famille : forme + couleur + icône. Sert de marqueur et d'illustration. */
export function FamilyBadge({ family, size = 36 }: { family: Family; size?: number }) {
  const { color, shape, icon: Icon } = FAMILY_STYLE[family];
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center border-2 border-encre shadow-sm ${SHAPE_CLASS[shape]}`}
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <Icon size={size * 0.52} strokeWidth={2.25} className={`text-encre ${shape === "diamond" ? "-rotate-45" : ""}`} />
    </span>
  );
}
