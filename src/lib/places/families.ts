import {
  Bike,
  Footprints,
  Landmark,
  Sailboat,
  Store,
  Trees,
  Umbrella,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { Family } from "./types";

export type MarkerShape = "circle" | "square" | "diamond";

/**
 * Chaque famille se reconnaît par une forme ET une couleur (jamais la couleur seule).
 * L'icône est toujours Encre : toutes ces couleurs de fond donnent un contraste AA avec elle.
 */
export const FAMILY_STYLE: Record<Family, { color: string; shape: MarkerShape; icon: LucideIcon }> = {
  plages_lagon: { color: "#0FB5BA", shape: "circle", icon: Umbrella },
  cascades_rivieres: { color: "#7CC6F2", shape: "diamond", icon: Waves },
  randos_sommets: { color: "#FF6B4A", shape: "diamond", icon: Footprints },
  nature_parcs: { color: "#6FBF8F", shape: "circle", icon: Trees },
  culture_patrimoine: { color: "#FFC53D", shape: "square", icon: Landmark },
  villages_marches: { color: "#F6EEDF", shape: "square", icon: Store },
  manger: { color: "#FF9E8A", shape: "square", icon: UtensilsCrossed },
  mer_activites: { color: "#9FD9DB", shape: "circle", icon: Sailboat },
  sport_loisirs: { color: "#FFE08A", shape: "diamond", icon: Bike },
};
