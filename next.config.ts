import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.shopier.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/products',
        destination: '/collection',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
