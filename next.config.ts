import type { NextConfig } from "next";

// ポータル（GitHub Pages 配下）では basePath が必要、Vercel のルート配信では不要
// BASE_PATH 環境変数で切り替える
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  output: process.env.NEXT_EXPORT === "1" ? "export" : undefined,
  images: { unoptimized: true },
};

export default nextConfig;
