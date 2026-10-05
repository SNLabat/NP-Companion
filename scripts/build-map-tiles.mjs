#!/usr/bin/env node
/**
 * Build a {z}/{x}/{y}.webp tile pyramid for the city map.
 *
 * From a folder of native-zoom tiles named "<x>_<y>.webp" (or .png/.jpg):
 *   node scripts/build-map-tiles.mjs --tiles ./tiles-z8 --zoom 8
 *
 * From one large atlas image, placed at a pixel offset in the native-zoom grid:
 *   node scripts/build-map-tiles.mjs --image atlas.png --zoom 8 --offset 24576,24576
 *
 * Options: --out public/map-tiles (default), --min-zoom 0 (default)
 * Then set NEXT_PUBLIC_MAP_TILES_URL=/map-tiles/{z}/{x}/{y}.webp and
 * NEXT_PUBLIC_MAP_TILES_ZOOM=<zoom>, and calibrate NEXT_PUBLIC_MAP_TRANSFORM.
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const N = Number(args.zoom ?? 8);
const MIN = Number(args["min-zoom"] ?? 0);
const OUT = args.out ?? "public/map-tiles";
const T = 256;
sharp.concurrency(4);

const key = (x, y) => `${x}_${y}`;
const file = (z, x, y) => path.join(OUT, String(z), String(x), `${y}.webp`);
async function save(z, x, y, img) {
  await mkdir(path.dirname(file(z, x, y)), { recursive: true });
  await img.webp({ quality: 82, effort: 4 }).toFile(file(z, x, y));
}

/** Native zoom: returns the set of tile keys written. */
async function fromTiles(dir) {
  const names = (await readdir(dir)).filter((f) => /^\d+_\d+\.(webp|png|jpe?g)$/i.test(f));
  const keys = new Set();
  for (const f of names) {
    const [x, y] = f.replace(/\.\w+$/, "").split("_").map(Number);
    await save(N, x, y, sharp(path.join(dir, f)).resize(T, T, { fit: "fill" }));
    keys.add(key(x, y));
  }
  return keys;
}

async function fromImage(src, [ox, oy]) {
  const meta = await sharp(src, { limitInputPixels: false }).metadata();
  const keys = new Set();
  const x0 = Math.floor(ox / T), y0 = Math.floor(oy / T);
  const x1 = Math.floor((ox + meta.width - 1) / T), y1 = Math.floor((oy + meta.height - 1) / T);
  for (let tx = x0; tx <= x1; tx++) {
    for (let ty = y0; ty <= y1; ty++) {
      // tile rect in image space, clipped
      const left = tx * T - ox, top = ty * T - oy;
      const l = Math.max(0, left), t = Math.max(0, top);
      const r = Math.min(meta.width, left + T), b = Math.min(meta.height, top + T);
      if (r <= l || b <= t) continue;
      const piece = await sharp(src, { limitInputPixels: false }).extract({ left: l, top: t, width: r - l, height: b - t }).png().toBuffer();
      const canvas = sharp({ create: { width: T, height: T, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: piece, left: l - left, top: t - top }]);
      await save(N, tx, ty, sharp(await canvas.png().toBuffer()));
      keys.add(key(tx, ty));
    }
  }
  return keys;
}

/** Each lower zoom merges 2x2 children and halves them. */
async function downsample(z, childKeys) {
  const parents = new Map();
  for (const k of childKeys) {
    const [x, y] = k.split("_").map(Number);
    const pk = key(x >> 1, y >> 1);
    if (!parents.has(pk)) parents.set(pk, []);
    parents.get(pk).push([x, y]);
  }
  for (const [pk, kids] of parents) {
    const [px, py] = pk.split("_").map(Number);
    const layers = kids
      .filter(([x, y]) => existsSync(file(z + 1, x, y)))
      .map(([x, y]) => ({ input: file(z + 1, x, y), left: (x - px * 2) * T, top: (y - py * 2) * T }));
    const merged = await sharp({ create: { width: T * 2, height: T * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(layers)
      .png()
      .toBuffer();
    await save(z, px, py, sharp(merged).resize(T, T));
  }
  return new Set(parents.keys());
}

let keys;
if (args.tiles) keys = await fromTiles(args.tiles);
else if (args.image) keys = await fromImage(args.image, (args.offset ?? "0,0").split(",").map(Number));
else {
  console.error("Pass --tiles <dir> or --image <file>. See the header of this script.");
  process.exit(1);
}
console.log(`z${N}: ${keys.size} tiles`);
for (let z = N - 1; z >= MIN; z--) {
  keys = await downsample(z, keys);
  console.log(`z${z}: ${keys.size} tiles`);
}
await writeFile(path.join(OUT, "tiles.json"), JSON.stringify({ nativeZoom: N, minZoom: MIN, builtAt: new Date().toISOString() }, null, 2));
console.log(`Done -> ${OUT}`);
