import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedView } from "@/components/feed-view";
import { Skeleton } from "@/components/post-list";

export const metadata: Metadata = {
  title: "City feed",
  alternates: { canonical: "/social" },
};

export default function SocialPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <FeedView />
    </Suspense>
  );
}
