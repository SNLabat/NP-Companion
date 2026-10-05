"use client";

import {
  Check,
  ExternalLink,
  LayoutGrid,
  Link2,
  Maximize2,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Trash2,
  Tv,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLive, useSettings } from "@/components/providers";
import { n } from "@/lib/format";
import {
  fitGrid,
  fitStage,
  type Layout,
  MAX_POVS,
  type Platform,
  type Pov,
  parsePovs,
  parsePovToken,
  povUrl,
  type Rect,
  serializePovs,
} from "@/lib/multistream";
import { chatSrc, StreamPlayer } from "./stream-player";

const GAP = 6;
const PAD = 8;

/* ---------------- URL state ---------------- */

function useWatchState() {
  const params = useSearchParams();
  const router = useRouter();
  const povs = useMemo(() => parsePovs(params.get("s")), [params]);
  const layout: Layout = params.get("layout") === "stage" ? "stage" : "grid";
  const mainId = povs.find((p) => p.id === params.get("main"))?.id ?? povs[0]?.id ?? null;
  const chatId = povs.find((p) => p.id === params.get("chat"))?.id ?? mainId;

  const update = useCallback(
    (next: { povs?: Pov[]; layout?: Layout; main?: string | null; chat?: string | null }) => {
      const sp = new URLSearchParams(params);
      const list = next.povs ?? povs;
      if (list.length) sp.set("s", serializePovs(list));
      else sp.delete("s");
      const ids = new Set(list.map((p) => p.id));
      const set = (k: string, v: string | null | undefined) => {
        if (v === undefined) return;
        if (v && ids.has(v)) sp.set(k, v);
        else sp.delete(k);
      };
      if (next.layout) {
        if (next.layout === "stage") sp.set("layout", "stage");
        else sp.delete("layout");
      }
      set("main", next.main);
      set("chat", next.chat);
      for (const k of ["main", "chat"]) if (sp.get(k) && !ids.has(sp.get(k)!)) sp.delete(k);
      const qs = sp.toString().replace(/%2C/g, ",").replace(/%3A/g, ":");
      router.replace(qs ? `/watch?${qs}` : "/watch", { scroll: false });
    },
    [params, povs, router],
  );

  return { povs, layout, mainId, chatId, update };
}

function useIsDark() {
  const { theme } = useSettings();
  const [systemDark, setSystemDark] = useState(true);
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return theme === "dark" || (theme === "system" && systemDark);
}

/* ---------------- view ---------------- */

export function MultistreamView() {
  const { povs, layout, mainId, chatId, update } = useWatchState();
  const { data: live } = useLive();
  const dark = useIsDark();
  const [audioId, setAudioId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"chat" | "add" | null>(() => (povs.length ? "chat" : "add"));
  const [copied, setCopied] = useState(false);

  const audio = povs.some((p) => p.id === audioId) ? audioId : mainId;

  // character handle for each live twitch login (from the streamer links)
  const characterOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const [handle, login] of Object.entries(live?.links ?? {})) m.set(login, handle);
    return m;
  }, [live]);

  const add = (p: Pov) => {
    if (povs.some((x) => x.id === p.id) || povs.length >= MAX_POVS) return;
    update({ povs: [...povs, p], ...(povs.length === 0 ? { main: p.id, chat: p.id } : {}) });
  };
  const remove = (id: string) => update({ povs: povs.filter((p) => p.id !== id) });
  const toStage = (id: string) => update({ layout: "stage", main: id });

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  // Default the side panel to chat once there is something to chat in.
  const hadPovs = useRef(povs.length > 0);
  useEffect(() => {
    if (!hadPovs.current && povs.length > 0) setPanel("chat");
    hadPovs.current = povs.length > 0;
  }, [povs.length]);

  const chatPov = povs.find((p) => p.id === chatId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
      <section className="flex min-w-0 shrink-0 flex-col md:min-h-0 md:flex-1 md:shrink">
        {/* toolbar */}
        <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <h1 className="mr-1 font-display text-2xl font-bold uppercase leading-none">Multistream</h1>
          <span className="text-sm text-muted">
            {povs.length}/{MAX_POVS} POVs
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <div className="flex rounded-full border border-line p-0.5" role="radiogroup" aria-label="Layout">
              {(
                [
                  ["grid", "Grid", LayoutGrid],
                  ["stage", "Stage", Tv],
                ] as const
              ).map(([v, label, Icon]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={layout === v}
                  onClick={() => update({ layout: v })}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
                    layout === v ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
            <ToolButton onClick={share} disabled={!povs.length} label={copied ? "Link copied" : "Share setup"}>
              {copied ? <Check size={16} /> : <Link2 size={16} />}
            </ToolButton>
            <ToolButton onClick={() => update({ povs: [] })} disabled={!povs.length} label="Clear all">
              <Trash2 size={16} />
            </ToolButton>
            <ToolButton onClick={() => setPanel((p) => (p ? null : "chat"))} label={panel ? "Hide side panel" : "Show side panel"}>
              {panel ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            </ToolButton>
          </div>
        </header>

        {povs.length === 0 ? (
          <EmptyState onAdd={add} onAddMany={(list) => update({ povs: list, main: list[0]?.id, chat: list[0]?.id })} />
        ) : (
          <Stage
            povs={povs}
            layout={layout}
            mainId={mainId}
            audioId={audio}
            chatId={chatId}
            characterOf={characterOf}
            onAudio={setAudioId}
            onStage={toStage}
            onChat={(id) => {
              update({ chat: id });
              setPanel("chat");
            }}
            onRemove={remove}
          />
        )}
      </section>

      {panel && (
        <aside className="flex h-[65vh] min-h-0 w-full shrink-0 flex-col border-t border-line md:h-auto md:w-[340px] md:border-l md:border-t-0">
          <div role="tablist" className="flex border-b border-line">
            {(
              [
                ["chat", "Chat", MessageSquare],
                ["add", "Add POVs", Plus],
              ] as const
            ).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={panel === v}
                onClick={() => setPanel(v)}
                className={`relative flex flex-1 items-center justify-center gap-2 py-3 text-sm ${
                  panel === v ? "font-semibold" : "text-muted hover:bg-surface-2"
                }`}
              >
                <Icon size={16} /> {label}
                {panel === v && <span className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-brand" />}
              </button>
            ))}
          </div>
          {panel === "chat" ? (
            <ChatPanel povs={povs} chatPov={chatPov} dark={dark} onPick={(id) => update({ chat: id })} />
          ) : (
            <AddPanel povs={povs} onAdd={add} />
          )}
        </aside>
      )}
    </div>
  );
}

function ToolButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="grid size-8 place-items-center rounded-full border border-line text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* ---------------- stage: absolutely positioned, never reordered ---------------- */

function Stage({
  povs,
  layout,
  mainId,
  audioId,
  chatId,
  characterOf,
  onAudio,
  onStage,
  onChat,
  onRemove,
}: {
  povs: Pov[];
  layout: Layout;
  mainId: string | null;
  audioId: string | null;
  chatId: string | null;
  characterOf: Map<string, string>;
  onAudio: (id: string) => void;
  onStage: (id: string) => void;
  onChat: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Phones: simple scrolling column. Otherwise grid or stage packing.
  const narrow = size.w > 0 && size.w < 640;
  const rects = useMemo(() => {
    const ordered = layout === "stage" && mainId ? [mainId, ...povs.filter((p) => p.id !== mainId).map((p) => p.id)] : povs.map((p) => p.id);
    const area: Rect = { x: PAD, y: PAD, w: size.w - PAD * 2, h: size.h - PAD * 2 };
    let list: Rect[];
    if (narrow) {
      const w = area.w;
      const h = (w * 9) / 16;
      list = ordered.map((_, i) => ({ x: PAD, y: PAD + i * (h + GAP), w, h }));
    } else {
      list = layout === "stage" ? fitStage(ordered.length, area, GAP) : fitGrid(ordered.length, area, GAP);
    }
    return new Map(ordered.map((id, i) => [id, list[i]]));
  }, [povs, layout, mainId, size, narrow]);

  const columnHeight = narrow ? PAD * 2 + povs.length * ((size.w - PAD * 2) * (9 / 16) + GAP) : undefined;

  return (
    <div
      ref={box}
      className="relative min-h-[40vh] flex-1 overflow-hidden bg-black/40 md:min-h-0"
      style={columnHeight ? { height: columnHeight, flex: "none" } : undefined}
    >
      <div className="relative h-full">
        {povs.map((p) => {
          const r = rects.get(p.id);
          return (
            <Tile
              key={p.id}
              pov={p}
              rect={r}
              character={p.platform === "twitch" ? characterOf.get(p.channel) : undefined}
              hasAudio={audioId === p.id}
              isChat={chatId === p.id}
              isMain={layout === "stage" && mainId === p.id}
              onAudio={() => onAudio(p.id)}
              onStage={() => onStage(p.id)}
              onChat={() => onChat(p.id)}
              onRemove={() => onRemove(p.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function Tile({
  pov,
  rect,
  character,
  hasAudio,
  isChat,
  isMain,
  onAudio,
  onStage,
  onChat,
  onRemove,
}: {
  pov: Pov;
  rect?: Rect;
  character?: string;
  hasAudio: boolean;
  isChat: boolean;
  isMain: boolean;
  onAudio: () => void;
  onStage: () => void;
  onChat: () => void;
  onRemove: () => void;
}) {
  const visible = rect && rect.w > 0;
  const small = (rect?.w ?? 0) < 300;
  return (
    <div
      className={`group absolute overflow-hidden rounded-lg bg-black transition-[left,top,width,height] duration-300 ease-out ${
        hasAudio ? "ring-2 ring-brand" : "ring-1 ring-white/10"
      }`}
      style={visible ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h } : { display: "none" }}
    >
      <StreamPlayer pov={pov} muted={!hasAudio} />

      {/* compact control pill in the corner, clear of the player's own title overlay and controls */}
      <div className="absolute right-1.5 top-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 rounded-lg bg-black/75 py-0.5 pl-2 pr-0.5 text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
        <span
          className={`size-2 shrink-0 rounded-full ${pov.platform === "kick" ? "bg-[#53fc18]" : "bg-[#9146ff]"}`}
          title={pov.platform === "kick" ? "Kick" : "Twitch"}
        />
        <span className="min-w-0 max-w-[11rem] truncate text-xs font-semibold">
          {pov.channel}
          {character && !small && <span className="font-normal text-white/70"> · {character}</span>}
        </span>
        <span className="flex shrink-0 items-center">
          <TileButton onClick={onAudio} label={hasAudio ? "Listening" : "Listen to this POV"} active={hasAudio}>
            {hasAudio ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </TileButton>
          {!isMain && (
            <TileButton onClick={onStage} label="Make main stream">
              <Maximize2 size={15} />
            </TileButton>
          )}
          {!small && (
            <TileButton onClick={onChat} label="Show chat" active={isChat}>
              <MessageSquare size={15} />
            </TileButton>
          )}
          {!small && (
            <a
              href={povUrl(pov)}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open on ${pov.platform === "kick" ? "Kick" : "Twitch"}`}
              aria-label={`Open on ${pov.platform === "kick" ? "Kick" : "Twitch"}`}
              className="grid size-7 place-items-center rounded-md hover:bg-white/20"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <TileButton onClick={onRemove} label="Remove POV">
            <X size={16} />
          </TileButton>
        </span>
      </div>
    </div>
  );
}

function TileButton({
  onClick,
  label,
  active,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid size-7 place-items-center rounded-md hover:bg-white/20 ${active ? "text-brand" : ""}`}
    >
      {children}
    </button>
  );
}

/* ---------------- side panels ---------------- */

function ChatPanel({
  povs,
  chatPov,
  dark,
  onPick,
}: {
  povs: Pov[];
  chatPov: Pov | null;
  dark: boolean;
  onPick: (id: string) => void;
}) {
  if (!chatPov) return <p className="p-6 text-center text-sm text-muted">Add a POV to see its chat.</p>;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1.5 overflow-x-auto border-b border-line px-2 py-2 no-scrollbar">
        {povs.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            aria-pressed={p.id === chatPov.id}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
              p.id === chatPov.id ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line text-muted hover:bg-surface-2"
            }`}
          >
            {p.channel}
          </button>
        ))}
      </div>
      <iframe key={`${chatPov.id}-${dark}`} title={`${chatPov.channel} chat`} src={chatSrc(chatPov, dark)} className="min-h-0 w-full flex-1 border-0" />
      {chatPov.platform === "kick" && (
        <a
          href={`https://kick.com/popout/${chatPov.channel}/chat`}
          target="_blank"
          rel="noopener noreferrer"
          className="border-t border-line px-3 py-2 text-center text-xs text-muted hover:text-brand"
        >
          Chat not loading? Open Kick chat in a new window
        </a>
      )}
    </div>
  );
}

function AddPanel({ povs, onAdd }: { povs: Pov[]; onAdd: (p: Pov) => void }) {
  const { data } = useLive();
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState<Platform>("twitch");
  const [error, setError] = useState<string | null>(null);
  const added = new Set(povs.map((p) => p.id));
  const full = povs.length >= MAX_POVS;

  const needle = q.trim().toLowerCase();
  const streams = (data?.streams ?? []).filter(
    (s) => !needle || s.login.includes(needle) || s.displayName.toLowerCase().includes(needle) || s.title.toLowerCase().includes(needle),
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parsePovToken(q, platform);
    if (!p) return setError("That doesn't look like a channel name or link.");
    if (added.has(p.id)) return setError("Already added.");
    if (full) return setError(`You can watch up to ${MAX_POVS} POVs.`);
    setError(null);
    onAdd(p);
    setQ("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={submit} className="space-y-2 border-b border-line p-3">
        <div className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-2 focus-within:border-brand">
          <Search size={16} className="text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setError(null);
            }}
            placeholder="Filter live, or type a channel / link"
            aria-label="Filter live streams or add a channel"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-line p-0.5 text-xs" role="radiogroup" aria-label="Platform">
            {(["twitch", "kick"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={platform === p}
                onClick={() => setPlatform(p)}
                className={`rounded-full px-3 py-1 capitalize ${platform === p ? "bg-brand-soft font-semibold text-brand" : "text-muted"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!q.trim() || full}
            className="ml-auto flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            <Plus size={14} /> Add channel
          </button>
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-500">
            {error}
          </p>
        )}
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Live on NoPixel {data?.enabled ? `· ${data.streams.length}` : ""}
        </p>
        {!data ? (
          <p className="px-3 py-4 text-sm text-muted">Checking Twitch…</p>
        ) : !data.enabled ? (
          <p className="px-3 py-4 text-sm text-muted">Live discovery needs Twitch keys. You can still add channels by name.</p>
        ) : streams.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted">No live NoPixel stream matches. Press Add to add it by name.</p>
        ) : (
          <ul>
            {streams.map((s) => {
              const id = `t:${s.login}`;
              const isAdded = added.has(id);
              return (
                <li key={s.login}>
                  <button
                    type="button"
                    disabled={isAdded || full}
                    onClick={() => {
                      const p = parsePovToken(s.login, "twitch");
                      if (p) onAdd(p);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-surface-2 disabled:cursor-default disabled:hover:bg-transparent"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.thumbnailUrl} alt="" loading="lazy" className="aspect-video w-24 shrink-0 rounded object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{s.displayName}</span>
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                          <span className="size-1.5 rounded-full bg-live" aria-hidden />
                          {n(s.viewers) || 0}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-xs text-muted">{s.title}</span>
                    </span>
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full ${
                        isAdded ? "bg-brand-soft text-brand" : "border border-line text-muted"
                      }`}
                      aria-label={isAdded ? "Added" : "Add"}
                    >
                      {isAdded ? <Check size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onAdd, onAddMany }: { onAdd: (p: Pov) => void; onAddMany: (list: Pov[]) => void }) {
  const { data } = useLive();
  const top = (data?.streams ?? []).slice(0, 8);
  const quick = (k: number) =>
    onAddMany(top.slice(0, k).map((s) => parsePovToken(s.login, "twitch")).filter((p): p is Pov => !!p));

  return (
    <div className="min-h-0 flex-1 p-6 md:overflow-y-auto">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-display text-4xl font-bold uppercase">Watch the city from every angle</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          Pick up to {MAX_POVS} Twitch or Kick POVs. Switch between grid and stage, choose whose audio you hear, follow any
          streamer&apos;s chat, and share the exact setup with a link.
        </p>
        {top.length >= 2 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => quick(4)} className="rounded-full bg-brand px-5 py-2 font-semibold text-white">
              Watch the top 4 live
            </button>
            <button type="button" onClick={() => quick(2)} className="rounded-full border border-line px-5 py-2 font-semibold">
              Top 2 side by side
            </button>
          </div>
        )}
      </div>
      {top.length > 0 && (
        <ul className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {top.map((s) => (
            <li key={s.login}>
              <button
                type="button"
                onClick={() => {
                  const p = parsePovToken(s.login, "twitch");
                  if (p) onAdd(p);
                }}
                className="group block w-full overflow-hidden rounded-xl border border-line bg-surface text-left transition hover:border-brand"
              >
                <span className="relative block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.thumbnailUrl} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white">
                      <Plus size={14} /> Add
                    </span>
                  </span>
                </span>
                <span className="block p-2.5">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{s.displayName}</span>
                    <span className="text-xs text-muted">{n(s.viewers)}</span>
                  </span>
                  <span className="block truncate text-xs text-muted">{s.title}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
