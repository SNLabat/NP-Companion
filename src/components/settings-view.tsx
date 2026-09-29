"use client";

import { Download, LogIn, LogOut, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { useLibrary } from "@/components/library";
import { PageHeader } from "@/components/page-header";
import { type Theme, useSettings } from "@/components/providers";
import { userPath } from "@/lib/format";

export function SettingsView() {
  const lib = useLibrary();
  const { theme, setTheme, autoRefresh, setAutoRefresh } = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([lib.exportJson()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nopixel-social-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file: File) => {
    const ok = lib.importJson(await file.text());
    setMsg(ok ? "Imported." : "That file couldn't be read.");
  };

  const user = lib.session?.user;
  const name = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email) as string | undefined;

  return (
    <>
      <PageHeader title="Settings" />
      <div className="divide-y divide-line">
        <Section title="Account" hint="Sign in to keep follows and bookmarks in sync across devices.">
          {!lib.accountsEnabled ? (
            <p className="text-sm text-muted">Accounts aren&apos;t enabled on this deployment. Everything is saved in this browser.</p>
          ) : user ? (
            <div className="flex items-center justify-between gap-3">
              <p>
                Signed in as <b>{name ?? "Twitch user"}</b>. Syncing is on.
              </p>
              <button type="button" onClick={lib.signOut} className="flex items-center gap-2 rounded-full border border-line px-4 py-2 hover:bg-surface-2">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={lib.signIn}
              className="flex items-center gap-2 rounded-full bg-[#9146ff] px-5 py-2.5 font-semibold text-white hover:brightness-110"
            >
              <LogIn size={18} /> Sign in with Twitch
            </button>
          )}
        </Section>

        <Section title="Appearance">
          <div className="flex gap-2" role="radiogroup" aria-label="Theme">
            {(["system", "light", "dark"] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={theme === t}
                onClick={() => setTheme(t)}
                className={`rounded-full border px-4 py-1.5 capitalize ${theme === t ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Live updates" hint="Check for new posts every 20 seconds while this tab is open.">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="size-4 accent-[var(--brand)]" />
            Auto-refresh feeds
          </label>
        </Section>

        <Section title={`Following (${lib.follows.length})`}>
          {lib.follows.length === 0 ? (
            <p className="text-sm text-muted">No one yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {lib.follows.map((f) => (
                <li key={f.id} className="flex items-center gap-2 rounded-xl border border-line p-2">
                  <Avatar author={f} size={32} />
                  <Link href={userPath(f.username)} className="min-w-0 flex-1 truncate text-sm font-semibold hover:underline">
                    {f.displayName || f.username || f.id.slice(0, 8)}
                  </Link>
                  <button type="button" onClick={() => lib.toggleFollow(f)} className="text-xs text-muted hover:text-red-500">
                    Unfollow
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Backup" hint={`${lib.follows.length} follows · ${lib.bookmarks.length} bookmarks`}>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={download} className="flex items-center gap-2 rounded-full border border-line px-4 py-2 hover:bg-surface-2">
              <Download size={16} /> Export
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-full border border-line px-4 py-2 hover:bg-surface-2"
            >
              <Upload size={16} /> Import
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </div>
          {msg && <p role="status" className="mt-2 text-sm text-muted">{msg}</p>}
        </Section>

        <Section title="About">
          <p className="text-sm leading-relaxed text-muted">
            An unofficial, read-only mirror of the Twatter feed from the NoPixel V Companion. Not affiliated with NoPixel.
            Posts, names and images belong to their in-game authors and are served from NoPixel&apos;s CDN.
          </p>
        </Section>
      </div>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-5">
      <h2 className="font-display text-xl font-bold uppercase">{title}</h2>
      {hint && <p className="mb-3 text-sm text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}
