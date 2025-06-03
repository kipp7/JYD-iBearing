import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // 关闭严格模式，防止重复渲染问题
  transpilePackages: ["cesium"], // 让 Next.js 处理 Cesium 依赖
  webpack: (config) => {
    config.resolve.fallback = { fs: false }; // 修复 Cesium 依赖的 Node.js 模块问题
    return config;
  },
};

export default nextConfig;
