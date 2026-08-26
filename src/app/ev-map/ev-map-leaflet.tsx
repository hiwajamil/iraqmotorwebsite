"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { EvMapMarker } from "@/lib/ev-map";
import "leaflet/dist/leaflet.css";

export type EvMapLeafletHandle = {
  locate: () => void;
  invalidate: () => void;
};

type Props = {
  markers: EvMapMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export const EvMapLeaflet = forwardRef<EvMapLeafletHandle, Props>(
  function EvMapLeaflet({ markers, selectedId, onSelect }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<import("leaflet").Map | null>(null);
    const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;
    const fittedRef = useRef(false);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({
      locate() {
        const map = mapRef.current;
        if (!map || !navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 12, {
              animate: true,
            });
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
      let cancelled = false;
      if (!containerRef.current || mapRef.current) return;

      void (async () => {
        const L = await import("leaflet");
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          scrollWheelZoom: true,
          zoomControl: true,
        }).setView([33.3, 44.0], 6);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setReady(true);
        setTimeout(() => map.invalidateSize(), 80);
      })();

      return () => {
        cancelled = true;
      };
    }, []);

    useEffect(() => {
      return () => {
        mapRef.current?.remove();
        mapRef.current = null;
        layerRef.current = null;
      };
    }, []);

    useEffect(() => {
      if (!ready) return;
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;
      void import("leaflet").then((L) => {
        layer.clearLayers();
        const latLngs: import("leaflet").LatLngExpression[] = [];
        for (const m of markers) {
          if (m.latitude == null || m.longitude == null) continue;
          const selected = m.id === selectedId;
          const kw =
            m.maxPowerKw != null ? String(Math.round(m.maxPowerKw)) : "EV";
          const icon = L.divIcon({
            className: "ev-pin",
            html: `<span class="ev-pin-dot${selected ? " ev-pin-dot-active" : ""}">${kw}</span>`,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
          });
          const marker = L.marker([m.latitude, m.longitude], { icon });
          marker.on("click", () => onSelectRef.current(m.id));
          marker.addTo(layer);
          latLngs.push([m.latitude, m.longitude]);
        }
        if (!fittedRef.current && latLngs.length) {
          map.fitBounds(L.latLngBounds(latLngs).pad(0.12), { maxZoom: 12 });
          fittedRef.current = true;
        }
        map.invalidateSize();
      });
    }, [markers, selectedId, ready]);

    useEffect(() => {
      if (!ready || !selectedId) return;
      const map = mapRef.current;
      const m = markers.find((x) => x.id === selectedId);
      if (map && m?.latitude != null && m.longitude != null) {
        map.panTo([m.latitude, m.longitude], { animate: true });
      }
    }, [selectedId, markers, ready]);

    return <div ref={containerRef} className="h-full min-h-[320px] w-full" />;
  },
);
