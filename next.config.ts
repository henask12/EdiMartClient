import type { NextConfig } from "next";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.PUBLIC_API_URL ??
  "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "edimartapi-production.up.railway.app",
        pathname: "/uploads/**",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
};

export default nextConfig;
