/**
 * Our own schematic base map of San Andreas, drawn in GTA V world
 * coordinates (x east, y north). Deliberately simplified: it shows where
 * things are, not the terrain. Swap in a detailed map image you have rights
 * to with NEXT_PUBLIC_MAP_IMAGE_URL / NEXT_PUBLIC_MAP_IMAGE_BOUNDS.
 */

export type XY = [number, number];

/** World extent used for the camera (minX, minY, maxX, maxY). */
export const WORLD = { minX: -4200, minY: -4200, maxX: 4800, maxY: 8000 };

/** Rough coastline, clockwise from the airport's southwest corner. */
export const COAST: XY[] = [
  [-2150, -3400], [-2250, -2750], [-1750, -2150], [-1450, -1780], [-1600, -1480],
  [-1950, -1250], [-2050, -850], [-2450, -450], [-2800, -50], [-3150, 550],
  [-3350, 1200], [-3250, 2000], [-2950, 2750], [-2850, 3500], [-2550, 4150],
  [-1950, 4800], [-1350, 5400], [-800, 6100], [-450, 6600], [0, 6900],
  [550, 7250], [1150, 7050], [1800, 6750], [2550, 6550], [3250, 5900],
  [3700, 5150], [3950, 4350], [3900, 3600], [3650, 2700], [3350, 1900],
  [2950, 1150], [2750, 400], [2850, -450], [2550, -1350], [2050, -2150],
  [1750, -2900], [1650, -3350], [1100, -3500], [350, -3250], [-250, -3150],
  [-1000, -3600], [-1700, -3650],
];

function ellipse(cx: number, cy: number, rx: number, ry: number, rotDeg: number, n = 40): XY[] {
  const r = (rotDeg * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const x = rx * Math.cos(t);
    const y = ry * Math.sin(t);
    return [cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)];
  });
}

export const LAKES: XY[][] = [
  ellipse(1050, 4150, 1000, 420, -8), // Alamo Sea
  ellipse(1950, 300, 180, 120, 20), // Land Act Reservoir
];

/** Shaded urban area (Los Santos proper), for orientation. */
export const CITY: XY[] = [
  [-1900, -1300], [-1700, -600], [-1300, 100], [-600, 450], [400, 600],
  [1300, 300], [1500, -900], [1400, -2300], [700, -2900], [-200, -2400],
  [-900, -1900], [-1500, -1700],
];

/** Big region labels shown at low zoom. */
export const REGIONS: { name: string; x: number; y: number }[] = [
  { name: "Los Santos", x: -100, y: -1100 },
  { name: "Blaine County", x: 1500, y: 3300 },
  { name: "Paleto Bay", x: -250, y: 6250 },
  { name: "Great Chaparral", x: -900, y: 2200 },
  { name: "Pacific Ocean", x: -3700, y: -2500 },
];
