'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { happyHourStatus, type OysterBar } from '@/lib/bars';

// Esri's gray canvas basemaps are keyless (CARTO's now return an "API key required" tile).
const esri = (layer: string) => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${layer}/MapServer/tile/{z}/{y}/{x}`;
const TILES = {
  light: [esri('World_Light_Gray_Base'), esri('World_Light_Gray_Reference')],
  dark: [esri('World_Dark_Gray_Base'), esri('World_Dark_Gray_Reference')],
};
const ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';

function basemap(dark: boolean): L.LayerGroup {
  const [base, labels] = dark ? TILES.dark : TILES.light;
  return L.layerGroup([
    L.tileLayer(base, { maxZoom: 16, attribution: ATTRIBUTION }),
    L.tileLayer(labels, { maxZoom: 16 }),
  ]);
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function pinIcon(bar: OysterBar, selected: boolean): L.DivIcon {
  const live = happyHourStatus(bar).kind === 'now';
  const classes = ['pin', live && 'pin--live', selected && 'pin--selected'].filter(Boolean).join(' ');
  return L.divIcon({
    className: '',
    html: `<div class="${classes}"><span></span>${selected ? `<b class="pin-label">${escapeHtml(bar.name)}</b>` : ''}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

interface Props {
  bars: OysterBar[];
  selectedId: string | null;
  center: [number, number];
  zoom: number;
  onSelect: (id: string) => void;
}

export default function OysterMap({ bars, selectedId, center, zoom, onSelect }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: false, maxZoom: 16 }).setView(center, zoom);
    mapInstanceRef.current = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    let tiles = basemap(scheme.matches).addTo(map);
    const swapTiles = (e: MediaQueryListEvent) => {
      tiles.remove();
      tiles = basemap(e.matches).addTo(map);
    };
    scheme.addEventListener('change', swapTiles);

    return () => {
      scheme.removeEventListener('change', swapTiles);
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
    };
    // The map is created once; city changes are handled by the flyTo effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers with the filtered list.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const markers = markersRef.current;
    const visible = new Set(bars.map((b) => b.id));

    markers.forEach((marker, id) => {
      if (!visible.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    });
    bars.forEach((bar) => {
      const icon = pinIcon(bar, bar.id === selectedId);
      const existing = markers.get(bar.id);
      if (existing) {
        existing.setIcon(icon);
        existing.setZIndexOffset(bar.id === selectedId ? 1000 : 0);
        return;
      }
      const marker = L.marker(bar.coordinates, { icon, title: bar.name, riseOnHover: true })
        .on('click', () => onSelectRef.current(bar.id))
        .addTo(map);
      markers.set(bar.id, marker);
    });
  }, [bars, selectedId]);

  useEffect(() => {
    mapInstanceRef.current?.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const bar = bars.find((b) => b.id === selectedId);
    if (!map || !bar) return;
    map.flyTo(bar.coordinates, Math.max(map.getZoom(), 15), { duration: 0.6 });
    // Only re-center when the selection changes, not when filters reshuffle the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={mapRef} className="h-full w-full" />;
}
