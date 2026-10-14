import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Pin the project root. Without this, Turbopack picks the folder of any
  // lockfile found in a parent directory (e.g. ~/projects/package-lock.json)
  // and then can't resolve packages such as tailwindcss from there.
  turbopack: {
    root: path.join(__dirname),
  },
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
