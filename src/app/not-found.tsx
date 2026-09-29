import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-sm px-6 py-24 text-center">
      <h1 className="font-display text-4xl font-bold uppercase">Not in this city</h1>
      <p className="mt-2 text-muted">That post or account doesn&apos;t exist, or it was deleted.</p>
      <Link href="/social" className="mt-6 inline-block rounded-full bg-brand px-5 py-2 font-semibold text-white">
        Back to the feed
      </Link>
    </div>
  );
}
