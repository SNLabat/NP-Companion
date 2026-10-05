import type { Place } from "@/lib/map/types";

/**
 * Hand-curated places in GTA V world coordinates (approximate, ±50 units).
 * Used to place news by the landmarks and districts it mentions, and for
 * the "Places" search. Add or correct entries freely.
 * `ambiguous` places (names that are also everyday words or surnames) only
 * match in a story's dateline, never in free text.
 */
export const PLACES: Place[] = [
  // ---- landmarks ----
  { key: "mrpd", name: "Mission Row PD", kind: "landmark", x: 441, y: -982, aliases: ["MRPD", "Mission Row Police", "Mission Row PD"] },
  { key: "pillbox", name: "Pillbox Hill Medical", kind: "landmark", x: 298, y: -584, aliases: ["Pillbox", "Pillbox Medical", "Pillbox Hospital"] },
  { key: "cityhall", name: "City Hall / Courthouse", kind: "landmark", x: -544, y: -204, aliases: ["City Hall", "Courthouse", "Court House"] },
  { key: "legion", name: "Legion Square", kind: "landmark", x: 195, y: -934, aliases: ["Legion Square"] },
  { key: "mazebank", name: "Maze Bank Tower", kind: "landmark", x: -75, y: -818, aliases: ["Maze Bank Tower"] },
  { key: "pacific", name: "Pacific Standard Bank", kind: "landmark", x: 255, y: -220, aliases: ["Pacific Standard", "Pacific Bank"] },
  { key: "paletobank", name: "Paleto Bank", kind: "landmark", x: -110, y: 6464, aliases: ["Paleto Bank", "Blaine County Savings"] },
  { key: "vinewoodbowl", name: "Vinewood Bowl", kind: "landmark", x: 686, y: 577, aliases: ["Vinewood Bowl"] },
  { key: "vinewoodsign", name: "Vinewood Sign", kind: "landmark", x: 711, y: 1198, aliases: ["Vinewood Sign"] },
  { key: "casino", name: "Diamond Casino", kind: "landmark", x: 924, y: 46, aliases: ["Casino", "Diamond Casino"] },
  { key: "burgershot", name: "Burger Shot", kind: "landmark", x: -1183, y: -884, aliases: ["Burger Shot", "Burgershot"] },
  { key: "unicorn", name: "Vanilla Unicorn", kind: "landmark", x: 127, y: -1300, aliases: ["Vanilla Unicorn", "Unicorn"] },
  { key: "tequilala", name: "Tequi-la-la", kind: "landmark", x: -560, y: 286, aliases: ["Tequi-la-la", "Tequilala"] },
  { key: "pier", name: "Del Perro Pier", kind: "landmark", x: -1850, y: -1230, aliases: ["Del Perro Pier", "the pier"] },
  { key: "lsia", name: "Los Santos International Airport", kind: "landmark", x: -1037, y: -2738, aliases: ["LSIA", "airport"] },
  { key: "port", name: "Port of Los Santos", kind: "landmark", x: 1000, y: -3000, aliases: ["Port of Los Santos", "the docks", "Elysian Island"] },
  { key: "grove", name: "Grove Street", kind: "landmark", x: 105, y: -1940, aliases: ["Grove Street", "Grove St"] },
  { key: "vespuccipd", name: "Vespucci PD", kind: "landmark", x: -1110, y: -845, aliases: ["Vespucci PD", "Vespucci Police"] },
  { key: "davissheriff", name: "Davis Sheriff", kind: "landmark", x: 360, y: -1580, aliases: ["Davis Sheriff", "Davis PD"] },
  { key: "lostmc", name: "Lost MC Clubhouse", kind: "landmark", x: 982, y: -103, aliases: ["Lost MC", "Lost MC Clubhouse"] },
  { key: "observatory", name: "Galileo Observatory", kind: "landmark", x: -414, y: 1176, aliases: ["Observatory", "Galileo"] },
  { key: "sandysheriff", name: "Sandy Shores Sheriff", kind: "landmark", x: 1853, y: 3686, aliases: ["Sandy Sheriff", "Sandy Shores Sheriff", "Sandy PD"] },
  { key: "paletosheriff", name: "Paleto Bay Sheriff", kind: "landmark", x: -448, y: 6012, aliases: ["Paleto Sheriff", "Paleto PD"] },
  { key: "prison", name: "Bolingbroke Penitentiary", kind: "landmark", x: 1850, y: 2600, aliases: ["Bolingbroke", "Penitentiary"] },
  { key: "zancudo", name: "Fort Zancudo", kind: "landmark", x: -2047, y: 3132, aliases: ["Fort Zancudo", "Zancudo"] },
  { key: "chiliad", name: "Mount Chiliad", kind: "landmark", x: 501, y: 5604, aliases: ["Mount Chiliad", "Chiliad"] },
  { key: "humane", name: "Humane Labs", kind: "landmark", x: 3600, y: 3700, aliases: ["Humane Labs"] },
  { key: "alamodock", name: "Alamo Sea Boat Dock", kind: "landmark", x: 1300, y: 4220, aliases: ["Alamo Sea Boat Dock", "Alamo Sea Dock", "Alamo Dock"] },

  // ---- districts / towns (area precision) ----
  { key: "downtown", name: "Downtown Los Santos", kind: "district", x: 150, y: -800, aliases: ["Downtown LS", "Pillbox Hill"] },
  { key: "missionrow", name: "Mission Row", kind: "district", x: 400, y: -1050, aliases: ["Mission Row"] },
  { key: "rockford", name: "Rockford Hills", kind: "district", x: -800, y: -150, aliases: ["Rockford Hills", "Rockford"] },
  { key: "vinewood", name: "Vinewood", kind: "district", x: 300, y: 200, aliases: ["Vinewood", "Downtown Vinewood"] },
  { key: "westvinewood", name: "West Vinewood", kind: "district", x: -250, y: 200, aliases: ["West Vinewood"] },
  { key: "vinewoodhills", name: "Vinewood Hills", kind: "district", x: 0, y: 900, aliases: ["Vinewood Hills"] },
  { key: "hawick", name: "Hawick", kind: "district", x: 300, y: -100, aliases: ["Hawick"] },
  { key: "mirrorpark", name: "Mirror Park", kind: "district", x: 1100, y: -650, aliases: ["Mirror Park"] },
  { key: "delperro", name: "Del Perro", kind: "district", x: -1450, y: -700, aliases: ["Del Perro"] },
  { key: "vespucci", name: "Vespucci", kind: "district", x: -1200, y: -1100, aliases: ["Vespucci", "Vespucci Beach", "Vespucci Canals"] },
  { key: "littleseoul", name: "Little Seoul", kind: "district", x: -700, y: -900, aliases: ["Little Seoul"] },
  { key: "strawberry", name: "Strawberry", kind: "district", x: 250, y: -1450, ambiguous: true },
  { key: "davis", name: "Davis", kind: "district", x: 150, y: -1700, ambiguous: true },
  { key: "lamesa", name: "La Mesa", kind: "district", x: 800, y: -1200, aliases: ["La Mesa"] },
  { key: "cypress", name: "Cypress Flats", kind: "district", x: 850, y: -2200, aliases: ["Cypress Flats"] },
  { key: "elburro", name: "El Burro Heights", kind: "district", x: 1350, y: -1800, aliases: ["El Burro Heights", "El Burro"] },
  { key: "morningwood", name: "Morningwood", kind: "district", x: -1450, y: -250, aliases: ["Morningwood"] },
  { key: "pacificbluffs", name: "Pacific Bluffs", kind: "district", x: -2100, y: -250, aliases: ["Pacific Bluffs"] },
  { key: "chumash", name: "Chumash", kind: "district", x: -3150, y: 1100, aliases: ["Chumash"] },
  { key: "tongva", name: "Tongva Hills", kind: "district", x: -1700, y: 2300, aliases: ["Tongva Hills", "Tongva"] },
  { key: "harmony", name: "Harmony", kind: "district", x: 600, y: 2700, ambiguous: true },
  { key: "sandy", name: "Sandy Shores", kind: "district", x: 1850, y: 3700, aliases: ["Sandy Shores"] },
  { key: "alamo", name: "Alamo Sea", kind: "district", x: 1050, y: 4150, aliases: ["Alamo Sea", "Alamo"] },
  { key: "grapeseed", name: "Grapeseed", kind: "district", x: 1700, y: 4800, aliases: ["Grapeseed"] },
  { key: "paleto", name: "Paleto Bay", kind: "district", x: -250, y: 6300, aliases: ["Paleto Bay", "Paleto"] },
  { key: "blaine", name: "Blaine County", kind: "district", x: 1500, y: 3500, aliases: ["Blaine County", "Blaine"] },
];

export const PLACE_BY_KEY = new Map(PLACES.map((p) => [p.key, p]));
