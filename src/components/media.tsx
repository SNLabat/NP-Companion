"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Attachment } from "@/lib/types";

export function Media({ items }: { items: Attachment[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const images = items.filter((a) => a.kind === "image" && (a.thumbUrl || a.fullUrl));
  if (images.length === 0) return null;

  const single = images.length === 1;
  const ratio = single && images[0].width && images[0].height ? images[0].width / images[0].height : 16 / 9;

  return (
    <>
      <div
        className={`mt-3 grid gap-0.5 overflow-hidden rounded-2xl border border-line ${single ? "" : "grid-cols-2"}`}
        style={single ? { aspectRatio: Math.min(Math.max(ratio, 0.75), 2) } : { aspectRatio: 16 / 9 }}
      >
        {images.slice(0, 4).map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(i);
            }}
            className={`relative block size-full overflow-hidden bg-surface-2 ${images.length === 3 && i === 0 ? "row-span-2" : ""}`}
            aria-label={`Open image ${i + 1} of ${images.length}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- CDN already serves a feed-size webp */}
            <img
              src={img.thumbUrl ?? img.fullUrl!}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox images={images} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Lightbox({ images, start, onClose }: { images: Attachment[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const ref = useRef<HTMLDialogElement>(null);
  const go = useCallback((d: number) => setI((v) => (v + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const img = images[i];
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      className="m-0 h-dvh max-h-none w-dvw max-w-none bg-black/90 p-0 backdrop:bg-black/80"
    >
      <div className="flex size-full items-center justify-center p-4" onClick={() => ref.current?.close()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.fullUrl ?? img.thumbUrl!}
          alt=""
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <button
        type="button"
        onClick={() => ref.current?.close()}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X size={22} />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Previous image"
          >
            <ChevronLeft size={26} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Next image"
          >
            <ChevronRight size={26} />
          </button>
        </>
      )}
    </dialog>
  );
}
