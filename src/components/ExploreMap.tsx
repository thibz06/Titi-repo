"use client";

import maplibregl, { type GeoJSONSource, type Map as MlMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PlaceSummary } from "@/lib/places/types";
import { FamilyBadge } from "./FamilyBadge";

// Fond de carte OpenFreeMap (données OpenStreetMap) : gratuit, sans clé ni compte.
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
// Cadrage de la vue sur l'île entière (réglage d'affichage, pas une donnée de fiche).
const ISLAND_VIEW = { center: [57.58, -20.25] as [number, number], zoom: 9.2 };
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [56.6, -21.1],
  [58.5, -19.4],
];
const SOURCE = "places";

type Pin = { id: string; el: HTMLElement };

export function ExploreMap({
  places,
  selectedId,
  userPosition = null,
  onSelect,
  onError,
  label,
}: {
  places: PlaceSummary[];
  selectedId: string | null;
  userPosition?: { lat: number; lng: number } | null;
  onSelect: (id: string) => void;
  onError: () => void;
  label: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [ready, setReady] = useState(false);
  const fitted = useRef(false);
  const callbacks = useRef({ onSelect, onError });
  useEffect(() => {
    callbacks.current = { onSelect, onError };
  });

  useEffect(() => {
    if (!container.current) return;
    let loaded = false;
    const map = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE_URL,
      center: ISLAND_VIEW.center,
      zoom: ISLAND_VIEW.zoom,
      minZoom: 8,
      maxBounds: MAX_BOUNDS,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    const markers = new Map<string, Marker>();

    // Marqueurs HTML (forme + couleur par famille) pour les lieux non regroupés.
    const syncPins = () => {
      if (!map.getSource(SOURCE)) return;
      const visible = new Map<string, [number, number]>();
      for (const f of map.querySourceFeatures(SOURCE)) {
        if (f.properties?.cluster || f.geometry.type !== "Point") continue;
        visible.set(String(f.properties?.id), f.geometry.coordinates as [number, number]);
      }
      let changed = false;
      for (const [id, marker] of markers) {
        if (!visible.has(id)) {
          marker.remove();
          markers.delete(id);
          changed = true;
        }
      }
      for (const [id, coords] of visible) {
        if (markers.has(id)) continue;
        const el = document.createElement("div");
        markers.set(id, new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map));
        changed = true;
      }
      if (changed) setPins([...markers].map(([id, m]) => ({ id, el: m.getElement() })));
    };

    map.on("load", () => {
      loaded = true;
      map.addSource(SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 13,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0B4F6C",
          "circle-radius": ["step", ["get", "point_count"], 22, 10, 28, 30, 34],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#F6EEDF",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE,
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 15, "text-font": ["Noto Sans Bold"] },
        paint: { "text-color": "#FFFFFF" },
      });
      map.on("click", "clusters", async (e) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const zoom = await (map.getSource(SOURCE) as GeoJSONSource).getClusterExpansionZoom(feature.properties?.cluster_id as number);
        map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
      });
      setReady(true);
    });
    map.on("render", syncPins);
    // Si le fond de carte ne se charge pas du tout (hors-ligne, service indisponible), on bascule sur la liste.
    map.on("error", () => {
      if (!loaded) callbacks.current.onError();
    });

    return () => {
      mapRef.current = null;
      setReady(false);
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource(SOURCE) as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: places.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: { id: p.id },
      })),
      });
    // Première fois : cadrer sur l'ensemble des lieux (la feuille basse couvre le bas de l'écran).
    if (!fitted.current && places.length > 1) {
      fitted.current = true;
      const lngs = places.map((p) => p.lng);
      const lats = places.map((p) => p.lat);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: { top: 90, bottom: Math.round(map.getContainer().clientHeight * 0.5), left: 30, right: 30 }, animate: false },
      );
    }
  }, [places, ready]);

  // Position de l'utilisateur : un point bleu, et la carte s'y recentre.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPosition) return;
    const el = document.createElement("div");
    el.className = "h-5 w-5 rounded-full border-[3px] border-white bg-[#1a73e8] shadow-[0_0_0_6px_rgb(26_115_232/0.25)]";
    const marker = new maplibregl.Marker({ element: el }).setLngLat([userPosition.lng, userPosition.lat]).addTo(map);
    map.easeTo({ center: [userPosition.lng, userPosition.lat], zoom: Math.max(map.getZoom(), 11.5) });
    return () => {
      marker.remove();
    };
  }, [userPosition]);

  const byId = new Map(places.map((p) => [p.id, p]));
  return (
    <div role="region" aria-label={label} className="h-full w-full">
      <div ref={container} className="h-full w-full" />
      {pins.map(({ id, el }) => {
        const place = byId.get(id);
        if (!place) return null;
        return createPortal(
          <button
            type="button"
            aria-label={place.name}
            aria-pressed={id === selectedId}
            onClick={() => callbacks.current.onSelect(id)}
            className="grid h-11 w-11 place-items-center"
          >
            <FamilyBadge family={place.family} size={id === selectedId ? 40 : 32} />
          </button>,
          el,
          id,
        );
      })}
    </div>
  );
}
