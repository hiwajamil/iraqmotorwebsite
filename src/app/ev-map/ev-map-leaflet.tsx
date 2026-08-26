"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { EvLookup, EvMapMarker } from "@/lib/ev-map";

export type EvMapLeafletHandle = {
  locate: () => void;
  invalidate: () => void;
};

type Props = {
  markers: EvMapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUserLocation?: (lat: number, lng: number) => void;
};

const IRAQ_BOUNDS = L.latLngBounds(
  L.latLng(29, 38.5),
  L.latLng(37.8, 48.8),
);

const BOLT_SVG = `<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/></svg>`;

type StatusKind = "active" | "inactive" | "maintenance";

function statusKind(status: EvLookup | undefined | null): StatusKind {
  const raw = `${status?.key ?? ""} ${status?.nameEn ?? ""} ${status?.text ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, "");
  if (raw.includes("maintenance") || raw.includes("maint")) return "maintenance";
  if (
    raw.includes("inactive") ||
    raw.includes("closed") ||
    raw.includes("offline") ||
    raw.includes("disabled")
  ) {
    return "inactive";
  }
  if (status?.id === 1 || raw.includes("active") || raw.includes("open")) {
    return "active";
  }
  return "inactive";
}

function isPlottable(
  lat: number | null,
  lng: number | null,
): lat is number {
  if (lat == null || lng == null) return false;
  if (lat === 0 && lng === 0) return false;
  return lat >= 29 && lat <= 37.8 && lng >= 38.5 && lng <= 48.8;
}

function plottableLatLng(
  lat: number | null,
  lng: number | null,
): [number, number] | null {
  if (!isPlottable(lat, lng) || lng == null) return null;
  return [lat, lng];
}

function pinIcon(kind: StatusKind, selected: boolean) {
  return L.divIcon({
    className: "ev-pin",
    html: `<span class="ev-pin-marker ev-pin-marker--${kind}${selected ? " ev-pin-marker--selected" : ""}">${BOLT_SVG}</span>`,
    iconSize: [36, 44],
    iconAnchor: [18, 42],
    popupAnchor: [0, -36],
  });
}

function clusterIcon(count: number) {
  const size = count < 10 ? "sm" : count < 40 ? "md" : "lg";
  const px = size === "lg" ? 48 : size === "md" ? 40 : 34;
  return L.divIcon({
    className: "ev-cluster-wrap",
    html: `<span class="ev-cluster ev-cluster--${size}">${count}</span>`,
    iconSize: [px, px],
    iconAnchor: [px / 2, px / 2],
  });
}

export const EvMapLeaflet = forwardRef<EvMapLeafletHandle, Props>(
  function EvMapLeaflet({ markers, selectedId, onSelect, onUserLocation }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
    const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;
    const onUserLocationRef = useRef(onUserLocation);
    onUserLocationRef.current = onUserLocation;
    const fittedRef = useRef(false);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({
      locate() {
        const map = mapRef.current;
        if (!map || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const latLng = L.latLng(pos.coords.latitude, pos.coords.longitude);
            onUserLocationRef.current?.(
              pos.coords.latitude,
              pos.coords.longitude,
            );
            if (IRAQ_BOUNDS.pad(0.2).contains(latLng)) {
              map.setView(latLng, 12, { animate: true });
            } else {
              map.setView(IRAQ_BOUNDS.getCenter(), 7, { animate: true });
            }
          },
          () => undefined,
          { enableHighAccuracy: true, timeout: 8000 },
        );
      },
      invalidate() {
        mapRef.current?.invalidateSize();
      },
    }));

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: true,
        zoomControl: true,
        minZoom: 6,
        maxBounds: IRAQ_BOUNDS.pad(0.08),
        maxBoundsViscosity: 0.85,
      }).setView([33.3, 44.0], 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        spiderfyDistanceMultiplier: 1.5,
        removeOutsideVisibleBounds: true,
        maxClusterRadius: 56,
        iconCreateFunction(c) {
          return clusterIcon(c.getChildCount());
        },
      });
      cluster.addTo(map);
      clusterRef.current = cluster;
      mapRef.current = map;
      setReady(true);

      const invalidate = () => map.invalidateSize();
      invalidate();
      const t1 = window.setTimeout(invalidate, 80);
      const t2 = window.setTimeout(invalidate, 320);

      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        map.remove();
        mapRef.current = null;
        clusterRef.current = null;
        markerByIdRef.current.clear();
      };
    }, []);

    useEffect(() => {
      if (!ready) return;
      const map = mapRef.current;
      const cluster = clusterRef.current;
      if (!map || !cluster) return;

      cluster.clearLayers();
      markerByIdRef.current.clear();
      const latLngs: L.LatLngExpression[] = [];

      for (const m of markers) {
        const ll = plottableLatLng(m.latitude, m.longitude);
        if (!ll) continue;
        const kind = statusKind(m.status);
        const selected = m.id === selectedId;
        const marker = L.marker(ll, {
          icon: pinIcon(kind, selected),
          title: m.operatorNameEn || "EV",
        });
        marker.on("click", () => onSelectRef.current(m.id));
        cluster.addLayer(marker);
        markerByIdRef.current.set(m.id, marker);
        latLngs.push(ll);
      }

      if (!fittedRef.current && latLngs.length) {
        map.fitBounds(L.latLngBounds(latLngs).pad(0.12), {
          maxZoom: 12,
          animate: false,
        });
        fittedRef.current = true;
      }
      map.invalidateSize();
    }, [markers, selectedId, ready]);

    useEffect(() => {
      if (!ready || !selectedId) return;
      const map = mapRef.current;
      const cluster = clusterRef.current;
      const marker = markerByIdRef.current.get(selectedId);
      if (!map || !marker) return;

      const reveal = () => {
        map.panTo(marker.getLatLng(), { animate: true });
      };

      if (cluster && cluster.hasLayer(marker)) {
        cluster.zoomToShowLayer(marker, reveal);
      } else {
        reveal();
      }
    }, [selectedId, ready, markers]);

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        aria-label="EV charging map"
      />
    );
  },
);
