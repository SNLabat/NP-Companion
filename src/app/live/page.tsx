import type { Metadata } from "next";
import { LiveNow } from "@/components/live-now";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Live on NoPixel",
  description: "Every NoPixel stream live on Twitch right now, sorted by viewers.",
  alternates: { canonical: "/live" },
};

export default function LivePage() {
  return (
    <>
      <PageHeader title="Live in the city" subtitle="NoPixel streams on Twitch, refreshed every minute" />
      <LiveNow full />
    </>
  );
}
