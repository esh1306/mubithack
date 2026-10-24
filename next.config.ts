import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads live SQLite data, so no prerendering (Cache Components off).
  async redirects() {
    return [{ source: "/", destination: "/harbourline/home", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
