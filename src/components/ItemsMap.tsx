"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MapItemPoint {
  id: string;
  title: string;
  report_type: "lost" | "found";
  location_name: string;
  latitude: number | null;
  longitude: number | null;
}

interface ItemsMapProps {
  items: MapItemPoint[];
  heightClassName?: string;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function ItemsMap({
  items,
  heightClassName = "h-80",
}: ItemsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  const mappedItems = items.filter(
    (item): item is MapItemPoint & { latitude: number; longitude: number } =>
      typeof item.latitude === "number" && typeof item.longitude === "number"
  );

  useEffect(() => {
    let active = true;

    async function renderMap() {
      if (!containerRef.current) return;
      const L = await import("leaflet");
      if (!active || !containerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const defaultCenter: [number, number] =
        mappedItems.length > 0
          ? [mappedItems[0].latitude, mappedItems[0].longitude]
          : [24.861, 67.001];

      const map = L.map(containerRef.current, {
        center: defaultCenter,
        zoom: mappedItems.length === 1 ? 13 : 4,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      if (mappedItems.length > 0) {
        const bounds = L.latLngBounds([]);
        for (const item of mappedItems) {
          const isLost = item.report_type === "lost";
          const marker = L.circleMarker([item.latitude, item.longitude], {
            radius: 9,
            color: isLost ? "#b45309" : "#047857",
            fillColor: isLost ? "#f59e0b" : "#10b981",
            fillOpacity: 0.85,
            weight: 2,
          }).addTo(map);

          const badge = isLost ? "LOST" : "FOUND";
          marker.bindPopup(
            `<div style="font-family:sans-serif;min-width:140px;">
              <div style="font-size:11px;font-weight:700;color:${
                isLost ? "#b45309" : "#047857"
              }">${badge}</div>
              <div style="font-weight:600;margin:2px 0;">${escapeHtml(
                item.title
              )}</div>
              <div style="font-size:12px;color:#475569;margin-bottom:4px;">${escapeHtml(
                item.location_name
              )}</div>
              <a href="/items/${encodeURIComponent(
                item.id
              )}" style="font-size:12px;color:#059669;text-decoration:underline;">View Details</a>
            </div>`
          );

          bounds.extend([item.latitude, item.longitude]);
        }

        if (mappedItems.length > 1) {
          map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
        }
      }

      mapRef.current = map;
    }

    renderMap();

    return () => {
      active = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mappedItems]);

  return (
    <div
      ref={containerRef}
      className={`${heightClassName} w-full rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-0`}
    />
  );
}

