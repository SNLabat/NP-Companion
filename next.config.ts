import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Map tiles rarely change: cache for a week in browsers, a month at the edge.
        source: "/map-tiles/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
