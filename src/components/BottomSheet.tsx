"use client";

import { animate, motion, useDragControls, useMotionValue, type PanInfo } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type SheetSnap = "peek" | "half" | "full";
const ORDER: SheetSnap[] = ["peek", "half", "full"];
// Hauteur visible au cran « aperçu » : le contenu (156 px) plus la place de la barre d'onglets flottante,
// derrière laquelle la feuille se prolonge pour ne laisser aucune bande de carte en bas d'écran.
const TAB_BAR_SPACE = 104;
const PEEK_HEIGHT = 156 + TAB_BAR_SPACE;

/**
 * Feuille basse à trois crans (aperçu, liste, plein écran). Elle suit le doigt quand on tire
 * la poignée ; la poignée est aussi un bouton qui passe au cran suivant (clavier, lecteur d'écran).
 */
export function BottomSheet({
  snap,
  onSnapChange,
  handleLabel,
  header,
  children,
}: {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  handleLabel: string;
  header: ReactNode;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const y = useMotionValue(0);
  const controls = useDragControls();
  const dragged = useRef(false);

  const offsetFor = useCallback(
    (s: SheetSnap) => (s === "full" ? 0 : s === "half" ? Math.round(height * 0.45) : Math.max(0, height - PEEK_HEIGHT)),
    [height],
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (height === 0) return;
    const controlsAnim = animate(y, offsetFor(snap), { type: "tween", duration: 0.25, ease: "easeOut" });
    return () => controlsAnim.stop();
  }, [snap, height, offsetFor, y]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const projected = y.get() + info.velocity.y * 0.2;
    const nearest = ORDER.reduce((best, s) => (Math.abs(offsetFor(s) - projected) < Math.abs(offsetFor(best) - projected) ? s : best));
    if (nearest === snap) animate(y, offsetFor(snap), { type: "tween", duration: 0.2 });
    else onSnapChange(nearest);
  }

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <motion.section
        style={{ y, height: height || "100%" }}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: Math.max(0, height - PEEK_HEIGHT) }}
        dragElastic={0.05}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={onDragEnd}
        className="pointer-events-auto absolute inset-x-0 top-0 mx-auto flex max-w-md flex-col glass rounded-t-[2rem]"
      >
        <div onPointerDown={(e) => controls.start(e)} className="shrink-0 touch-none">
          <button
            type="button"
            aria-label={handleLabel}
            aria-expanded={snap !== "peek"}
            onClick={() => {
              if (dragged.current) return void (dragged.current = false);
              onSnapChange(ORDER[(ORDER.indexOf(snap) + 1) % ORDER.length] as SheetSnap);
            }}
            className="grid h-11 w-full place-items-center"
          >
            <span className="h-1.5 w-12 rounded-full bg-encre/40" />
          </button>
          <div className="px-4 pb-3">{header}</div>
        </div>
        <div className={`min-h-0 flex-1 px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] ${snap === "peek" ? "overflow-hidden" : "overflow-y-auto"}`}>{children}</div>
      </motion.section>
    </div>
  );
}
