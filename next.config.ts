import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'a.espncdn.com' },
      { protocol: 'https', hostname: 'a1.espncdn.com' },
      { protocol: 'https', hostname: '**.espncdn.com' },
      { protocol: 'https', hostname: 'espnmedia-cdn.akamaized.net' },
      { protocol: 'https', hostname: '**.akamaized.net' },
      { protocol: 'https', hostname: 'e00-marca.uecdn.es' },
      { protocol: 'https', hostname: '**.uecdn.es' },
      { protocol: 'https', hostname: 'cdn2.mediotiempo.com' },
      { protocol: 'https', hostname: '**.mediotiempo.com' },
      { protocol: 'https', hostname: 'www.tudn.com' },
      { protocol: 'https', hostname: 'st1.uvnimg.com' },
      { protocol: 'https', hostname: '**.uvnimg.com' },
      { protocol: 'https', hostname: 'cdn.sportmonks.com' },
    ],
  },
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://accesofutbol.com https://www.accesofutbol.com https://*.godaddy.com https://*.godaddysites.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
