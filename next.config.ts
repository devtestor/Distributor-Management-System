import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const apiProxyUrl =
      process.env.NODE_ENV === "development" ? "http://127.0.0.1:4002" : process.env.API_INTERNAL_URL;

    if (!apiProxyUrl) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyUrl}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
