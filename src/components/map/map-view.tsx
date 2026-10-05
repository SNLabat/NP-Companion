"use client";

import { useQuery } from "@tanstack/react-query";
import { Crosshair, Info, Layers, MapPin, Newspaper, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PLACE_BY_KEY, PLACES } from "@/data/places";
import { type FlyTarget, GameMap, kindColor, type MarkerGroup, ZOOM } from "@/components/map/game-map";
import { useIsDark } from "@/components/use-is-dark";
import { useNow } from "@/components/use-now";
import { fetchJson, fullDate, shortAgo } from "@/lib/format";
import type { MapEvent, MapFeed, Place } from "@/lib/map/types";

const KIND_LABEL: Record<string, string> = {
  breaking: "Breaking",
  crime: "Crime",
  warrant: "Warrant",
  notice: "Notice",
  government: "Government",
  report: "Report",
};
const kindLabel = (k: string) => KIND_LABEL[k] ?? k.replace(/_/g, " ");
// Most urgent kind decides a group's pin color.
const SEVERITY = ["breaking", "crime", "warrant", "notice", "government", "report"];
const severity = (k: string) => {
  const i = SEVERITY.indexOf(k);
  return i === -1 ? SEVERITY.length : i;
};

const groupKey = (e: Pick<MapEvent, "x" | "y">) => `${Math.round(e.x)},${Math.round(e.y)}`;

export function MapView() {
  const router = useRouter();
  const params = useSearchParams();
  const dark = useIsDark();
  const now = useNow();

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["map"],
    queryFn: () => fetchJson<MapFeed>("/api/map"),
    refetchInterval: 60_000,
  });

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"events" | "places">("events");
  const [showPlaces, setShowPlaces] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [fly, setFly] = useState<FlyTarget | null>(null);
  const [placeQ, setPlaceQ] = useState("");
  const [highlight, setHighlight] = useState<Place | null>(null);

  const events = useMemo(() => [...(data?.events ?? [])].sort((a, b) => b.at - a.at), [data]);
  const kinds = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) m.set(e.kind, (m.get(e.kind) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => severity(a[0]) - severity(b[0]));
  }, [events]);
  const visible = useMemo(() => events.filter((e) => !hidden.has(e.kind)), [events, hidden]);

  const groups = useMemo(() => {
    const by = new Map<string, MapEvent[]>();
    for (const e of visible) by.set(groupKey(e), [...(by.get(groupKey(e)) ?? []), e]);
    const out: MarkerGroup[] = [];
    for (const [key, list] of by) {
      const top = [...list].sort((a, b) => severity(a.kind) - severity(b.kind))[0];
      out.push({
        key,
        x: top.x,
        y: top.y,
        precision: list.some((e) => e.precision !== "area") ? "place" : "area",
        color: kindColor(top.kind),
        count: list.length,
        label: `${top.placeName ?? "Event"}: ${list.length} event${list.length === 1 ? "" : "s"}`,
      });
    }
    return out;
  }, [visible]);

  const selectedEvents = useMemo(
    () => (selected ? visible.filter((e) => groupKey(e) === selected) : []),
    [selected, visible],
  );

  const setUrl = useCallback(
    (k: "focus" | "place", v: string | null) => {
      const sp = new URLSearchParams();
      if (v) sp.set(k, v);
      const qs = sp.toString();
      router.replace(qs ? `/map?${qs}` : "/map", { scroll: false });
    },
    [router],
  );

  const focusEvent = useCallback(
    (e: MapEvent, push = true) => {
      setSelected(groupKey(e));
      setHighlight(null);
      setFly({ x: e.x, y: e.y, zoom: e.precision === "area" ? ZOOM.area : ZOOM.event, nonce: Date.now() });
      if (push) setUrl("focus", e.id);
    },
    [setUrl],
  );

  const focusPlace = useCallback(
    (p: Place, push = true) => {
      setSelected(null);
      setHighlight(p);
      setFly({ x: p.x, y: p.y, zoom: p.kind === "district" ? ZOOM.area : ZOOM.place, nonce: Date.now() });
      if (push) setUrl("place", p.key);
    },
    [setUrl],
  );

  // Apply a shared link once data is in.
  const appliedLink = useRef(false);
  useEffect(() => {
    if (appliedLink.current || !data) return;
    appliedLink.current = true;
    const f = params.get("focus");
    const pk = params.get("place");
    const ev = f ? data.events.find((e) => e.id === f) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from a shared URL after data loads
    if (ev) focusEvent(ev, false);
    else if (pk && PLACE_BY_KEY.get(pk)) focusPlace(PLACE_BY_KEY.get(pk)!, false);
  }, [data, params, focusEvent, focusPlace]);

  const places = useMemo(() => {
    const q = placeQ.trim().toLowerCase();
    return PLACES.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.aliases?.some((a) => a.toLowerCase().includes(q)),
    ).sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "landmark" ? -1 : 1));
  }, [placeQ]);

  const highlightGroup: MarkerGroup[] = highlight
    ? [{ key: `place:${highlight.key}`, x: highlight.x, y: highlight.y, precision: highlight.kind === "district" ? "area" : "place", color: "#8a96a3", count: 1, label: highlight.name }]
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      {/* map */}
      <section className="relative h-[58vh] shrink-0 md:h-auto md:min-h-0 md:flex-1">
        <GameMap
          groups={[...groups, ...highlightGroup]}
          selectedKey={selected ?? (highlight ? `place:${highlight.key}` : null)}
          onSelect={(k) => {
            if (k?.startsWith("place:")) return;
            setSelected(k);
            setHighlight(null);
            if (!k) setUrl("focus", null);
            else {
              const first = visible.find((e) => groupKey(e) === k);
              if (first) setUrl("focus", first.id);
            }
          }}
          fly={fly}
          showPlaces={showPlaces}
          dark={dark}
        />

        {/* title + source */}
        <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[min(420px,calc(100%-170px))] sm:max-w-[min(420px,calc(100%-24px))]">
          <div className="pointer-events-auto rounded-xl border border-line bg-surface/90 px-3 py-2 shadow-lg backdrop-blur">
            <h1 className="font-display text-2xl font-bold uppercase leading-none">City map</h1>
            <p className="mt-1 hidden items-start gap-1.5 text-xs text-muted sm:flex">
              <Info size={13} className="mt-px shrink-0" />
              <span>
                {data?.sourceLabel ?? "Loading events…"}. Schematic map; positions are approximate. Live player positions
                aren&apos;t available yet.
              </span>
            </p>
          </div>
        </div>

        {/* layer toggle */}
        <button
          type="button"
          onClick={() => setShowPlaces((v) => !v)}
          aria-pressed={showPlaces}
          className="absolute right-3 top-3 z-[500] flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-sm shadow-lg backdrop-blur hover:bg-surface"
        >
          <Layers size={15} /> {showPlaces ? "Hide places" : "Show places"}
        </button>

        {/* selected group card */}
        {selectedEvents.length > 0 && (
          <div className="absolute bottom-3 left-3 z-[500] max-h-[55%] w-[min(380px,calc(100%-24px))] overflow-y-auto rounded-xl border border-line bg-surface shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2">
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                <MapPin size={15} className="shrink-0 text-brand" />
                <span className="truncate">{selectedEvents[0].placeName ?? "Location"}</span>
                {selectedEvents[0].precision === "area" && <span className="shrink-0 text-xs font-normal text-muted">(general area)</span>}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setUrl("focus", null);
                }}
                aria-label="Close"
                className="rounded-full p-1 text-muted hover:bg-surface-2"
              >
                <X size={16} />
              </button>
            </div>
            <ul className="divide-y divide-line">
              {selectedEvents.map((e) => (
                <EventDetail key={e.id} e={e} now={now} />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* side panel */}
      <aside className="flex min-h-0 w-full flex-1 flex-col border-t border-line md:w-[360px] md:flex-none md:border-l md:border-t-0">
        <div role="tablist" className="flex border-b border-line">
          {(
            [
              ["events", `Events${events.length ? ` (${events.length})` : ""}`, Newspaper],
              ["places", "Places", Crosshair],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={tab === v}
              onClick={() => setTab(v)}
              className={`relative flex flex-1 items-center justify-center gap-2 py-3 text-sm ${tab === v ? "font-semibold" : "text-muted hover:bg-surface-2"}`}
            >
              <Icon size={16} /> {label}
              {tab === v && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-brand" />}
            </button>
          ))}
        </div>

        {tab === "events" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {kinds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-b border-line p-3">
                {kinds.map(([k, count]) => {
                  const on = !hidden.has(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setHidden((prev) => {
                          const next = new Set(prev);
                          if (next.has(k)) next.delete(k);
                          else next.add(k);
                          return next;
                        })
                      }
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                        on ? "border-line font-semibold" : "border-dashed border-line text-muted opacity-60"
                      }`}
                    >
                      <span className="size-2.5 rounded-full" style={{ background: kindColor(k) }} aria-hidden />
                      {kindLabel(k)} <span className="text-muted">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {isPending ? (
              <p className="p-4 text-sm text-muted">Loading events…</p>
            ) : isError ? (
              <p className="p-4 text-sm text-muted">
                Couldn&apos;t load map events.{" "}
                <button type="button" onClick={() => refetch()} className="text-brand underline">
                  Retry
                </button>
              </p>
            ) : (
              <>
                <ul>
                  {visible.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => focusEvent(e)}
                        className={`flex w-full gap-3 border-b border-line px-3 py-2.5 text-left transition hover:bg-surface-2 ${
                          selected === groupKey(e) ? "bg-surface-2" : ""
                        }`}
                      >
                        <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: kindColor(e.kind) }} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-semibold leading-snug">{e.title}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {e.placeName}
                            {e.precision === "area" ? " (area)" : ""} · {shortAgo(e.at, now)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {(data?.unplaced.length ?? 0) > 0 && (
                  <details className="group border-b border-line">
                    <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted hover:bg-surface-2">
                      No location found ({data!.unplaced.length})
                    </summary>
                    <ul>
                      {data!.unplaced.map((u) => (
                        <li key={u.id}>
                          <Link href={`/news#${u.id}`} className="flex gap-3 px-3 py-2 text-left opacity-75 hover:bg-surface-2 hover:opacity-100">
                            <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: kindColor(u.kind) }} aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 text-sm">{u.title}</span>
                              <span className="text-xs text-muted">{shortAgo(u.at, now)}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-line p-3">
              <label className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-2 focus-within:border-brand">
                <Search size={16} className="text-muted" aria-hidden />
                <input
                  value={placeQ}
                  onChange={(e) => setPlaceQ(e.target.value)}
                  placeholder="Find a place (MRPD, Paleto, Casino…)"
                  aria-label="Find a place"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                />
              </label>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {places.map((p) => (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => focusPlace(p)}
                    className={`flex w-full items-center gap-3 border-b border-line px-3 py-2 text-left hover:bg-surface-2 ${
                      highlight?.key === p.key ? "bg-surface-2" : ""
                    }`}
                  >
                    <MapPin size={15} className={p.kind === "landmark" ? "text-brand" : "text-muted"} />
                    <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                    <span className="text-xs text-muted">{p.kind === "landmark" ? "Landmark" : "Area"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function EventDetail({ e, now }: { e: MapEvent; now: number }) {
  return (
    <li className="px-3 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs">
        <span className="rounded-full px-2 py-0.5 font-semibold uppercase text-white" style={{ background: kindColor(e.kind) }}>
          {kindLabel(e.kind)}
        </span>
        <time className="text-muted" title={fullDate(e.at)} dateTime={new Date(e.at).toISOString()}>
          {shortAgo(e.at, now)}
        </time>
      </div>
      <h3 className="font-semibold leading-snug">{e.title}</h3>
      {e.description && <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted">{e.description}</p>}
      <div className="mt-2 flex items-center justify-between text-xs">
        {e.people?.length ? <span className="text-muted">By {e.people.map((p) => p.name).join(", ")}</span> : <span />}
        {e.source === "news" && (
          <Link href={`/news#${e.id}`} className="font-semibold text-brand hover:underline">
            Read in News
          </Link>
        )}
      </div>
    </li>
  );
}
