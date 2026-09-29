import type { Metadata } from "next";
import { NewsView } from "@/components/news-view";

export const metadata: Metadata = {
  title: "City news",
  description: "In-city news, public notices and breaking bulletins from NoPixel V.",
  alternates: { canonical: "/news" },
};

export default function NewsPage() {
  return <NewsView />;
}
