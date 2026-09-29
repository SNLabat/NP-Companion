import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { ogCard } from "@/lib/og";

export const alt = `${SITE_NAME}: live Twatter feed from the city`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return ogCard({ author: { displayName: SITE_NAME, username: "twatter" }, text: SITE_DESCRIPTION });
}
