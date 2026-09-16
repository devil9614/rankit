import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  async headers() {
    return [{
      source: "/embed/:path*",
      headers: [
        { key: "Content-Security-Policy", value: "frame-ancestors *" },
        { key: "Cross-Origin-Resource-Policy", value: "cross-origin" }
      ]
    }];
  }
};

export default nextConfig;
