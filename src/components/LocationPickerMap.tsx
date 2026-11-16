"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, MapPin, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface LocationPickerMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}

function roundForPrivacy(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function LocationPickerMap({
  latitude,
  longitude,
  onChange,
}: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);

  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let active = true;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (!active || !containerRef.current) return;

      const initialLat = latitude ?? 24.861;
      const initialLng = longitude ?? 67.001;

      const map = L.map(containerRef.current, {
        center: [initialLat, initialLng],
        zoom: latitude !== null ? 13 : 4,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      if (latitude !== null && longitude !== null) {
        markerRef.current = L.circleMarker([latitude, longitude], {
          radius: 9,
          color: "#047857",
          fillColor: "#10b981",
          fillOpacity: 0.75,
          weight: 2,
        }).addTo(map);
      }

      map.on("click", (event) => {
        const lat = roundForPrivacy(event.latlng.lat);
        const lng = roundForPrivacy(event.latlng.lng);
        onChangeRef.current(lat, lng);
      });

      mapRef.current = map;
    }

    initMap();

    return () => {
      active = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function syncMarker() {
      const map = mapRef.current;
      if (!map) return;
      const L = await import("leaflet");
      if (cancelled) return;

      if (latitude === null || longitude === null) {
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        return;
      }

      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        markerRef.current = L.circleMarker([latitude, longitude], {
          radius: 9,
          color: "#047857",
          fillColor: "#10b981",
          fillOpacity: 0.75,
          weight: 2,
        }).addTo(map);
      }
      map.setView([latitude, longitude], Math.max(map.getZoom(), 13));
    }
    syncMarker();
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  function handleUseMyLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Location access is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(
          roundForPrivacy(pos.coords.latitude),
          roundForPrivacy(pos.coords.longitude)
        );
      },
      () => {
        setGeoError("Could not read your location. You can click the map instead.");
      }
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-slate-600 dark:text-slate-400 inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          Click on the map to pin an approximate area (rounded for privacy).
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Use My Location
          </button>
          {latitude !== null && longitude !== null && (
            <button
              type="button"
              onClick={() => onChange(null, null)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Clear Pin
            </button>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-64 w-full rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-0"
      />

      {geoError && (
        <p className="text-xs text-amber-700 dark:text-amber-400">{geoError}</p>
      )}

      {latitude !== null && longitude !== null && (
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
          Approximate pin: {latitude.toFixed(3)}, {longitude.toFixed(3)}
        </p>
      )}
    </div>
  );
}

