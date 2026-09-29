import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/post-list";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <SearchView />
    </Suspense>
  );
}
