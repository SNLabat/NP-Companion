/**
 * Map data shapes. Coordinates are GTA V world coordinates (x east, y north),
 * the same space the game and the Companion use, so a real positions feed
 * can drop in without conversion.
 */

export type Precision = "exact" | "place" | "area";

export interface MapPerson {
  username?: string; // Twatter handle, if known
  name: string;
  twitch?: string;
}

export interface MapEvent {
  id: string;
  kind: string; // "crime" | "warrant" | "government" | "breaking" | "notice" | "report" | ...
  title: string;
  description: string;
  x: number;
  y: number;
  precision: Precision;
  placeName?: string;
  priority?: number;
  at: number; // epoch ms
  people?: MapPerson[];
  source: string;
}

export interface UnplacedEvent {
  id: string;
  kind: string;
  title: string;
  description: string;
  at: number;
}

export interface MapFeed {
  source: string;
  sourceLabel: string;
  events: MapEvent[];
  unplaced: UnplacedEvent[];
  updatedAt: number;
}

export interface Place {
  key: string;
  name: string;
  kind: "landmark" | "district";
  x: number;
  y: number;
  aliases?: string[];
  /** name is also a common word or surname: only match it in datelines */
  ambiguous?: boolean;
}
