import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 💡 Next.js 16のTurbopack迷子警告を、正しいキーで完全に黙らせる規律
  transpilePackages: [],
};

export default nextConfig;