"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { useEffect, useRef } from "react";
import { CITY, COAST, LAKES, REGIONS, WORLD, type XY } from "@/data/map-base";
import { PLACES } from "@/data/places";

export interface MarkerGroup {
  key: string;
  x: number;
  y: number;
  precision: "exact" | "place" | "area";
  color: string;
  count: number;
  label: string;
}

export interface FlyTarget {
  x: number;
  y: number;
  zoom?: number;
  nonce: number; // change to re-trigger the same target
}

export const KIND_COLORS: Record<string, string> = {
  breaking: "#e91916",
  crime: "#f97316",
  warrant: "#eab308",
  notice: "#1d9bd1",
  government: "#16a37f",
  report: "#a855f7",
};
export const kindColor = (k: string) => KIND_COLORS[k] ?? "#8a96a3";

/** World (x, y) -> Leaflet LatLng in CRS.Simple: lat = y, lng = x. */
const ll = (x: number, y: number): Leaflet.LatLngExpression => [y, x];
const poly = (pts: XY[]) => pts.map(([x, y]) => ll(x, y));

const IMAGE_URL = process.env.NEXT_PUBLIC_MAP_IMAGE_URL;
const IMAGE_BOUNDS = process.env.NEXT_PUBLIC_MAP_IMAGE_BOUNDS?.split(",").map(Number);

/**
 * Optional raster tiles ({z}/{x}/{y}) for a detailed base map.
 * NEXT_PUBLIC_MAP_TRANSFORM = "a,b,c,d" maps world -> pixels at the tiles'
 * native zoom N:  px = a*X + b,  py = c*Y + d  (c is negative: north is up).
 * The same transform defines the camera even without tiles, so zoom levels
 * mean the same thing in both modes.
 */
const TILES_URL = process.env.NEXT_PUBLIC_MAP_TILES_URL;
const NATIVE_ZOOM = Number(process.env.NEXT_PUBLIC_MAP_TILES_ZOOM ?? 8);
const parsed = process.env.NEXT_PUBLIC_MAP_TRANSFORM?.split(",").map(Number);
const TRANSFORM =
  parsed?.length === 4 && parsed.every(Number.isFinite) ? parsed : [1.853, 31829, -1.853, 40034]; // calibrated to the standard GTA V atlas at z8
const HAS_TILES = Boolean(TILES_URL);

/** Zoom levels used across the map UI (in tile-zoom units). */
export const MAP_HAS_TILES = HAS_TILES;

export const ZOOM = {
  min: 2,
  max: HAS_TILES ? NATIVE_ZOOM : 6, // the schematic has no detail past 6
  place: 5.5,
  event: 5.25,
  area: 4.5,
};

function palette(dark: boolean) {
  return dark
    ? { water: "#0a1620", land: "#1a222b", landLine: "#2f3b47", city: "#232d38", lake: "#0d1d29", label: "#8a96a3", region: "#5b6874" }
    : { water: "#cfe3ee", land: "#eef1ea", landLine: "#b9c4b3", city: "#e2e5e8", lake: "#bcd8e8", label: "#5b6670", region: "#8792a0" };
}

export function GameMap({
  groups,
  selectedKey,
  onSelect,
  fly,
  showPlaces,
  dark,
}: {
  groups: MarkerGroup[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  fly: FlyTarget | null;
  showPlaces: boolean;
  dark: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const baseLayer = useRef<Leaflet.LayerGroup | null>(null);
  const placeLayer = useRef<Leaflet.LayerGroup | null>(null);
  const markerLayer = useRef<Leaflet.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const ready = useRef<Promise<void> | null>(null);

  // --- create the map once ---
  useEffect(() => {
    let disposed = false;
    ready.current = import("leaflet").then((mod) => {
      const Lf = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      if (disposed || !el.current) return;
      L.current = Lf;
      const bounds = Lf.latLngBounds(ll(WORLD.minX, WORLD.minY), ll(WORLD.maxX, WORLD.maxY));
      const k = 2 ** NATIVE_ZOOM;
      const [a, b, c, d] = TRANSFORM;
      const crs = Lf.extend({}, Lf.CRS.Simple, {
        transformation: new Lf.Transformation(a / k, b / k, c / k, d / k),
      }) as Leaflet.CRS;
      const m = Lf.map(el.current, {
        crs,
        minZoom: ZOOM.min,
        maxZoom: ZOOM.max,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 120,
        attributionControl: false,
        zoomControl: false,
        maxBounds: bounds.pad(0.15),
        maxBoundsViscosity: 0.8,
      });
      Lf.control.zoom({ position: "bottomright" }).addTo(m);
      m.fitBounds(Lf.latLngBounds(ll(-3400, -3700), ll(4000, 7300)));
      m.on("click", () => onSelectRef.current(null));
      // Vector base sits below raster tiles, so it fills any gaps in a tile set.
      m.createPane("base").style.zIndex = "150";
      if (TILES_URL) {
        Lf.tileLayer(TILES_URL, {
          tileSize: 256,
          minNativeZoom: 0,
          maxNativeZoom: NATIVE_ZOOM,
          maxZoom: ZOOM.max,
          noWrap: true,
          bounds,
          keepBuffer: 3,
          errorTileUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
        }).addTo(m);
      }
      baseLayer.current = Lf.layerGroup().addTo(m);
      placeLayer.current = Lf.layerGroup().addTo(m);
      markerLayer.current = Lf.layerGroup().addTo(m);
      map.current = m;

      // Region labels fade in/out with zoom.
      const sync = () => el.current?.setAttribute("data-zoom", String(Math.round(m.getZoom())));
      m.on("zoomend", sync);
      sync();
    });
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // --- base map (redrawn when the theme changes) ---
  useEffect(() => {
    ready.current?.then(() => {
      const Lf = L.current;
      const layer = baseLayer.current;
      if (!Lf || !layer || !el.current) return;
      const c = palette(dark);
      el.current.style.background = c.water;
      layer.clearLayers();

      if (IMAGE_URL && IMAGE_BOUNDS?.length === 4 && IMAGE_BOUNDS.every(Number.isFinite)) {
        const [x0, y0, x1, y1] = IMAGE_BOUNDS;
        Lf.imageOverlay(IMAGE_URL, Lf.latLngBounds(ll(x0, y0), ll(x1, y1))).addTo(layer);
      } else if (!HAS_TILES) {
        const pane = "base";
        Lf.polygon(poly(COAST), { pane, color: c.landLine, weight: 1.5, fillColor: c.land, fillOpacity: 1, interactive: false, smoothFactor: 2 }).addTo(layer);
        Lf.polygon(poly(CITY), { pane, stroke: false, fillColor: c.city, fillOpacity: 1, interactive: false, smoothFactor: 2 }).addTo(layer);
        for (const lake of LAKES)
          Lf.polygon(poly(lake), { pane, color: c.landLine, weight: 1, fillColor: c.lake, fillOpacity: 1, interactive: false }).addTo(layer);
      }

      for (const r of REGIONS.filter((r) => !HAS_TILES || !/ocean/i.test(r.name))) {
        Lf.marker(ll(r.x, r.y), {
          interactive: false,
          keyboard: false,
          icon: Lf.divIcon({
            className: "np-map-region",
            html: `<span style="color:${c.region}">${r.name}</span>`,
            iconSize: [0, 0],
          }),
        }).addTo(layer);
      }
    });
  }, [dark]);

  // --- landmarks and districts ---
  useEffect(() => {
    ready.current?.then(() => {
      const Lf = L.current;
      const layer = placeLayer.current;
      if (!Lf || !layer) return;
      layer.clearLayers();
      if (!showPlaces) return;
      const c = palette(dark);
      for (const p of PLACES) {
        if (p.kind === "district") {
          Lf.marker(ll(p.x, p.y), {
            interactive: false,
            keyboard: false,
            icon: Lf.divIcon({ className: "np-map-district", html: `<span style="color:${c.label}">${p.name}</span>`, iconSize: [0, 0] }),
          }).addTo(layer);
        } else {
          Lf.circleMarker(ll(p.x, p.y), { radius: 3, color: c.label, weight: 1, fillColor: c.label, fillOpacity: 0.7 })
            .bindTooltip(p.name, { direction: "top", offset: [0, -4], className: "np-map-tip" })
            .addTo(layer);
        }
      }
    });
  }, [showPlaces, dark]);

  // --- event markers ---
  useEffect(() => {
    ready.current?.then(() => {
      const Lf = L.current;
      const layer = markerLayer.current;
      if (!Lf || !layer) return;
      layer.clearLayers();
      for (const g of groups) {
        const selected = g.key === selectedKey;
        if (g.precision === "area") {
          Lf.circle(ll(g.x, g.y), {
            radius: 200,
            color: g.color,
            weight: selected ? 2 : 1,
            dashArray: "4 4",
            fillColor: g.color,
            fillOpacity: selected ? 0.22 : 0.12,
            interactive: false,
          }).addTo(layer);
        }
        const size = selected ? 34 : 26;
        const marker = Lf.marker(ll(g.x, g.y), {
          title: g.label,
          riseOnHover: true,
          zIndexOffset: selected ? 1000 : 0,
          icon: Lf.divIcon({
            className: "np-map-pin",
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            html: `<span style="--c:${g.color};width:${size}px;height:${size}px" class="${selected ? "is-selected" : ""}${
              g.precision === "area" ? " is-area" : ""
            }">${g.count > 1 ? g.count : ""}</span>`,
          }),
        });
        marker.on("click", (e) => {
          Lf.DomEvent.stopPropagation(e);
          onSelectRef.current(g.key);
        });
        marker.addTo(layer);
      }
    });
  }, [groups, selectedKey]);

  // --- camera moves ---
  useEffect(() => {
    if (!fly) return;
    ready.current?.then(() => {
      map.current?.flyTo(ll(fly.x, fly.y), fly.zoom ?? ZOOM.event, { duration: 0.8 });
    });
  }, [fly]);

  return (
    <div ref={el} className={`np-map size-full${HAS_TILES ? " has-tiles" : ""}`} role="application" aria-label="Map of the city" />
  );
}
