import type { NextConfig } from "next";

const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.PUBLIC_API_URL ??
  "http://127.0.0.1:4000";

const apiUploadPattern = (() => {
  try {
    const u = new URL(apiUrl);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      return null;
    }
    return {
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
      ...(u.port ? { port: u.port } : {}),
      pathname: "/uploads/**",
    };
  } catch {
    return null;
  }
})();

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
      ...(apiUploadPattern ? [apiUploadPattern] : []),
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
};

export default nextConfig;
