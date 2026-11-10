import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compress all responses with gzip/brotli to minimize payload size over slow campus networks
  compress: true,

  // Remove x-powered-by header to save bytes and reduce footprint
  poweredByHeader: false,

  // Optimize external images (thumbnails and covers from Supabase storage)
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Enforce aggressive, immutable caching for static assets
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
