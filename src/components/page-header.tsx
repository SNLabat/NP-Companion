"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function PageHeader({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="flex items-center gap-4 px-4 py-2.5">
        {back && (
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/social"))}
            className="-ml-2 rounded-full p-2 hover:bg-surface-2"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold uppercase leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </header>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="flex">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`relative flex-1 py-3 text-[15px] transition-colors hover:bg-surface-2 ${active ? "font-semibold" : "text-muted"}`}
          >
            {t.label}
            {active && <span className="absolute inset-x-1/2 bottom-0 h-1 w-14 -translate-x-1/2 rounded-full bg-brand" />}
          </button>
        );
      })}
    </div>
  );
}
