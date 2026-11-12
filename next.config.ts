import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Compress all responses with gzip/brotli to minimize payload size over slow campus networks
  compress: true,

  // Remove x-powered-by header to save bytes and reduce footprint
  poweredByHeader: false,

  experimental: {
    // Raise the body size limit for Server Actions and Route Handlers from the default 4.5 MB.
    // The /api/upload route receives: PDF binary (up to 30 MB after client-side compression)
    // + extracted sourceText (up to 50 KB after client truncation) + JPEG thumbnail (~50 KB).
    // Without this, Vercel returns a plain-text "413 Request Entity Too Large" that the client
    // cannot JSON.parse(), producing: "Unexpected token 'R', "Request En"... is not valid JSON"
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },

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
