'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import oysterBars from '@/data/oyster-bars.json';

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OysterBar {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  oyster?: string;
  deal: string;
  when: string;
  coordinates: [number, number];
}

// TravelBlog-style popup: white card, rounded corners, shadow, title + content
function createPopupContent(place: OysterBar): string {
  const oysterLine = place.oyster
    ? `<div style="margin-bottom: 4px;"><strong>Oyster:</strong> ${place.oyster}</div>`
    : '';
  const dealLine = place.deal
    ? `<div style="margin-bottom: 4px;"><strong>Deal:</strong> ${place.deal}</div>`
    : '';
  return `
    <div style="max-width: 400px; padding: 16px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <h3 style="font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 12px;">${place.name}</h3>
      <div style="font-size: 14px; color: #374151; line-height: 1.5;">
        <div style="margin-bottom: 6px;"><strong>${place.neighborhood}</strong></div>
        <div style="margin-bottom: 6px; color: #6b7280;">${place.address}</div>
        ${oysterLine}
        ${dealLine}
        <div style="font-size: 12px; color: #6b7280;"><strong>When:</strong> ${place.when}</div>
      </div>
    </div>
  `;
}

const NYC_CENTER: [number, number] = [40.7128, -74.006];
const DEFAULT_ZOOM = 12;

const MAP_THEMES: Record<string, { url: string; attribution: string; name: string }> = {
  'Streets': {
    name: 'Streets',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  'Light': {
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  'Voyager': {
    name: 'Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  'Dark': {
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  'Topo': {
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
};

export default function OysterMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(NYC_CENTER, DEFAULT_ZOOM);
    mapInstanceRef.current = map;

    const baseLayers: L.Control.LayersObject = {};
    const defaultKey = 'Voyager';
    const defaultTheme = MAP_THEMES[defaultKey];

    const defaultLayer = L.tileLayer(defaultTheme.url, {
      maxZoom: 19,
      attribution: defaultTheme.attribution,
    }).addTo(map);
    baseLayers[defaultTheme.name] = defaultLayer;

    Object.entries(MAP_THEMES).forEach(([key, theme]) => {
      if (key === defaultKey) return;
      baseLayers[theme.name] = L.tileLayer(theme.url, {
        maxZoom: 19,
        attribution: theme.attribution,
      });
    });

    L.control.layers(baseLayers, undefined, { collapsed: true }).addTo(map);

    (oysterBars as OysterBar[]).forEach((place) => {
      const marker = L.marker(place.coordinates).addTo(map);
      marker.bindPopup(createPopupContent(place));
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-screen w-full">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
