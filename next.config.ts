import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverActions: {
    bodySizeLimit: "10mb", // increase from default 1MB
  },
};

export default nextConfig;
