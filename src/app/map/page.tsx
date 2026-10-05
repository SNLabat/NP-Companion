import type { Metadata } from "next";
import { Suspense } from "react";
import { MapView } from "@/components/map/map-view";

export const metadata: Metadata = {
  title: "City map",
  description: "Map of Los Santos and Blaine County with city news and events pinned where they happened.",
  alternates: { canonical: "/map" },
};

export default function MapPage() {
  return (
    <Suspense>
      <MapView />
    </Suspense>
  );
}
