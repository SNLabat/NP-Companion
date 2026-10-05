import type { Metadata } from "next";
import { Suspense } from "react";
import { MultistreamView } from "@/components/multistream/multistream-view";

export const metadata: Metadata = {
  title: "Multistream",
  description: "Watch several NoPixel POVs at once from Twitch and Kick, with chat, grid and stage layouts, and shareable setups.",
  alternates: { canonical: "/watch" },
};

export default function WatchPage() {
  return (
    <Suspense>
      <MultistreamView />
    </Suspense>
  );
}
