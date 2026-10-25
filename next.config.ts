import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App pages under /[broker] read live SQLite. The landing page at / is static.
  devIndicators: { position: "bottom-right" },
  transpilePackages: ["react-globe.gl", "globe.gl", "three-globe"],
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
