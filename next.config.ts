import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    localPatterns: [
      {
        pathname: "/uploads/**",
      },
    ],
  },
}

export default nextConfig
