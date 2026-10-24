import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App pages under /[broker] read live SQLite. The landing page at / is static.
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
