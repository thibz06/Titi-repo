"use client";

import { MarkerClusterer, type Marker } from "@googlemaps/markerclusterer";
import { AdvancedMarker, APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useRef, useState } from "react";
import { publicEnv } from "@/lib/env";
import type { PlaceSummary } from "@/lib/places/types";
import { FamilyBadge } from "./FamilyBadge";

// Cadrage de la vue sur l'île entière (réglage d'affichage, pas une donnée de fiche).
const ISLAND_VIEW = { center: { lat: -20.25, lng: 57.58 }, zoom: 10 } as const;
const ISLAND_BOUNDS = { north: -19.6, south: -20.85, west: 56.9, east: 58.2 } as const;

function Markers({ places, selectedId, onSelect }: { places: PlaceSummary[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const map = useMap();
  const clusterer = useRef<MarkerClusterer | null>(null);
  const [markers, setMarkers] = useState<Record<string, Marker>>({});

  useEffect(() => {
    if (!map) return;
    clusterer.current = new MarkerClusterer({ map });
    return () => {
      clusterer.current?.clearMarkers();
      clusterer.current = null;
    };
  }, [map]);

  useEffect(() => {
    clusterer.current?.clearMarkers();
    clusterer.current?.addMarkers(Object.values(markers));
  }, [markers, map]);

  const setMarkerRef = useCallback((marker: Marker | null, id: string) => {
    setMarkers((prev) => {
      if (marker && prev[id] === marker) return prev;
      if (!marker && !(id in prev)) return prev;
      const next = { ...prev };
      if (marker) next[id] = marker;
      else delete next[id];
      return next;
    });
  }, []);

  return places.map((place) => (
    <AdvancedMarker
      key={place.id}
      position={{ lat: place.lat, lng: place.lng }}
      title={place.name}
      zIndex={place.id === selectedId ? 10 : 1}
      onClick={() => onSelect(place.id)}
      ref={(marker) => setMarkerRef(marker, place.id)}
    >
      {/* Zone tactile de 44 px autour de la pastille. */}
      <span className="grid h-11 w-11 place-items-center">
        <FamilyBadge family={place.family} size={place.id === selectedId ? 40 : 32} />
      </span>
    </AdvancedMarker>
  ));
}

export function ExploreMap({
  places,
  selectedId,
  onSelect,
  onError,
  label,
}: {
  places: PlaceSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onError: () => void;
  label: string;
}) {
  const apiKey = publicEnv.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = publicEnv.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  if (!apiKey || !mapId) return null;
  return (
    <APIProvider apiKey={apiKey} language="fr" region="MU" onError={onError}>
      <div role="region" aria-label={label} className="h-full w-full">
        <Map
          mapId={mapId}
          defaultCenter={ISLAND_VIEW.center}
          defaultZoom={ISLAND_VIEW.zoom}
          minZoom={9}
          restriction={{ latLngBounds: ISLAND_BOUNDS, strictBounds: false }}
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
          className="h-full w-full"
        >
          <Markers places={places} selectedId={selectedId} onSelect={onSelect} />
        </Map>
      </div>
    </APIProvider>
  );
}
